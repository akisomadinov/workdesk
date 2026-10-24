using System.Security.Cryptography;
using System.Text;
using Workdesk.Data;

namespace Workdesk.Services;

public sealed record TelegramIdentity(string ChatId, string DisplayName, string Username);
public sealed record TelegramLinkState(bool Available, bool Connected, DateTime? PendingUntil, Guid? ConfirmationId, TelegramIdentity? Candidate, TelegramIdentity? Account);
public sealed record TelegramLinkResponse(string Url, DateTime ExpiresAt);
public sealed class ConfirmTelegramRequest { public Guid ConfirmationId { get; set; } }
public interface ITelegramLinkService
{
    Task<TelegramLinkState> State(CancellationToken ct);
    Task<TelegramLinkResponse> Begin(CancellationToken ct);
    Task Disconnect(CancellationToken ct);
    Task Confirm(ConfirmTelegramRequest request, CancellationToken ct);
    Task Cancel(CancellationToken ct);
    Task Poll(CancellationToken ct);
}
public sealed class TelegramLinkService(IUnitOfWork unit, IAccessPolicy access, ISharedTelegramBot bot) : ITelegramLinkService
{
    public async Task<TelegramLinkState> State(CancellationToken ct)
    {
        var settings = await unit.Telegram.Get(access.UserId, ct);
        var link = await unit.TelegramLinks.Get(access.UserId, ct);
        var pending = link is { Used: false } && link.ExpiresAt > DateTime.UtcNow;
        var connected = settings?.UseSharedBot == true && settings.ChatId.Length > 0;
        return new(bot.Configured, connected, pending ? link!.ExpiresAt : null, pending ? link!.ConfirmationId : null,
            pending && link!.ChatId is { } chat ? new(chat.ToString(System.Globalization.CultureInfo.InvariantCulture), link.DisplayName, link.Username) : null,
            connected ? new(settings!.ChatId, settings.DisplayName, settings.Username) : null);
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
    public async Task Cancel(CancellationToken ct)
    {
        var link = await unit.TelegramLinks.Get(access.UserId, ct); link?.Consume();
        await unit.Commit(ct);
    }
    public async Task Confirm(ConfirmTelegramRequest request, CancellationToken ct)
    {
        var link = await unit.TelegramLinks.Get(access.UserId, ct);
        if (link is not { Used: false, ChatId: > 0 } || link.ExpiresAt <= DateTime.UtcNow
            || request.ConfirmationId == Guid.Empty || link.ConfirmationId != request.ConfirmationId)
            throw new AppException("Запрос на привязку истёк или отменён. Создай новую ссылку.", 409);
        var settings = await unit.Telegram.Get(access.UserId, ct);
        if (settings is null) { settings = new TelegramSettings(access.UserId); unit.Telegram.Add(settings); }
        foreach (var notification in (await unit.Notifications.GetAll(ct)).Where(x => x.OwnerId == access.UserId)) notification.StopDelivery();
        settings.Link(link.ChatId.Value.ToString(System.Globalization.CultureInfo.InvariantCulture), link.DisplayName, link.Username);
        link.Consume();
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
                        // Start only proposes an identity. The owning Workdesk session must confirm it.
                        link.Propose(update.ChatId, update.DisplayName, update.Username);
                    }
                }
            }
            inbox.Advance(update.Id + 1);
        }
        // Candidate and inbox cursor commit together; a replay cannot replace the candidate.
        await unit.Commit(ct);
    }
    private static string Hash(string token) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token)));
}
