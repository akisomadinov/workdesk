using System.Net;
using System.Text;
using System.Text.Json;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Workdesk.Data;
using Workdesk.Services;
using Xunit;

namespace Workdesk.Tests;

public sealed class MergeRequestTests : IDisposable
{
    private readonly SqliteConnection connection = new("Data Source=:memory:");
    private readonly WorkdeskContext db;
    private readonly IUnitOfWork unit;
    private readonly FakeClient client = new();
    private readonly AccessPolicy rights;
    private readonly NotificationService notifications;
    private readonly MergeRequestService service;
    public MergeRequestTests()
    {
        connection.Open(); db = new(new DbContextOptionsBuilder<WorkdeskContext>().UseSqlite(connection).Options); db.Database.Migrate();
        unit = new UnitOfWork(db, new TaskRepository(db), new ConnectionRepository(db));
        rights = new AccessPolicy(unit, new LocalActor());
        notifications = new NotificationService(unit, rights, new EmptySecrets(), new Factory(_ => throw new InvalidOperationException("Network forbidden")));
        service = new MergeRequestService(unit, rights, client, notifications);
    }
    [Fact]
    public async Task BaselineIsQuietAndOnlyNewIncomingCommentsNotifyOnceWithoutBoardTasks()
    {
        var source = await Source();
        client.Items = [Remote("1", [Comment("old", false)])];
        await Sync(source);
        var mr = Assert.Single(await service.List(default));
        Assert.Equal(0, mr.UnreadComments); Assert.Empty(await notifications.List(default));
        Assert.Empty(await unit.Tasks.GetAll(default));
        var incoming = Comment("new", false);
        client.Items = [Remote("1", [Comment("old", false), incoming, incoming, Comment("mine", true)])];
        await Sync(source); await Sync(source);
        mr = Assert.Single(await service.List(default));
        Assert.Equal(3, mr.CommentCount); Assert.Equal(1, mr.UnreadComments);
        var notification = Assert.Single(await notifications.List(default));
        Assert.Equal(mr.Id, notification.MergeRequestId); Assert.Equal(incoming.Url, notification.Url);
        var comment = Assert.Single((await service.Get(mr.Id, 1, default)).Comments, x => !x.Read);
        await service.Read(mr.Id, new ReadMergeCommentsRequest { Ids = [comment.Id] }, default);
        Assert.Equal(0, Assert.Single(await service.List(default)).UnreadComments);
        Assert.True(Assert.Single(await notifications.List(default)).Read);
        await Sync(source);
        Assert.Equal(0, Assert.Single(await service.List(default)).UnreadComments);
        Assert.Single(await notifications.List(default));
    }
    [Fact]
    public async Task MutingCancelsQueuedDeliveryButKeepsCommentsAndDoesNotReplayOnEnable()
    {
        var source = await Source();
        var telegram = new TelegramSettings(LocalIdentity.OwnerId); telegram.Update("123456789", true); unit.Telegram.Add(telegram);
        client.Items = [Remote("1", [])]; await Sync(source);
        var mr = Assert.Single(await service.List(default));
        client.Items = [Remote("1", [Comment("first", false)])]; await Sync(source);
        Assert.Equal("pending", Assert.Single(await notifications.List(default)).Delivery);
        await service.SetNotifications(mr.Id, false, default);
        Assert.Equal("off", Assert.Single(await notifications.List(default)).Delivery);
        client.Items = [Remote("1", [Comment("first", false), Comment("muted", false)])]; await Sync(source);
        Assert.Equal(2, Assert.Single(await service.List(default)).UnreadComments);
        Assert.Single(await notifications.List(default));
        await service.SetNotifications(mr.Id, true, default); await Sync(source);
        Assert.Single(await notifications.List(default));
        client.Items = [Remote("1", [Comment("first", false), Comment("muted", false), Comment("enabled", false)])]; await Sync(source);
        Assert.Equal(2, (await notifications.List(default)).Count);
    }
    [Fact]
    public async Task OtherAccountCannotReadCommentsOrChangeNotificationPreferences()
    {
        var source = await Source(); client.Items = [Remote("private", [Comment("private", false)])]; await Sync(source);
        var mr = Assert.Single(await service.List(default));
        var other = new MergeRequestService(unit, new AccessPolicy(unit, new Actor(Guid.NewGuid())), client);
        Assert.Empty(await other.List(default));
        Assert.Equal(404, (await Assert.ThrowsAsync<AppException>(() => other.Get(mr.Id, 1, default))).Status);
        Assert.Equal(404, (await Assert.ThrowsAsync<AppException>(() => other.SetNotifications(mr.Id, false, default))).Status);
        Assert.Equal(404, (await Assert.ThrowsAsync<AppException>(() => other.Read(mr.Id, new ReadMergeCommentsRequest(), default))).Status);
        Assert.True(Assert.Single(await service.List(default)).NotificationsEnabled);
    }
    [Fact]
    public async Task CommentReadIsBoundedAndCannotAffectAnotherMergeRequest()
    {
        var source = await Source(); client.Items = [Remote("one", []), Remote("two", [])]; await Sync(source);
        client.Items = [Remote("one", Enumerable.Range(0, 51).Select(x => Comment(x.ToString(), false)).ToList()), Remote("two", [Comment("other", false)])]; await Sync(source);
        var items = await service.List(default); var first = items.Single(x => x.Title == "one"); var second = items.Single(x => x.Title == "two");
        var page = await service.Get(first.Id, 1, default);
        Assert.Equal(50, page.Comments.Count); Assert.Equal(2, page.TotalPages);
        Assert.Single((await service.Get(first.Id, 2, default)).Comments);
        var foreign = Assert.Single((await service.Get(second.Id, 1, default)).Comments);
        await service.Read(first.Id, new ReadMergeCommentsRequest { Ids = [foreign.Id, page.Comments[0].Id] }, default);
        Assert.False(Assert.Single((await service.Get(second.Id, 1, default)).Comments).Read);
        Assert.Equal(50, (await service.Get(first.Id, 1, default)).Item.UnreadComments);
        await Assert.ThrowsAsync<AppException>(() => service.Read(first.Id, new ReadMergeCommentsRequest { Ids = Enumerable.Repeat(Guid.NewGuid(), 51).ToArray() }, default));
    }
    [Fact]
    public async Task FailedFetchKeepsCacheAndCursorAndChangingScopeStartsQuietBaseline()
    {
        var source = await Source(); client.Items = [Remote("one", [])]; await Sync(source);
        var through = source.MergeRequestsSyncedThrough;
        client.Fail = true;
        await Assert.ThrowsAsync<HttpRequestException>(() => service.Sync(source, "fixture", default));
        Assert.Equal(through, source.MergeRequestsSyncedThrough); Assert.Single(await service.List(default));
        client.Fail = false;
        source.SetScope(source.OwnerId, source.Projects, false); Assert.Null(source.MergeRequestsSyncedThrough);
        source.SetScope(source.OwnerId, source.Projects, true);
        client.Items = [Remote("one", [Comment("during-pause", false)])]; await Sync(source);
        Assert.Empty(await notifications.List(default));
        Assert.Equal(0, Assert.Single(await service.List(default)).UnreadComments);
    }
    [Fact]
    public async Task GitlabPaginationFiltersSystemNotesAndUnrelatedRequestsWithoutFollowingForeignLinks()
    {
        var requests = new List<string>();
        var factory = new Factory(request =>
        {
            Assert.Equal("fixture", Assert.Single(request.Headers.GetValues("PRIVATE-TOKEN")));
            var path = request.RequestUri!.PathAndQuery; requests.Add(path);
            if (path == "/api/v4/user") return Json(new { id = 5 });
            if (path.Contains("/discussions?", StringComparison.Ordinal))
            {
                object[] notes = path.EndsWith("page=1", StringComparison.Ordinal)
                    ? Enumerable.Range(1, 100).Select(x => (object)new { id = x, system = true, body = "system" }).ToArray()
                    : [new { id = 101, system = false, body = "Review feedback", author = new { id = 6, name = "Reviewer" }, created_at = "2026-10-23T10:00:00Z", updated_at = "2026-10-23T10:00:00Z" }];
                var response = Json(notes.Select(note => new { notes = new[] { note } })); response.Headers.Add("Link", "<https://foreign.invalid/steal>; rel=next"); return response;
            }
            return Json(new object[] {
                new { id = 42, iid = 7, title = "Mine", description = "", web_url = "https://example.test/team/repo/-/merge_requests/7", state = "opened", author = new { id = 5, name = "Me" }, reviewers = new[] { new { id = 6, name = "Reviewer" } }, updated_at = "2026-10-23T10:00:00Z", source_branch = "feature", target_branch = "main", references = new { full = "team/repo!7" } },
                new { id = 43, iid = 8, title = "Other", description = "", web_url = "https://example.test/team/repo/-/merge_requests/8", state = "opened", author = new { id = 8, name = "Other" }, reviewers = Array.Empty<object>(), updated_at = "2026-10-23T10:00:00Z", source_branch = "feature", target_branch = "main", references = new { full = "team/repo!8" } }
            });
        });
        var source = await Source();
        var result = await new MergeRequestClient(factory).Fetch(source, "fixture", new HashSet<string>(), default);
        var item = Assert.Single(result); Assert.True(item.IsAuthor); Assert.Equal("team/repo", item.Project);
        Assert.Equal("note:101", Assert.Single(item.Comments).Key);
        Assert.Equal(4, requests.Count); Assert.All(requests, x => Assert.DoesNotContain("foreign", x));
    }
    [Fact]
    public async Task GithubSeparatesCommentKindsAndIncludesSubmittedReviews()
    {
        var factory = new Factory(request =>
        {
            Assert.Equal("Bearer", request.Headers.Authorization?.Scheme);
            var path = request.RequestUri!.AbsolutePath;
            if (path == "/user") return Json(new { id = 5 });
            if (path.EndsWith("/pulls", StringComparison.Ordinal))
                return Json(new[] { new { id = 71, number = 3, title = "Pull request", body = "Description", html_url = "https://github.com/team/repo/pull/3",
                    state = "closed", merged_at = "2026-10-23T10:00:00Z", updated_at = "2026-10-23T10:00:00Z", user = new { id = 5, login = "me" },
                    requested_reviewers = Array.Empty<object>(), head = new { @ref = "feature" }, @base = new { @ref = "main" } } });
            if (path.EndsWith("/reviews", StringComparison.Ordinal))
                return Json(new object[] {
                    new { id = 7, body = "Please fix", state = "CHANGES_REQUESTED", user = new { id = 6, login = "reviewer" }, submitted_at = "2026-10-23T10:00:00Z", html_url = "https://github.com/team/repo/pull/3#review-7" },
                    new { id = 8, body = "Draft", state = "PENDING", user = new { id = 5, login = "me" } }
                });
            if (path == "/repos/team/repo/pulls/3/comments")
                return Json(new[] { new { id = 7, body = "Inline", user = new { id = 6, login = "reviewer" }, created_at = "2026-10-23T10:00:00Z",
                    updated_at = "2026-10-23T10:00:00Z", html_url = "https://github.com/team/repo/pull/3#inline-7", path = "file.cs", side = "LEFT",
                    original_line = 10, original_commit_id = "historical", diff_hunk = "@@ -10 +10 @@\n-Removed();\n+Added();\n" } });
            return Json(new[] { new { id = 7, body = "Comment", user = new { id = 6, login = "reviewer" }, created_at = "2026-10-23T10:00:00Z",
                updated_at = "2026-10-23T10:00:00Z", html_url = "https://github.com/team/repo/pull/3#comment-7" } });
        });
        var source = new Connection("GitHub", "github", "https://api.github.com/", false);
        source.SetScope(LocalIdentity.OwnerId, "team/repo", true);
        source.RecordMergeRequestSync(new DateTime(2026, 10, 23, 9, 0, 0, DateTimeKind.Utc));
        var result = await new MergeRequestClient(factory).Fetch(source, "fixture", new HashSet<string>(), default);
        var item = Assert.Single(result);
        Assert.Equal("merged", item.State); Assert.Equal("feature", item.SourceBranch);
        Assert.Equal(3, item.Comments.Count); Assert.Equal(3, item.Comments.Select(x => x.Key).Distinct().Count());
        Assert.Contains(item.Comments, x => x.Key == "review:7" && x.Body == "Please fix");
        var inline = item.Comments.Single(x => x.Key == "review_comment:7").CodeContext!;
        Assert.True(inline.Outdated); Assert.Equal("historical", inline.Commit);
        Assert.Equal("Removed();", Assert.Single(inline.Lines, x => x.Highlighted).Text);
    }
    private async Task<Connection> Source()
    {
        var source = new Connection("Example", "gitlab", "https://example.test/api/v4/", true);
        source.SetScope(LocalIdentity.OwnerId, "team/repo", true); unit.Connections.Add(source); await unit.Commit(default); return source;
    }
    private async Task Sync(Connection source) { await service.Sync(source, "fixture", default); await unit.Commit(default); }
    private static RemoteMergeComment Comment(string key, bool own) => new("note:" + key, own ? "Me" : "Reviewer", "Comment " + key, "https://example.test/mr#" + key, own, DateTime.UtcNow, DateTime.UtcNow);
    private static RemoteMergeRequest Remote(string key, List<RemoteMergeComment> comments) => new(key, "team/repo", 1, key, "Description", "https://example.test/mr/" + key,
        "opened", "Me", "Reviewer", "feature", "main", true, false, false, DateTime.UtcNow, comments);
    private static HttpResponseMessage Json(object value) => new(HttpStatusCode.OK) { Content = new StringContent(JsonSerializer.Serialize(value), Encoding.UTF8, "application/json") };
    public void Dispose() { db.Dispose(); connection.Dispose(); }
    private sealed class Actor(Guid id) : ICurrentActor { public Guid Id => id; public bool IsSystem => false; }
    private sealed class EmptySecrets : ISecretStore { public bool Has(Guid id) => false; public string? Get(Guid id) => null; public void Set(Guid id, string token) { } }
    private sealed class FakeClient : IMergeRequestClient
    {
        public List<RemoteMergeRequest> Items { get; set; } = [];
        public bool Fail { get; set; }
        public Task<List<RemoteMergeRequest>> Fetch(Connection source, string token, IReadOnlySet<string> tracked, CancellationToken ct) =>
            Fail ? throw new HttpRequestException("Fixture failure") : Task.FromResult(Items);
    }
    private sealed class Factory(Func<HttpRequestMessage, HttpResponseMessage> action) : IHttpClientFactory
    {
        public HttpClient CreateClient(string name) => new(new Handler(action));
    }
    private sealed class Handler(Func<HttpRequestMessage, HttpResponseMessage> action) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken) => Task.FromResult(action(request));
    }
}
