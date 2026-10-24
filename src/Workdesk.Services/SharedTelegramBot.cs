using System.Net.Http.Json;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace Workdesk.Services;

public sealed class TelegramBotOptions { public string? TokenFile { get; init; } }
public sealed record TelegramBotUpdate(long Id, long ChatId, long SenderId, bool Private, string Text, string DisplayName = "", string Username = "");
public interface ISharedTelegramBot
{
    bool Configured { get; }
    string BotId { get; }
    string? Token { get; }
    Task<string> Username(CancellationToken ct);
    Task<List<TelegramBotUpdate>> Updates(long offset, CancellationToken ct);
}
public sealed class SharedTelegramBot(TelegramBotOptions options, IHttpClientFactory factory) : ISharedTelegramBot
{
    public string? Token { get; } = ReadToken(options.TokenFile);
    public bool Configured => Token is not null;
    public string BotId => Token?.Split(':')[0] ?? "";
    private string? username;
    private static string? ReadToken(string? path)
    {
        if (string.IsNullOrWhiteSpace(path) || !File.Exists(path)) return null;
        var token = File.ReadAllText(path).Trim();
        if (!Regex.IsMatch(token, @"^\d{4,16}:[A-Za-z0-9_-]{20,100}$")) throw new InvalidOperationException("Проверь серверный токен Telegram-бота.");
        return token;
    }
    public async Task<string> Username(CancellationToken ct)
    {
        if (username is not null) return username;
        using var response = await Call("getMe", new { }, ct);
        var name = response.RootElement.GetProperty("result").GetProperty("username").GetString() ?? "";
        if (!Regex.IsMatch(name, @"^[A-Za-z0-9_]{5,32}$")) throw new AppException("Telegram не вернул имя бота.");
        username = name; return name;
    }
    public async Task<List<TelegramBotUpdate>> Updates(long offset, CancellationToken ct)
    {
        using var response = await Call("getUpdates", new { offset, timeout = 20, limit = 100, allowed_updates = new[] { "message" } }, ct);
        var updates = new List<TelegramBotUpdate>();
        foreach (var update in response.RootElement.GetProperty("result").EnumerateArray())
        {
            var id = update.GetProperty("update_id").GetInt64();
            if (!update.TryGetProperty("message", out var message) || !message.TryGetProperty("chat", out var chat)
                || !message.TryGetProperty("from", out var from)) { updates.Add(new(id, 0, 0, false, "")); continue; }
            updates.Add(new(id, chat.GetProperty("id").GetInt64(), from.GetProperty("id").GetInt64(),
                chat.GetProperty("type").GetString() == "private", message.TryGetProperty("text", out var text) ? text.GetString() ?? "" : "",
                string.Join(" ", new[] { "first_name", "last_name" }.Select(key => from.TryGetProperty(key, out var value) ? value.GetString() : null).Where(value => !string.IsNullOrWhiteSpace(value))),
                from.TryGetProperty("username", out var username) ? username.GetString() ?? "" : ""));
        }
        return updates;
    }
    private async Task<JsonDocument> Call(string method, object body, CancellationToken ct)
    {
        if (!Configured) throw new AppException("Telegram-бот не подключён.");
        try
        {
            using var response = await factory.CreateClient("telegram-poll").PostAsJsonAsync($"https://api.telegram.org/bot{Token}/{method}", body, ct);
            if (!response.IsSuccessStatusCode) throw new AppException("Telegram недоступен. Проверь токен и убедись, что бот подключён только к одному серверу Workdesk.");
            var data = await response.Content.ReadAsByteArrayAsync(ct);
            if (data.Length > 4_000_000) throw new AppException("Ответ Telegram слишком большой.");
            var document = JsonDocument.Parse(data);
            if (!document.RootElement.TryGetProperty("ok", out var ok) || ok.ValueKind != JsonValueKind.True)
            { document.Dispose(); throw new AppException("Telegram не подтвердил запрос."); }
            return document;
        }
        catch (HttpRequestException) { throw new AppException("Не удалось связаться с Telegram. Повтори попытку."); }
        catch (OperationCanceledException) when (!ct.IsCancellationRequested) { throw new AppException("Telegram не отвечает. Проверь VPN или прокси и повтори попытку."); }
    }
}
