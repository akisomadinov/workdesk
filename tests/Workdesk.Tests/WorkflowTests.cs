using System.Net;
using System.Text;
using System.Text.Json;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Workdesk.Data;
using Workdesk.Services;
using Xunit;

namespace Workdesk.Tests;

public sealed class WorkflowTests : IDisposable
{
    private readonly SqliteConnection connection = new("Data Source=:memory:");
    private readonly WorkdeskContext db;
    private readonly IUnitOfWork unit;
    private readonly MemorySecrets secrets = new();
    private readonly SyncLocks locks = new();
    public WorkflowTests()
    {
        connection.Open();
        db = new WorkdeskContext(new DbContextOptionsBuilder<WorkdeskContext>().UseSqlite(connection).Options);
        db.Database.Migrate();
        unit = new UnitOfWork(db, new TaskRepository(db), new ConnectionRepository(db));
    }
    [Fact]
    public async Task PersonalNotesSurviveImportsAndRepeatedSyncDoesNotDuplicate()
    {
        var source = await Source("first");
        var incoming = new FakeClient([Issue("same")]);
        var service = Service(incoming);
        await service.Sync(source.Id.Value, default);
        var tasks = new TaskService(unit);
        var task = Assert.Single(await tasks.GetAll(default));
        await tasks.Save(new SaveTaskRequest { Id = task.Id, Revision = task.Revision, Title = task.Title, Notes = "Проверил обработку отмены", NextStep = "Проверить повтор", Stage = "doing", PlannedFor = "2026-10-23" }, default);
        incoming.Issues = [Issue("same") with { Title = "Обновлённое описание", State = "closed" }];
        await service.Sync(source.Id.Value, default);
        var updated = Assert.Single(await tasks.GetAll(default));
        Assert.Equal("Проверил обработку отмены", updated.Notes);
        Assert.Equal("Проверить повтор", updated.NextStep);
        Assert.Equal("doing", updated.Stage);
        Assert.Equal("2026-10-23", updated.PlannedFor);
        Assert.Equal("closed", updated.ExternalState);
        Assert.Equal("Обновлённое описание", updated.Title);
        Assert.Equal(1, updated.Revision);
    }
    [Fact]
    public async Task SameIssueNumberOnDifferentServersCreatesSeparateTasks()
    {
        var first = await Source("first"); var second = await Source("second");
        var service = Service(new FakeClient([Issue("42")]));
        await service.Sync(first.Id.Value, default); await service.Sync(second.Id.Value, default);
        Assert.Equal(2, (await unit.Tasks.GetAll(default)).Count);
    }
    [Fact]
    public async Task UnreachableSourceKeepsCachedTasksAndDoesNotBlockAnotherSource()
    {
        var first = await Source("vpn"); var second = await Source("public");
        var client = new FakeClient([Issue("42")]);
        var service = Service(client);
        await service.Sync(first.Id.Value, default);
        client.Unavailable = first.Id;
        var offline = await service.Sync(first.Id.Value, default);
        var online = await service.Sync(second.Id.Value, default);
        Assert.Equal("offline", offline.Health); Assert.Equal("ok", online.Health);
        Assert.NotNull(offline.LastSuccess);
        Assert.Equal(2, (await unit.Tasks.GetAll(default)).Count);
    }
    [Fact]
    public async Task ConcurrentTabCannotOverwriteMoreRecentNotes()
    {
        var service = new TaskService(unit);
        var first = await service.Save(new SaveTaskRequest { Title = "Задача", Notes = "Черновик" }, default);
        await service.Save(new SaveTaskRequest { Id = first.Id, Revision = first.Revision, Title = "Задача", Notes = "Новая запись" }, default);
        var error = await Assert.ThrowsAsync<AppException>(() => service.Save(new SaveTaskRequest { Id = first.Id, Revision = first.Revision, Title = "Задача", Notes = "Устаревшая запись" }, default));
        Assert.Equal(409, error.Status);
        Assert.Equal("Новая запись", Assert.Single(await service.GetAll(default)).Notes);
    }
    [Fact]
    public async Task LocalNotesPersistAfterReopeningDatabase()
    {
        var path = Path.Combine(Path.GetTempPath(), $"workdesk-{Guid.NewGuid()}.db");
        try
        {
            var options = new DbContextOptionsBuilder<WorkdeskContext>().UseSqlite($"Data Source={path};Pooling=False").Options;
            await using (var first = new WorkdeskContext(options))
            {
                await first.Database.MigrateAsync();
                var service = new TaskService(new UnitOfWork(first, new TaskRepository(first), new ConnectionRepository(first)));
                await service.Save(new SaveTaskRequest { Title = "Продолжить завтра", Notes = "Готово сохранение", NextStep = "Проверить импорт" }, default);
            }
            await using var second = new WorkdeskContext(options);
            var item = await second.Tasks.SingleAsync();
            Assert.Equal("Готово сохранение", item.Notes); Assert.Equal("Проверить импорт", item.NextStep);
        }
        finally { File.Delete(path); }
    }
    [Fact]
    public async Task GithubPaginationContinuesWhenFirstPageContainsOnlyPullRequests()
    {
        var requests = new List<string>();
        var handler = new Handler(request =>
        {
            var uri = request.RequestUri!.ToString(); requests.Add(uri);
            var firstPage = uri.EndsWith("&page=1", StringComparison.Ordinal);
            object body = firstPage
                ? Enumerable.Range(1, 100).Select(x => new { id = x, pull_request = new { url = "https://example.test" } }).ToArray()
                : new[] { new { id = 101, title = "Issue", html_url = "https://github.com/test/repo/issues/101", repository_url = "https://api.github.com/repos/test/repo", body = "", state = "open", updated_at = "2026-10-23T10:00:00Z" } };
            return new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json") };
        });
        var client = new IssueClient(new Factory(handler));
        var source = new Connection("github", "github", "https://api.github.com/", false);
        var issues = await client.Fetch(source, "fixture-token", default);
        Assert.Single(issues); Assert.Equal(2, requests.Count); Assert.Equal("test/repo", issues[0].Project);
    }
    [Fact]
    public async Task RepeatedRecordsWithinRemoteResponseAreDeduplicated()
    {
        var source = await Source("duplicates");
        await Service(new FakeClient([Issue("42"), Issue("42")])).Sync(source.Id.Value, default);
        Assert.Single(await unit.Tasks.GetAll(default));
    }
    [Theory]
    [InlineData(HttpStatusCode.Unauthorized, "auth")]
    [InlineData(HttpStatusCode.Forbidden, "forbidden")]
    [InlineData(HttpStatusCode.TooManyRequests, "limited")]
    public async Task RemoteErrorsHaveDistinctStates(HttpStatusCode status, string health)
    {
        var client = new IssueClient(new Factory(new Handler(_ => new HttpResponseMessage(status))));
        var error = await Assert.ThrowsAsync<SourceException>(() => client.Fetch(new Connection("test", "gitlab", "https://example.test/api/v4/", true), "fixture-token", default));
        Assert.Equal(health, error.Health);
    }
    private async Task<Connection> Source(string name)
    {
        var source = new Connection(name, "gitlab", $"https://{name}.example.test/api/v4/", true);
        unit.Connections.Add(source); secrets.Set(source.Id.Value, "fixture-token"); await unit.Commit(default); return source;
    }
    private ConnectionService Service(IIssueClient client) => new(unit, secrets, client, locks);
    private static ImportedIssue Issue(string id) => new(id, "Задача", "Проект", "Описание", "https://example.test/issue/42", "opened", DateTime.UtcNow);
    public void Dispose() { db.Dispose(); connection.Dispose(); }
    private sealed class MemorySecrets : ISecretStore
    {
        private readonly Dictionary<Guid, string> values = [];
        public bool Has(Guid id) => values.ContainsKey(id);
        public string? Get(Guid id) => values.GetValueOrDefault(id);
        public void Set(Guid id, string token) => values[id] = token;
    }
    private sealed class FakeClient(List<ImportedIssue> issues) : IIssueClient
    {
        public List<ImportedIssue> Issues { get; set; } = issues;
        public ConnectionId? Unavailable { get; set; }
        public Task<List<ImportedIssue>> Fetch(Connection source, string token, CancellationToken ct) =>
            source.Id == Unavailable ? throw new HttpRequestException("fixture unreachable") : Task.FromResult(Issues);
    }
    private sealed class Handler(Func<HttpRequestMessage, HttpResponseMessage> action) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken) => Task.FromResult(action(request));
    }
    private sealed class Factory(HttpMessageHandler handler) : IHttpClientFactory
    {
        public HttpClient CreateClient(string name) => new(handler, disposeHandler: false);
    }
}
