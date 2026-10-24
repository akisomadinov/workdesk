using System.Net.Http.Headers;
using System.Text.Json;
using Workdesk.Data;

namespace Workdesk.Services;

public sealed record RemoteMergeComment(string Key, string Author, string Body, string Url, bool IsOwn, DateTime Created, DateTime Updated)
{
    public MergeCodeContext? CodeContext { get; init; }
}
public sealed record RemoteMergeRequest(string Key, string Project, int Number, string Title, string Description, string Url,
    string State, string Author, string Reviewers, string SourceBranch, string TargetBranch, bool IsAuthor, bool NeedsMyReview,
    bool Draft, DateTime Updated, List<RemoteMergeComment> Comments);
public interface IMergeRequestClient
{
    Task<List<RemoteMergeRequest>> Fetch(Connection source, string token, IReadOnlySet<string> tracked, CancellationToken ct);
}
public sealed partial class MergeRequestClient(IHttpClientFactory factory) : IMergeRequestClient
{
    public async Task<List<RemoteMergeRequest>> Fetch(Connection source, string token, IReadOnlySet<string> tracked, CancellationToken ct)
    {
        var gitlab = source.Provider == "gitlab";
        using var userDoc = await Get(source, "user", token, ct);
        var user = userDoc.RootElement.GetProperty("id").ToString();
        var since = source.MergeRequestsSyncedThrough?.AddMinutes(-2);
        var result = new Dictionary<string, RemoteMergeRequest>();
        foreach (var project in source.Projects.Split(['\n', ','], StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
        {
            var prefix = gitlab ? "projects/" + Uri.EscapeDataString(project) : "repos/" + string.Join('/', project.Split('/').Select(Uri.EscapeDataString));
            var listPath = prefix + (gitlab ? "/merge_requests?scope=all&state=" + (since is null ? "opened" : "all") + "&order_by=updated_at&sort=desc"
                : "/pulls?state=" + (since is null ? "open" : "all") + "&sort=updated&direction=desc");
            if (gitlab && since is not null) listPath += "&updated_after=" + Uri.EscapeDataString(since.Value.ToString("O"));
            for (var page = 1; page <= 100; page++)
            {
                using var list = await Get(source, listPath + $"&per_page=100&page={page}", token, ct);
                RequireArray(list);
                var stop = false;
                foreach (var mr in list.RootElement.EnumerateArray())
                {
                    var updated = Date(mr, "updated_at");
                    if (since is not null && updated < since) { stop = true; continue; }
                    var key = mr.GetProperty("id").ToString();
                    var author = mr.GetProperty(gitlab ? "author" : "user");
                    var isAuthor = author.GetProperty("id").ToString() == user;
                    var needsReview = Includes(mr, gitlab ? "reviewers" : "requested_reviewers", user);
                    if (!isAuthor && !needsReview && !Includes(mr, "assignees", user) && !tracked.Contains(key)) continue;
                    var number = mr.GetProperty(gitlab ? "iid" : "number").GetInt32();
                    var url = String(mr, gitlab ? "web_url" : "html_url");
                    var paths = gitlab ? new[] { prefix + $"/merge_requests/{number}/notes?sort=desc&order_by=created_at" }
                        : new[] { prefix + $"/issues/{number}/comments?sort=created", prefix + $"/pulls/{number}/comments?sort=created", prefix + $"/pulls/{number}/reviews?" };
                    var comments = gitlab ? await GitLabComments(source, prefix, number, url, user, String(mr, "sha"), token, ct) : [];
                    foreach (var path in gitlab ? Array.Empty<string>() : paths)
                    {
                        for (var notePage = 1; notePage <= 100; notePage++)
                        {
                            using var notes = await Get(source, path + $"&per_page=100&page={notePage}", token, ct);
                            RequireArray(notes);
                            foreach (var note in notes.RootElement.EnumerateArray())
                            {
                                if (Bool(note, "system") || string.IsNullOrWhiteSpace(String(note, "body"))) continue;
                                // Pending GitHub reviews are visible only to their author and have no submitted date.
                                if (!gitlab && String(note, "state") == "PENDING") continue;
                                var writer = note.GetProperty(gitlab ? "author" : "user");
                                if (writer.ValueKind != JsonValueKind.Object) continue;
                                var commentUrl = String(note, gitlab ? "web_url" : "html_url");
                                if (string.IsNullOrEmpty(commentUrl)) commentUrl = url + "#note_" + note.GetProperty("id");
                                var created = note.TryGetProperty("created_at", out _) ? Date(note, "created_at") : Date(note, "submitted_at");
                                var modified = note.TryGetProperty("updated_at", out _) ? Date(note, "updated_at") : created;
                                var kind = gitlab ? "note" : path.Contains("/issues/", StringComparison.Ordinal) ? "issue" : path.Contains("/reviews?", StringComparison.Ordinal) ? "review" : "review_comment";
                                comments.Add(new RemoteMergeComment(kind + ":" + note.GetProperty("id"),
                                    Name(writer, gitlab), String(note, "body"), commentUrl, writer.GetProperty("id").ToString() == user, created, modified)
                                { CodeContext = GitHubContext(note) });
                            }
                            if (notes.RootElement.GetArrayLength() < 100) break;
                            if (notePage == 100) throw new SourceException("error", "Слишком много комментариев. Сузь список проектов.");
                        }
                    }
                    var reviewers = mr.TryGetProperty(gitlab ? "reviewers" : "requested_reviewers", out var users) && users.ValueKind == JsonValueKind.Array
                        ? string.Join(", ", users.EnumerateArray().Select(x => Name(x, gitlab))) : "";
                    var state = String(mr, "state");
                    if (state == "open") state = "opened";
                    if (!gitlab && mr.TryGetProperty("merged_at", out var merged) && merged.ValueKind == JsonValueKind.String) state = "merged";
                    var projectName = gitlab && mr.TryGetProperty("references", out var references) ? String(references, "full").Split('!')[0] : project;
                    if (string.IsNullOrWhiteSpace(projectName)) projectName = project;
                    result[key] = new RemoteMergeRequest(key, projectName, number, String(mr, "title"), String(mr, gitlab ? "description" : "body"), url,
                        state, Name(author, gitlab), reviewers, gitlab ? String(mr, "source_branch") : String(mr.GetProperty("head"), "ref"),
                        gitlab ? String(mr, "target_branch") : String(mr.GetProperty("base"), "ref"), isAuthor, needsReview, Bool(mr, "draft"), updated, comments);
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
        if (!response.IsSuccessStatusCode)
        {
            var health = (int)response.StatusCode switch { 401 => "auth", 403 => "forbidden", 429 => "limited", _ => "error" };
            throw new SourceException(health, $"Не удалось загрузить MR/PR (HTTP {(int)response.StatusCode}). Проверь доступ к проектам.");
        }
        await using var stream = await response.Content.ReadAsStreamAsync(ct);
        using var data = new MemoryStream(); var chunk = new byte[81920]; int count;
        while ((count = await stream.ReadAsync(chunk, ct)) > 0)
        { if (data.Length + count > 20_000_000) throw new SourceException("error", "Ответ MR/PR слишком большой."); await data.WriteAsync(chunk.AsMemory(0, count), ct); }
        return JsonDocument.Parse(data.ToArray());
    }
    private static void RequireArray(JsonDocument document)
    { if (document.RootElement.ValueKind != JsonValueKind.Array) throw new SourceException("error", "Сервер не вернул список MR/PR или комментариев."); }
    private static bool Includes(JsonElement element, string property, string id) => element.TryGetProperty(property, out var list) && list.ValueKind == JsonValueKind.Array && list.EnumerateArray().Any(x => x.GetProperty("id").ToString() == id);
    private static bool Bool(JsonElement element, string property) => element.TryGetProperty(property, out var value) && value.ValueKind == JsonValueKind.True;
    private static DateTime Date(JsonElement element, string property) => element.GetProperty(property).GetDateTime().ToUniversalTime();
    private static string Name(JsonElement user, bool gitlab) => String(user, gitlab ? "name" : "login");
    private static string String(JsonElement element, string property) => element.TryGetProperty(property, out var value) && value.ValueKind == JsonValueKind.String ? value.GetString() ?? "" : "";
}
