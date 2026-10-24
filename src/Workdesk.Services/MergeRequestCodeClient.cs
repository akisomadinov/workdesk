using System.Text.Json;
using Workdesk.Data;

namespace Workdesk.Services;

public sealed partial class MergeRequestClient
{
    private async Task<List<RemoteMergeComment>> GitLabComments(Connection source, string prefix, int number, string url,
        string user, string currentCommit, string token, CancellationToken ct)
    {
        var root = prefix + $"/merge_requests/{number}";
        var discussions = new List<JsonElement>();
        for (var page = 1; page <= 100; page++)
        {
            using var response = await Get(source, root + $"/discussions?per_page=100&page={page}", token, ct);
            RequireArray(response);
            discussions.AddRange(response.RootElement.EnumerateArray().Select(x => x.Clone()));
            if (response.RootElement.GetArrayLength() < 100) break;
            if (page == 100) throw new SourceException("error", "Слишком много обсуждений. Сузь список проектов.");
        }
        List<JsonElement>? versions = null;
        var diffs = new Dictionary<string, JsonElement>();
        var result = new List<RemoteMergeComment>();
        foreach (var discussion in discussions)
        {
            if (!discussion.TryGetProperty("notes", out var notes) || notes.ValueKind != JsonValueKind.Array) continue;
            var rootNote = notes.EnumerateArray().FirstOrDefault(x => x.TryGetProperty("position", out var p) && p.ValueKind == JsonValueKind.Object);
            MergeCodeContext? context = null;
            if (rootNote.ValueKind == JsonValueKind.Object)
            {
                var position = rootNote.GetProperty("position");
                var commit = String(position, "head_sha");
                var oldLine = Number(position, "old_line");
                var newLine = Number(position, "new_line");
                var path = String(position, "new_path");
                var oldPath = String(position, "old_path");
                context = new(path.Length > 0 ? path : oldPath, oldPath, oldLine, newLine, commit,
                    currentCommit.Length > 0 && commit != currentCommit,
                    Bool(rootNote, "resolvable") ? Bool(rootNote, "resolved") : null, []);
                if (String(position, "position_type") == "text")
                {
                    // Select the exact historical revision. Never substitute the current file at old line numbers.
                    versions ??= await GitLabVersions(source, root, token, ct);
                    var version = versions.FirstOrDefault(x => String(x, "head_commit_sha") == commit
                        && String(x, "base_commit_sha") == String(position, "base_sha")
                        && String(x, "start_commit_sha") == String(position, "start_sha"));
                    if (version.ValueKind == JsonValueKind.Object)
                    {
                        var versionId = version.GetProperty("id").ToString();
                        if (!diffs.TryGetValue(versionId, out var versionDiff))
                        {
                            try
                            {
                                using var response = await Get(source, root + "/versions/" + Uri.EscapeDataString(versionId), token, ct);
                                versionDiff = response.RootElement.Clone();
                            }
                            catch (SourceException exception) when (exception.Health == "error") { versionDiff = default; }
                            diffs[versionId] = versionDiff;
                        }
                        if (versionDiff.ValueKind == JsonValueKind.Object && versionDiff.TryGetProperty("diffs", out var files) && files.ValueKind == JsonValueKind.Array)
                        {
                            var file = files.EnumerateArray().FirstOrDefault(x => String(x, "new_path") == path && String(x, "old_path") == oldPath);
                            if (file.ValueKind == JsonValueKind.Object)
                            {
                                int? oldStart = null, newStart = null;
                                if (position.TryGetProperty("line_range", out var range) && range.ValueKind == JsonValueKind.Object
                                    && range.TryGetProperty("start", out var start) && start.ValueKind == JsonValueKind.Object)
                                { oldStart = Number(start, "old_line"); newStart = Number(start, "new_line"); }
                                context = context with { Lines = MergeDiffContext.Extract(String(file, "diff"), oldLine, newLine, oldStart, newStart) };
                            }
                        }
                    }
                }
            }
            foreach (var note in notes.EnumerateArray())
            {
                if (Bool(note, "system") || string.IsNullOrWhiteSpace(String(note, "body"))) continue;
                var writer = note.GetProperty("author");
                if (writer.ValueKind != JsonValueKind.Object) continue;
                var commentUrl = String(note, "web_url");
                if (commentUrl.Length == 0) commentUrl = url + "#note_" + note.GetProperty("id");
                result.Add(new("note:" + note.GetProperty("id"), Name(writer, true), String(note, "body"), commentUrl,
                    writer.GetProperty("id").ToString() == user, Date(note, "created_at"), Date(note, "updated_at")) { CodeContext = context });
            }
        }
        return result;
    }
    private async Task<List<JsonElement>> GitLabVersions(Connection source, string root, string token, CancellationToken ct)
    {
        var versions = new List<JsonElement>();
        for (var page = 1; page <= 100; page++)
        {
            using var response = await Get(source, root + $"/versions?per_page=100&page={page}", token, ct);
            RequireArray(response);
            versions.AddRange(response.RootElement.EnumerateArray().Select(x => x.Clone()));
            if (response.RootElement.GetArrayLength() < 100) return versions;
            if (page == 100) throw new SourceException("error", "Слишком много версий MR.");
        }
        return versions;
    }
    private static MergeCodeContext? GitHubContext(JsonElement note)
    {
        var path = String(note, "path");
        if (path.Length == 0) return null;
        var outdated = Number(note, "line") is null && Number(note, "original_line") is not null;
        var line = Number(note, "line") ?? Number(note, "original_line");
        var start = Number(note, "start_line") ?? Number(note, "original_start_line");
        var left = String(note, "side") == "LEFT";
        var commit = String(note, outdated ? "original_commit_id" : "commit_id");
        return new(path, path, left ? line : null, left ? null : line, commit, outdated, null,
            MergeDiffContext.Extract(String(note, "diff_hunk"), left ? line : null, left ? null : line,
                left ? start : null, left ? null : start));
    }
    private static int? Number(JsonElement element, string name) => element.TryGetProperty(name, out var value)
        && value.ValueKind == JsonValueKind.Number && value.TryGetInt32(out var number) ? number : null;
}
