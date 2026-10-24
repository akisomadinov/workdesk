using System.Net;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Workdesk.Data;

namespace Workdesk.Services;

public sealed record NotificationResponse(Guid Id, string Title, string Url, string Kind, bool Read, string Delivery, DateTime Created, Guid? MergeRequestId);
public sealed record TelegramResponse(string ChatId, bool Enabled, bool HasToken, bool UseSharedBot);
public sealed class SaveTelegramRequest { public string ChatId { get; set; } = ""; public string? Token { get; set; } public bool Enabled { get; set; } }
public interface INotificationService
{
    Task Record(Guid owner, string key, string title, string url, string kind, CancellationToken ct, Guid? mergeRequestId = null);
    Task<List<NotificationResponse>> List(CancellationToken ct);
    Task Read(Guid id, CancellationToken ct);
    Task<TelegramResponse> Settings(CancellationToken ct);
    Task<TelegramResponse> Configure(SaveTelegramRequest request, CancellationToken ct);
    Task Deliver(CancellationToken ct);
}
public sealed class NotificationService(IUnitOfWork unit, IAccessPolicy access, ISecretStore secrets, IHttpClientFactory factory, IDeliveryQueue? queue = null, ISharedTelegramBot? sharedBot = null) : INotificationService
{
    private readonly HashSet<(Guid, string)> recorded = [];
    public async Task Record(Guid owner, string key, string title, string url, string kind, CancellationToken ct, Guid? mergeRequestId = null)
    {
        if (!recorded.Add((owner, key))) return;
        if ((await unit.Notifications.GetAll(ct)).Any(x => x.OwnerId == owner && x.EventKey == key)) return;
        var settings = await unit.Telegram.Get(owner, ct);
        unit.Notifications.Add(new Notification(owner, key, title[..Math.Min(500, title.Length)], url, kind, settings?.Enabled == true && kind != "invite", mergeRequestId));
    }
    public async Task<List<NotificationResponse>> List(CancellationToken ct) => (await unit.Notifications.GetAll(ct))
        .Where(x => x.OwnerId == access.UserId).OrderByDescending(x => x.Created).Take(300)
        .Select(x => new NotificationResponse(x.Id.Value, x.Title, x.Url, x.Kind, x.Read, x.Delivery, x.Created, x.MergeRequestId)).ToList();
    public async Task Read(Guid id, CancellationToken ct)
    {
        var item = await unit.Notifications.Get(new NotificationId(id), ct);
        if (item is null || item.OwnerId != access.UserId) throw new AppException("Уведомление не найдено.", 404);
        item.MarkRead(); await unit.Commit(ct);
    }
    public async Task<TelegramResponse> Settings(CancellationToken ct)
    { var value = await unit.Telegram.Get(access.UserId, ct); return new(value?.ChatId ?? "", value?.Enabled ?? false, value?.UseSharedBot == true ? sharedBot?.Configured == true : secrets.Has(TokenKey(access.UserId)), value?.UseSharedBot ?? false); }
    public async Task<TelegramResponse> Configure(SaveTelegramRequest request, CancellationToken ct)
    {
        var settings = await unit.Telegram.Get(access.UserId, ct);
        if (settings?.UseSharedBot == true)
        {
            if (request.ChatId != settings.ChatId || !string.IsNullOrWhiteSpace(request.Token)) throw new AppException("Для смены Telegram-аккаунта отключи его и создай новую ссылку.");
            settings.Update(settings.ChatId, request.Enabled);
            if (!request.Enabled) foreach (var notification in (await unit.Notifications.GetAll(ct)).Where(x => x.OwnerId == access.UserId)) notification.StopDelivery();
            await unit.Commit(ct); return await Settings(ct);
        }
        if (request.ChatId.Length > 100 || request.Enabled && !Regex.IsMatch(request.ChatId, @"^(@[A-Za-z0-9_]{5,}|-?\d+)$")) throw new AppException("Укажи числовой chat_id или @имя канала.");
        if (!string.IsNullOrWhiteSpace(request.Token))
        {
            if (!Regex.IsMatch(request.Token, @"^\d{4,16}:[A-Za-z0-9_-]{20,100}$")) throw new AppException("Проверь токен Telegram-бота.");
            secrets.Set(TokenKey(access.UserId), request.Token);
        }
        if (request.Enabled && !secrets.Has(TokenKey(access.UserId))) throw new AppException("Добавь токен бота перед включением уведомлений.");
        if (settings is null) { settings = new TelegramSettings(access.UserId); unit.Telegram.Add(settings); }
        settings.Update(request.ChatId.Trim(), request.Enabled); await unit.Commit(ct); return await Settings(ct);
    }
    public async Task Deliver(CancellationToken ct)
    {
        var all = await unit.Notifications.GetAll(ct);
        foreach (var stale in all.Where(x => x.Delivery == "sending" && x.RetryAt < DateTime.UtcNow.AddMinutes(-2))) stale.Uncertain();
        await unit.Commit(ct);
        var pending = all.Where(x => x.Delivery == "pending" && (x.RetryAt is null || x.RetryAt <= DateTime.UtcNow)).OrderBy(x => x.Created).Take(50).ToList();
        List<QueueMessage> messages;
        if (queue?.Configured == true) { foreach (var item in pending) await queue.Publish(item.Id.Value); messages = await queue.Read(); }
        else messages = pending.Take(10).Select(x => new QueueMessage("", x.Id.Value)).ToList();
        foreach (var entry in messages)
        {
            var item = all.FirstOrDefault(x => x.Id.Value == entry.NotificationId);
            if (item is null || item.Delivery != "pending") { if (queue?.Configured == true) await queue.Ack(entry); continue; }
            if (item.RetryAt > DateTime.UtcNow) continue;
            if (item.MergeRequestId is { } mergeId && (await unit.MergeRequests.Get(new MergeRequestId(mergeId), ct))?.NotificationsEnabled != true)
            {
                item.StopDelivery(); await unit.Commit(ct);
                if (queue?.Configured == true) await queue.Ack(entry);
                continue;
            }
            var settings = await unit.Telegram.Get(item.OwnerId, ct);
            if (settings?.Enabled != true) continue;
            try
            {
                var token = settings.UseSharedBot ? sharedBot?.Token : secrets.Get(TokenKey(item.OwnerId));
                if (token is null) { item.Failed(); continue; }
                item.Sending();
                // Optimistic concurrency on Delivery is the final guard even if a queue message is replayed.
                await unit.Commit(ct);
                using var response = await factory.CreateClient("telegram").PostAsJsonAsync($"https://api.telegram.org/bot{token}/sendMessage", new
                { chat_id = settings.ChatId, text = item.Title + "\n" + item.Url, link_preview_options = new { is_disabled = true } }, ct);
                if (response.IsSuccessStatusCode) item.Delivered();
                else if (response.StatusCode == HttpStatusCode.TooManyRequests)
                {
                    using var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync(ct));
                    var delay = body.RootElement.TryGetProperty("parameters", out var parameters) && parameters.TryGetProperty("retry_after", out var retry) ? retry.GetInt32() : 60;
                    item.Failed(Math.Clamp(delay, 1, 86400));
                }
                else if ((int)response.StatusCode >= 500) item.Uncertain();
                else item.Failed();
            }
            catch (OperationCanceledException) when (!ct.IsCancellationRequested) { item.Uncertain(); }
            catch (TelegramUnavailableException) { item.Failed(); }
            catch (HttpRequestException) { item.Uncertain(); }
            catch (JsonException) { item.Uncertain(); }
            catch (AppException) { item.Failed(); }
            await unit.Commit(ct);
            if (item.Delivery is not "pending" && queue?.Configured == true) await queue.Ack(entry);
        }
        await unit.Commit(ct);
    }
    private static Guid TokenKey(Guid owner) => new(SHA256.HashData(Encoding.UTF8.GetBytes("telegram:" + owner)).AsSpan(0, 16));
}
