using System.Security.Cryptography;
using System.Text;
using Workdesk.Data;

namespace Workdesk.Services;

public sealed record TelegramLinkState(bool Available, bool Connected, DateTime? PendingUntil);
public sealed record TelegramLinkResponse(string Url, DateTime ExpiresAt);
public interface ITelegramLinkService
{
    Task<TelegramLinkState> State(CancellationToken ct);
    Task<TelegramLinkResponse> Begin(CancellationToken ct);
    Task Disconnect(CancellationToken ct);
    Task Poll(CancellationToken ct);
}
public sealed class TelegramLinkService(IUnitOfWork unit, IAccessPolicy access, ISharedTelegramBot bot) : ITelegramLinkService
{
    public async Task<TelegramLinkState> State(CancellationToken ct)
    {
        var settings = await unit.Telegram.Get(access.UserId, ct);
        var link = await unit.TelegramLinks.Get(access.UserId, ct);
        return new(bot.Configured, settings?.UseSharedBot == true && settings.ChatId.Length > 0,
            link is { Used: false } && link.ExpiresAt > DateTime.UtcNow ? link.ExpiresAt : null);
    }
    public async Task<TelegramLinkResponse> Begin(CancellationToken ct)
    {
        if (!bot.Configured) throw new AppException("Администратор ещё не подключил Telegram-бота.");
        var link = await unit.TelegramLinks.Get(access.UserId, ct);
        if (link is { Used: false } && link.ExpiresAt > DateTime.UtcNow.AddMinutes(10).AddSeconds(-10))
            throw new AppException("Подожди несколько секунд перед созданием новой ссылки.", 429);
        var username = await bot.Username(ct);
        var token = "wd_" + Convert.ToHexString(RandomNumberGenerator.GetBytes(24));
        if (link is null) { link = new TelegramLink(access.UserId); unit.TelegramLinks.Add(link); }
        link.Renew(Hash(token), DateTime.UtcNow.AddMinutes(10));
        await unit.Commit(ct);
        return new("https://t.me/" + username + "?start=" + token, link.ExpiresAt);
    }
    public async Task Disconnect(CancellationToken ct)
    {
        var link = await unit.TelegramLinks.Get(access.UserId, ct); link?.Consume();
        var settings = await unit.Telegram.Get(access.UserId, ct);
        if (settings?.UseSharedBot == true) settings.Unlink();
        foreach (var notification in (await unit.Notifications.GetAll(ct)).Where(x => x.OwnerId == access.UserId)) notification.StopDelivery();
        await unit.Commit(ct);
    }
    public async Task Poll(CancellationToken ct)
    {
        if (!bot.Configured) return;
        var inbox = await unit.TelegramLinks.Inbox(bot.BotId, ct);
        var updates = await bot.Updates(inbox?.Offset ?? 0, ct);
        if (updates.Count == 0) return;
        if (inbox is null) { inbox = new TelegramInbox(bot.BotId); unit.TelegramLinks.Add(inbox); }
        foreach (var update in updates.OrderBy(x => x.Id))
        {
            if (update.Id < inbox.Offset) continue;
            if (update.Private && update.ChatId > 0 && update.ChatId == update.SenderId
                && update.Text.StartsWith("/start wd_", StringComparison.Ordinal))
            {
                var token = update.Text[7..].Trim();
                if (token.Length == 51)
                {
                    var link = await unit.TelegramLinks.Find(Hash(token), ct);
                    if (link is { Used: false } && link.ExpiresAt > DateTime.UtcNow)
                    {
                        var settings = await unit.Telegram.Get(link.OwnerId, ct);
                        if (settings is null) { settings = new TelegramSettings(link.OwnerId); unit.Telegram.Add(settings); }
                        // Never forward previously queued work to a newly linked chat.
                        foreach (var notification in (await unit.Notifications.GetAll(ct)).Where(x => x.OwnerId == link.OwnerId)) notification.StopDelivery();
                        settings.Link(update.ChatId.ToString(System.Globalization.CultureInfo.InvariantCulture));
                        link.Consume();
                    }
                }
            }
            inbox.Advance(update.Id + 1);
        }
        // Binding, one-time use, and update cursor are committed in one transaction.
        await unit.Commit(ct);
    }
    private static string Hash(string token) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token)));
}
