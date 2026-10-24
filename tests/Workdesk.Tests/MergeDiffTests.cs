using System.Net;
using System.Text;
using System.Text.Json;
using Workdesk.Data;
using Workdesk.Services;
using Xunit;

namespace Workdesk.Tests;

public sealed class MergeDiffTests
{
    [Fact]
    public void ContextPreservesOldAndNewLineNumbersAndHighlightsTheSelectedSide()
    {
        const string diff = "@@ -10,3 +10,4 @@\n first\n-old();\n+new();\n+extra();\n last\n@@ -50 +51 @@\n-other\n+unrelated\n";
        var added = MergeDiffContext.Extract(diff, null, 12, null, 11);
        Assert.Equal(5, added.Count);
        Assert.Equal(new[] { "new();", "extra();" }, added.Where(x => x.Highlighted).Select(x => x.Text));
        Assert.Equal(11, added.Single(x => x.Kind == "removed").OldLine);
        Assert.Null(added.Single(x => x.Kind == "removed").NewLine);
        Assert.Equal("old();", Assert.Single(MergeDiffContext.Extract(diff, 11, null), x => x.Highlighted).Text);
        Assert.Empty(MergeDiffContext.Extract(diff, null, 999));
    }
    [Fact]
    public void SavedCodeSurvivesUnavailableHistoricalVersion()
    {
        var comment = new MergeComment(MergeRequestId.New(), "note:1", true);
        var context = new MergeCodeContext("file.cs", "file.cs", null, 10, "old", true, false, [new(null, 10, "added", "Call();", true)]);
        comment.SetCodeContext(context);
        comment.SetCodeContext(context with { Lines = [], Resolved = true });
        Assert.Equal("Call();", Assert.Single(comment.CodeContext!.Lines).Text);
        Assert.True(comment.CodeContext.Resolved);
        comment.SetCodeContext(context with { Commit = "different", Lines = [] });
        Assert.Empty(comment.CodeContext!.Lines);
    }
    [Fact]
    public async Task GitlabUsesMatchingHistoricalDiffAndSharesContextWithReplies()
    {
        var source = new Connection("Fixture", "gitlab", "https://example.test/api/v4/", false);
        source.SetScope(LocalIdentity.OwnerId, "team/repo", true);
        var requests = new List<string>();
        var client = new MergeRequestClient(new Factory(path =>
        {
            requests.Add(path);
            if (path.EndsWith("/user", StringComparison.Ordinal)) return new { id = 5 };
            if (path.Contains("/discussions?", StringComparison.Ordinal)) return new[] { new { notes = new object[] {
                new { id = 1, body = "Rename", author = new { id = 6, name = "Reviewer" }, created_at = "2026-10-24T10:00:00Z", updated_at = "2026-10-24T10:00:00Z", resolvable = true, resolved = false,
                    position = new { position_type = "text", head_sha = "old-head", base_sha = "base", start_sha = "start", new_path = "file.cs", old_path = "file.cs", new_line = 10 } },
                new { id = 2, body = "Reply", author = new { id = 5, name = "Me" }, created_at = "2026-10-24T10:01:00Z", updated_at = "2026-10-24T10:01:00Z" }
            } } };
            if (path.Contains("/versions?", StringComparison.Ordinal)) return new[] {
                new { id = 2, head_commit_sha = "current", base_commit_sha = "base", start_commit_sha = "start" },
                new { id = 1, head_commit_sha = "old-head", base_commit_sha = "base", start_commit_sha = "start" } };
            if (path.EndsWith("/versions/1", StringComparison.Ordinal)) return new { diffs = new[] { new { new_path = "file.cs", old_path = "file.cs", diff = "@@ -10 +10 @@\n-Before();\n+After();\n" } } };
            return new[] { new { id = 42, iid = 7, title = "Mine", state = "opened", sha = "current", author = new { id = 5, name = "Me" }, updated_at = "2026-10-24T10:00:00Z" } };
        }));
        var item = Assert.Single(await client.Fetch(source, "fixture", new HashSet<string>(), default));
        Assert.Equal(2, item.Comments.Count);
        foreach (var note in item.Comments)
        {
            Assert.True(note.CodeContext!.Outdated);
            Assert.False(note.CodeContext.Resolved);
            Assert.Equal("After();", Assert.Single(note.CodeContext.Lines, x => x.Highlighted).Text);
        }
        Assert.Single(requests, x => x.EndsWith("/versions/1", StringComparison.Ordinal));
        Assert.DoesNotContain(requests, x => x.EndsWith("/versions/2", StringComparison.Ordinal));
    }
    private sealed class Factory(Func<string, object> action) : IHttpClientFactory
    {
        public HttpClient CreateClient(string name) => new(new Handler(action));
    }
    private sealed class Handler(Func<string, object> action) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct) => Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
        { Content = new StringContent(JsonSerializer.Serialize(action(request.RequestUri!.PathAndQuery)), Encoding.UTF8, "application/json") });
    }
}
