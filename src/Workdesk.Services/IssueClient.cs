using System.Globalization;
using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;
using Workdesk.Data;

namespace Workdesk.Services;

public sealed record ImportedIssue(string Key, string Title, string Project, string Description, string Url, string State, DateTime Updated, string Milestone = "")
{
    public string[] Labels { get; init; } = [];
}
public sealed class SourceException(string health, string message) : Exception(message) { public string Health { get; } = health; }
public interface IIssueClient { Task<List<ImportedIssue>> Fetch(Connection source, string token, CancellationToken ct); }

public sealed class IssueClient(IHttpClientFactory factory) : IIssueClient
{
    public async Task<List<ImportedIssue>> Fetch(Connection source, string token, CancellationToken ct)
    {
        var result = new List<ImportedIssue>();
        var gitlab = source.Provider == "gitlab";
        // Cursor uses the START of the previous successful sync, with an overlap.
        var since = source.SyncedThrough?.AddMinutes(-2).ToString("O", CultureInfo.InvariantCulture);
        var client = factory.CreateClient("issues");
        var projects = source.Projects.Split(['\n', ','], StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        string? login = null;
        if (!gitlab && projects.Length > 0)
        {
            using var userRequest = new HttpRequestMessage(HttpMethod.Get, new Uri(new Uri(source.ApiUrl), "user"));
            userRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
            using var userResponse = await client.SendAsync(userRequest, ct);
            if (!userResponse.IsSuccessStatusCode) throw new SourceException("auth", "Не удалось получить профиль владельца токена.");
            using var user = JsonDocument.Parse(await userResponse.Content.ReadAsStringAsync(ct)); login = Read(user.RootElement, "login");
            if (string.IsNullOrWhiteSpace(login)) throw new SourceException("error", "API не вернул имя пользователя.");
        }
        foreach (var projectFilter in projects.Length == 0 ? new string?[] { null } : projects)
        {
            for (var page = 1; page <= 500; page++)
            {
                var path = gitlab
                    ? $"issues?scope=assigned_to_me&state=all&order_by=updated_at&sort=desc&per_page=100&page={page}"
                    : $"issues?filter=assigned&state=all&sort=updated&direction=desc&per_page=100&page={page}";
                if (projectFilter is not null)
                {
                    if (gitlab) path = "projects/" + Uri.EscapeDataString(projectFilter) + "/" + path;
                    else
                    {
                        var parts = projectFilter.Split('/');
                        if (parts.Length != 2 || parts.Any(string.IsNullOrWhiteSpace)) throw new SourceException("error", "Для GitHub укажи проекты в формате owner/repository.");
                        path = "repos/" + string.Join('/', parts.Select(Uri.EscapeDataString)) + "/" + path.Replace("filter=assigned", "assignee=" + Uri.EscapeDataString(login!));
                    }
                }
                if (since is not null) path += $"&{(gitlab ? "updated_after" : "since")}={Uri.EscapeDataString(since)}";
                using var request = new HttpRequestMessage(HttpMethod.Get, new Uri(new Uri(source.ApiUrl), path));
                if (gitlab) request.Headers.Add("PRIVATE-TOKEN", token);
                else request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
                request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
                using var response = await client.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, ct);
                if (response.StatusCode == HttpStatusCode.Unauthorized)
                    throw new SourceException("auth", "Токен не принят. Обнови его в настройках подключения.");
                if (response.StatusCode == HttpStatusCode.TooManyRequests || (response.StatusCode == HttpStatusCode.Forbidden && response.Headers.TryGetValues("X-RateLimit-Remaining", out var limits) && limits.Contains("0")))
                    throw new SourceException("limited", "Сервер ограничил частоту запросов. Повторим синхронизацию позже.");
                if (response.StatusCode == HttpStatusCode.Forbidden)
                    throw new SourceException("forbidden", "Нет доступа к задачам. Проверь права токена и доступ к проектам.");
                if (!response.IsSuccessStatusCode)
                    throw new SourceException("error", $"Сервер вернул HTTP {(int)response.StatusCode}. Проверь адрес API и доступ к серверу.");
                // Bounded response prevents accidental HTML/login or huge responses consuming all memory.
                await using var stream = await response.Content.ReadAsStreamAsync(ct);
                using var buffer = new MemoryStream();
                var chunk = new byte[81920];
                int read;
                while ((read = await stream.ReadAsync(chunk, ct)) > 0)
                {
                    if (buffer.Length + read > 20 * 1024 * 1024) throw new SourceException("error", "Ответ сервера слишком большой.");
                    await buffer.WriteAsync(chunk.AsMemory(0, read), ct);
                }
                using var document = JsonDocument.Parse(buffer.ToArray());
                if (document.RootElement.ValueKind != JsonValueKind.Array) throw new SourceException("error", "По этому адресу сервер не вернул список задач. Проверь адрес API.");
                var elements = document.RootElement;
                foreach (var item in elements.EnumerateArray())
                {
                    if (!gitlab && item.TryGetProperty("pull_request", out _)) continue;
                    var key = item.GetProperty("id").ToString();
                    var url = Read(item, gitlab ? "web_url" : "html_url");
                    var project = gitlab ? GitlabProject(item) : ProjectFromRepository(Read(item, "repository_url"));
                    var updated = item.GetProperty("updated_at").GetDateTime().ToUniversalTime();
                    result.Add(new ImportedIssue(key, Read(item, "title"), project,
                        Read(item, gitlab ? "description" : "body"), url, Read(item, "state"), updated,
                        item.TryGetProperty("milestone", out var milestone) && milestone.ValueKind == JsonValueKind.Object ? Read(milestone, "title") : "")
                    {
                        Labels = gitlab && item.TryGetProperty("labels", out var labels) && labels.ValueKind == JsonValueKind.Array
                            ? labels.EnumerateArray().Where(label => label.ValueKind == JsonValueKind.String).Select(label => label.GetString()!).ToArray()
                            : []
                    });
                }
                // Page length is checked before filtering out PRs. Never follow foreign pagination URLs with a token.
                if (elements.GetArrayLength() < 100) break;
                if (page == 500) throw new SourceException("error", "Слишком много страниц задач. Сузь выбор проектов.");
            }
        }
        return result;
    }
    private static string Read(JsonElement element, string key) =>
        element.TryGetProperty(key, out var value) && value.ValueKind == JsonValueKind.String ? value.GetString() ?? "" : "";
    private static string ProjectFromRepository(string url) => url.Split("/repos/", 2).LastOrDefault() ?? "GitHub";
    private static string GitlabProject(JsonElement item)
    {
        if (item.TryGetProperty("references", out var references))
        {
            var full = Read(references, "full");
            var separator = full.LastIndexOf('#');
            if (separator > 0) return full[..separator];
        }
        return "Проект " + item.GetProperty("project_id");
    }
}
