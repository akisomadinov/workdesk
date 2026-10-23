using System.Net.Http.Headers;
using System.Text.Json;
using Workdesk.Data;

namespace Workdesk.Services;

public sealed record RemoteActivity(string Key, string Title, string Url);
public interface IActivityClient { Task<List<RemoteActivity>> Fetch(Connection source, string token, CancellationToken ct); }
public sealed class ActivityClient(IHttpClientFactory factory) : IActivityClient
{
    public async Task<List<RemoteActivity>> Fetch(Connection source, string token, CancellationToken ct)
    {
        if (!source.WatchMergeRequests || source.SyncedThrough is null || string.IsNullOrWhiteSpace(source.Projects)) return [];
        var gitlab = source.Provider == "gitlab";
        using var userDoc = await Get(source, "user", token, ct);
        var user = userDoc.RootElement.GetProperty("id").ToString();
        var since = source.SyncedThrough.Value.AddMinutes(-2);
        var result = new Dictionary<string, RemoteActivity>();
        foreach (var project in source.Projects.Split(['\n', ','], StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
        {
            var prefix = gitlab ? "projects/" + Uri.EscapeDataString(project) : "repos/" + string.Join('/', project.Split('/').Select(Uri.EscapeDataString));
            var listPath = prefix + (gitlab ? "/merge_requests?scope=all&state=all&order_by=updated_at&sort=desc&updated_after=" + Uri.EscapeDataString(since.ToString("O")) : "/pulls?state=all&sort=updated&direction=desc");
            for (var page = 1; page <= 100; page++)
            {
                using var list = await Get(source, listPath + $"&per_page=100&page={page}", token, ct);
                var stop = false;
                foreach (var mr in list.RootElement.EnumerateArray())
                {
                    if (mr.GetProperty("updated_at").GetDateTime().ToUniversalTime() < since) { stop = true; continue; }
                    var author = mr.GetProperty(gitlab ? "author" : "user");
                    if (author.GetProperty("id").ToString() != user && !Includes(mr, "assignees", user) && !Includes(mr, gitlab ? "reviewers" : "requested_reviewers", user)) continue;
                    var number = mr.GetProperty(gitlab ? "iid" : "number").ToString();
                    var title = String(mr, "title");
                    var paths = gitlab ? new[] { prefix + $"/merge_requests/{number}/notes?sort=desc&order_by=created_at" }
                        : new[] { prefix + $"/issues/{number}/comments?since={Uri.EscapeDataString(since.ToString("O"))}", prefix + $"/pulls/{number}/comments?since={Uri.EscapeDataString(since.ToString("O"))}" };
                    foreach (var path in paths)
                    {
                        for (var notePage = 1; notePage <= 100; notePage++)
                        {
                            using var notes = await Get(source, path + $"&per_page=100&page={notePage}", token, ct);
                            var old = false;
                            foreach (var note in notes.RootElement.EnumerateArray())
                            {
                                if (note.GetProperty("created_at").GetDateTime().ToUniversalTime() < since) { old = true; continue; }
                                if (note.TryGetProperty("system", out var system) && system.ValueKind == JsonValueKind.True) continue;
                                var writer = note.GetProperty(gitlab ? "author" : "user");
                                if (writer.GetProperty("id").ToString() == user) continue;
                                var key = source.Id + ":comment:" + project + ":" + path.Split('?')[0] + ":" + note.GetProperty("id");
                                var url = String(note, gitlab ? "web_url" : "html_url");
                                if (string.IsNullOrEmpty(url)) url = String(mr, "web_url") + "#note_" + note.GetProperty("id");
                                result[key] = new RemoteActivity(key, $"{(gitlab ? "MR" : "PR")} {number}: новый комментарий · {title} · {String(writer, gitlab ? "name" : "login")}", url);
                            }
                            if (notes.RootElement.GetArrayLength() < 100 || gitlab && old) break;
                            if (notePage == 100) throw new SourceException("error", "Слишком много комментариев. Сузь список проектов.");
                        }
                    }
                }
                if (list.RootElement.GetArrayLength() < 100 || stop) break;
                if (page == 100) throw new SourceException("error", "Слишком много MR/PR. Сузь список проектов.");
            }
        }
        return result.Values.ToList();
    }
    private async Task<JsonDocument> Get(Connection source, string path, string token, CancellationToken ct)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, new Uri(new Uri(source.ApiUrl), path));
        if (source.Provider == "gitlab") request.Headers.Add("PRIVATE-TOKEN", token);
        else request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        using var response = await factory.CreateClient("issues").SendAsync(request, HttpCompletionOption.ResponseHeadersRead, ct);
        if (!response.IsSuccessStatusCode) throw new SourceException((int)response.StatusCode == 429 ? "limited" : "error", $"Не удалось загрузить комментарии MR/PR (HTTP {(int)response.StatusCode}). Задачи и заметки сохранены.");
        await using var stream = await response.Content.ReadAsStreamAsync(ct);
        using var data = new MemoryStream(); var chunk = new byte[81920]; int count;
        while ((count = await stream.ReadAsync(chunk, ct)) > 0)
        { if (data.Length + count > 20_000_000) throw new SourceException("error", "Ответ MR/PR слишком большой."); await data.WriteAsync(chunk.AsMemory(0, count), ct); }
        return JsonDocument.Parse(data.ToArray());
    }
    private static bool Includes(JsonElement element, string property, string id) => element.TryGetProperty(property, out var list) && list.ValueKind == JsonValueKind.Array && list.EnumerateArray().Any(x => x.GetProperty("id").ToString() == id);
    private static string String(JsonElement element, string property) => element.TryGetProperty(property, out var value) && value.ValueKind == JsonValueKind.String ? value.GetString() ?? "" : "";
}
