using System.Net;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Workdesk.Data;
using Workdesk.Services;
using Xunit;

namespace Workdesk.Tests;

public sealed class CollaborationTests : IDisposable
{
    private readonly SqliteConnection connection = new("Data Source=:memory:");
    private readonly WorkdeskContext db;
    private readonly IUnitOfWork unit;
    private readonly Actor owner = new(LocalIdentity.OwnerId);
    private const string Password = "only-for-tests-12345";
    private readonly RuntimeOptions options = new();
    public CollaborationTests()
    {
        connection.Open(); db = new(new DbContextOptionsBuilder<WorkdeskContext>().UseSqlite(connection).Options); db.Database.Migrate();
        unit = new UnitOfWork(db, new TaskRepository(db), new ConnectionRepository(db));
    }
    private TeamService Team(Actor actor) => new(unit, actor, options);
    private AccessPolicy Rights(Actor actor) => new(unit, actor);
    [Fact]
    public async Task FirstAccountKeepsLocalTasksDocumentsConnectionsAndTelegram()
    {
        var tasks = new TaskService(unit, Rights(owner));
        var notes = new NoteService(unit, Rights(owner));
        var note = await notes.Save(new SaveNoteRequest { Title = "Existing document", Body = "Keep this" }, default);
        var task = await tasks.Save(new SaveTaskRequest { Title = "Existing task", Notes = "Progress", DocumentIds = [note.Id] }, default);
        var source = new Connection("Existing GitLab", "gitlab", "https://example.test/api/v4/", true);
        source.SetScope(owner.Id, "team/project", true); unit.Connections.Add(source);
        var telegram = new TelegramSettings(owner.Id); telegram.Link("123456", "Owner", "owner"); unit.Telegram.Add(telegram);
        await unit.Commit(default);
        var account = await Team(owner).Setup(new CredentialsRequest { Name = "Owner", Email = "owner@example.test", Login = "owner", Password = Password }, default);
        db.ChangeTracker.Clear();
        Assert.Equal(LocalIdentity.OwnerId, account.Id.Value);
        Assert.True(options.RequireAuthentication);
        var retained = Assert.Single(await tasks.GetAll(default));
        Assert.Equal(task.Id, retained.Id); Assert.Equal("Progress", retained.Notes); Assert.Equal(note.Id, Assert.Single(retained.DocumentIds));
        Assert.Equal("Keep this", Assert.Single(await notes.GetAll(default)).Body);
        var retainedSource = Assert.Single(await unit.Connections.GetAll(default));
        Assert.Equal(source.Id, retainedSource.Id); Assert.True(retainedSource.RequiresVpn); Assert.Equal("team/project", retainedSource.Projects);
        Assert.Equal("123456", (await unit.Telegram.Get(account.Id.Value, default))!.ChatId);
        Assert.Equal(403, (await Assert.ThrowsAsync<AppException>(() => Team(owner).Setup(new(), default))).Status);
    }
    [Fact]
    public async Task SelfRegistrationCreatesPrivateAccountWithoutTeamOrOwnerData()
    {
        var space = await Space();
        await new NoteService(unit, Rights(owner)).Save(new SaveNoteRequest { Title = "Owner private" }, default);
        var source = new Connection("GitLab", "gitlab", "https://example.test/api/v4/", false); unit.Connections.Add(source);
        var telegram = new TelegramSettings(owner.Id); telegram.Link("123456"); unit.Telegram.Add(telegram); await unit.Commit(default);
        var anonymous = new Actor(Guid.Empty);
        var credentials = new CredentialsRequest { Name = "New user", Login = "new-user", Email = "new@example.test", Password = Password };
        var account = await Team(anonymous).Register(credentials, default);
        var person = new Actor(account.Id.Value);
        Assert.NotEqual(owner.Id, person.Id);
        Assert.Empty(await Team(person).List(default));
        Assert.Empty(await new NoteService(unit, Rights(person)).GetAll(default));
        Assert.Null(await unit.Telegram.Get(person.Id, default));
        var connections = new ConnectionService(unit, new Secrets(), new EmptyIssues(), new SyncLocks(), Rights(person));
        Assert.Empty(await connections.GetAll(default));
        Assert.Equal(404, (await Assert.ThrowsAsync<AppException>(() => connections.SetToken(source.Id.Value, "unrelated-test-token", default))).Status);
        Assert.Equal(person.Id, (await Team(anonymous).Login(new CredentialsRequest { Login = "NEW-USER", Password = Password }, default)).Id.Value);
        Assert.Equal(409, (await Assert.ThrowsAsync<AppException>(() => Team(person).Register(credentials, default))).Status);
        var invitation = await Team(owner).Invite(space.Id, "reader", default);
        await Team(person).Join(invitation.Token, default);
        Assert.Equal("reader", Assert.Single(await Team(person).List(default)).Role);
        Assert.Equal(410, (await Assert.ThrowsAsync<AppException>(() => Team(person).Join(invitation.Token, default))).Status);
    }
    [Fact]
    public async Task RegistrationCannotClaimOwnerAndDuplicateCredentialsReturnConflict()
    {
        var anonymous = Team(new Actor(Guid.Empty));
        var credentials = new CredentialsRequest { Name = "User", Login = "person", Email = "person@example.test", Password = Password };
        Assert.Equal(403, (await Assert.ThrowsAsync<AppException>(() => anonymous.Register(credentials, default))).Status);
        await Space();
        await anonymous.Register(credentials, default);
        db.ChangeTracker.Clear();
        Assert.Equal(409, (await Assert.ThrowsAsync<AppException>(() => anonymous.Register(credentials, default))).Status);
        db.ChangeTracker.Clear();
        Assert.Equal(2, (await unit.Accounts.GetAll(default)).Count);
    }
    private sealed class EmptyIssues : IIssueClient
    { public Task<List<ImportedIssue>> Fetch(Connection source, string token, CancellationToken ct) => Task.FromResult(new List<ImportedIssue>()); }
    private async Task<WorkspaceResponse> Space()
    {
        await Team(owner).Setup(new CredentialsRequest { Name = "Owner", Email = "owner@example.test", Login = "owner", Password = Password }, default);
        return await Team(owner).Create("Shared docs", default);
    }
    private async Task<Actor> Join(WorkspaceResponse space, string role = "reader")
    {
        var invitation = await Team(owner).Invite(space.Id, role, default);
        var account = await Team(owner).Accept(new AcceptInvitationRequest { Token = invitation.Token, Name = "Reader", Email = "reader@example.test", Login = "reader", Password = Password }, default);
        return new(account.Id.Value);
    }
    [Fact]
    public async Task PersonalDocumentsRemainPrivateAndReadersCannotWrite()
    {
        var space = await Space(); var reader = await Join(space);
        var writer = new NoteService(unit, Rights(owner));
        await writer.Save(new SaveNoteRequest { Title = "Private", Body = "private" }, default);
        var shared = await writer.Save(new SaveNoteRequest { Title = "Shared", WorkspaceId = space.Id, Body = "first" }, default);
        var service = new NoteService(unit, Rights(reader));
        var only = Assert.Single(await service.GetAll(default)); Assert.Equal(shared.Id, only.Id); Assert.False(only.CanEdit);
        var forbidden = await Assert.ThrowsAsync<AppException>(() => service.Save(new SaveNoteRequest { Id = shared.Id, Title = "Changed", Body = "attack", WorkspaceId = space.Id, Revision = shared.Revision }, default));
        Assert.Equal(403, forbidden.Status);
        await Team(owner).SetRole(space.Id, reader.Id, "editor", default);
        var edited = await service.Save(new SaveNoteRequest { Id = shared.Id, Title = "Shared", Body = "edited", WorkspaceId = space.Id, Revision = shared.Revision }, default);
        Assert.Equal("edited", edited.Body);
        await Team(owner).SetRole(space.Id, reader.Id, "removed", default);
        Assert.Empty(await service.GetAll(default));
        await Assert.ThrowsAsync<AppException>(() => service.History(shared.Id, default));
    }
    [Fact]
    public async Task ReaderCannotOverwriteOrMoveTasksUsingDirectApi()
    {
        var space = await Space(); var reader = await Join(space);
        var task = await new TaskService(unit, Rights(owner)).Save(new SaveTaskRequest { Title = "Shared task", WorkspaceId = space.Id }, default);
        var service = new TaskService(unit, Rights(reader));
        Assert.False(Assert.Single(await service.GetAll(default)).CanEdit);
        await Assert.ThrowsAsync<AppException>(() => service.Save(new SaveTaskRequest { Id = task.Id, Title = task.Title, Revision = task.Revision, WorkspaceId = null }, default));
    }
    [Fact]
    public async Task TaskDocumentsPersistDeduplicateAndSurviveOlderClientUpdates()
    {
        var space = await Space(); var reader = await Join(space);
        var note = await new NoteService(unit, Rights(owner)).Save(new SaveNoteRequest { Title = "Guide", WorkspaceId = space.Id }, default);
        var service = new TaskService(unit, Rights(owner));
        var task = await service.Save(new SaveTaskRequest { Title = "Release", WorkspaceId = space.Id, DocumentIds = [note.Id, note.Id] }, default);
        Assert.Equal(note.Id, Assert.Single(task.DocumentIds));
        db.ChangeTracker.Clear();
        var saved = Assert.Single(await service.GetAll(default));
        Assert.Equal(note.Id, Assert.Single(saved.DocumentIds));
        var updated = await service.Save(new SaveTaskRequest { Id = task.Id, Title = task.Title, WorkspaceId = space.Id, Revision = task.Revision, NextStep = "Verify build" }, default);
        Assert.Equal(note.Id, Assert.Single(updated.DocumentIds));
        var readerView = Assert.Single(await new TaskService(unit, Rights(reader)).GetAll(default));
        Assert.Equal(note.Id, Assert.Single(readerView.DocumentIds)); Assert.False(readerView.CanEdit);
        await Assert.ThrowsAsync<AppException>(() => new TaskService(unit, Rights(reader)).Save(new SaveTaskRequest { Id = task.Id, Title = task.Title, WorkspaceId = space.Id, Revision = updated.Revision, DocumentIds = [] }, default));
        await Team(owner).SetRole(space.Id, reader.Id, "removed", default);
        Assert.Empty(await new TaskService(unit, Rights(reader)).GetAll(default));
    }
    [Fact]
    public async Task TaskDocumentsRejectPrivateAndCrossWorkspaceLinks()
    {
        var space = await Space(); var otherSpace = await Team(owner).Create("Other", default);
        var service = new TaskService(unit, Rights(owner));
        var notes = new NoteService(unit, Rights(owner));
        var personal = await notes.Save(new SaveNoteRequest { Title = "Private" }, default);
        var other = await notes.Save(new SaveNoteRequest { Title = "Other", WorkspaceId = otherSpace.Id }, default);
        foreach (var id in new[] { personal.Id, other.Id, Guid.NewGuid() })
        {
            var failure = await Assert.ThrowsAsync<AppException>(() => service.Save(new SaveTaskRequest { Title = "Team task", WorkspaceId = space.Id, DocumentIds = [id] }, default));
            Assert.Equal(403, failure.Status);
        }
        Assert.Empty(await service.GetAll(default));
    }
    [Fact]
    public async Task MovingDocumentsHidesLinksAndDoesNotBlockTaskEdits()
    {
        var space = await Space(); var reader = await Join(space);
        var notes = new NoteService(unit, Rights(owner));
        var note = await notes.Save(new SaveNoteRequest { Title = "Guide", WorkspaceId = space.Id }, default);
        var service = new TaskService(unit, Rights(owner));
        var task = await service.Save(new SaveTaskRequest { Title = "Release", WorkspaceId = space.Id, DocumentIds = [note.Id] }, default);
        await notes.Save(new SaveNoteRequest { Id = note.Id, Title = note.Title, Revision = note.Revision, WorkspaceId = null }, default);
        Assert.Empty(Assert.Single(await new TaskService(unit, Rights(reader)).GetAll(default)).DocumentIds);
        var updated = await service.Save(new SaveTaskRequest { Id = task.Id, Title = task.Title, WorkspaceId = space.Id, Revision = task.Revision, DocumentIds = [note.Id], NextStep = "Continue" }, default);
        Assert.Empty(updated.DocumentIds); Assert.Equal("Continue", updated.NextStep);
    }
    [Fact]
    public async Task MovingTaskDropsOldDocumentLinksAndStaleRevisionCannotRestoreThem()
    {
        var space = await Space();
        var note = await new NoteService(unit, Rights(owner)).Save(new SaveNoteRequest { Title = "Personal" }, default);
        var service = new TaskService(unit, Rights(owner));
        var task = await service.Save(new SaveTaskRequest { Title = "Task", DocumentIds = [note.Id] }, default);
        var moved = await service.Save(new SaveTaskRequest { Id = task.Id, Title = task.Title, Revision = task.Revision, WorkspaceId = space.Id, DocumentIds = [note.Id] }, default);
        Assert.Empty(moved.DocumentIds);
        var failure = await Assert.ThrowsAsync<AppException>(() => service.Save(new SaveTaskRequest { Id = task.Id, Title = task.Title, Revision = task.Revision, DocumentIds = [note.Id] }, default));
        Assert.Equal(409, failure.Status);
    }
    [Fact]
    public async Task InvitationsAreSingleUseAndLoginWorks()
    {
        var space = await Space(); var invitation = await Team(owner).Invite(space.Id, "editor", default);
        var request = new AcceptInvitationRequest { Token = invitation.Token, Name = "Person", Email = "person@example.test", Login = "person", Password = Password };
        await Team(owner).Accept(request, default);
        await Assert.ThrowsAsync<AppException>(() => Team(owner).Accept(request, default));
        var account = await Team(owner).Login(new CredentialsRequest { Login = "person", Password = Password }, default);
        Assert.Equal("person", account.Login);
    }
    [Fact]
    public async Task DirectInvitationRequiresTheTargetAccount()
    {
        var space = await Space(); var reader = await Join(space);
        await Team(owner).SetRole(space.Id, reader.Id, "removed", default);
        var direct = await Team(owner).Invite(space.Id, "editor", default, "reader"); Assert.Empty(direct.Token);
        var invitation = Assert.Single(await Team(reader).Pending(default));
        await Assert.ThrowsAsync<AppException>(() => Team(owner).AcceptDirect(invitation.Id, default));
        await Team(reader).AcceptDirect(invitation.Id, default);
        Assert.Equal("editor", Assert.Single(await Team(reader).List(default)).Role);
    }
    [Fact]
    public async Task LinkInvitationRestoresRevokedMembership()
    {
        var space = await Space(); var reader = await Join(space);
        await Team(owner).SetRole(space.Id, reader.Id, "removed", default);
        var invitation = await Team(owner).Invite(space.Id, "editor", default);
        await Team(owner).Accept(new AcceptInvitationRequest { Token = invitation.Token, Email = "reader@example.test", Password = Password }, default);
        Assert.Equal("editor", Assert.Single(await Team(reader).List(default)).Role);
    }
    [Fact]
    public async Task MarkdownExportLinksPointToFilesAndPreserveCode()
    {
        var service = new NoteService(unit, Rights(owner));
        var target = await service.Save(new SaveNoteRequest { Title = "Target", Body = "text" }, default);
        await service.Save(new SaveNoteRequest { Title = "Source", Body = $"[[note:{target.Id}|Link]]\n`[[note:{target.Id}]]`" }, default);
        using var stream = new MemoryStream(await service.Export(default));
        using var zip = new System.IO.Compression.ZipArchive(stream);
        using var reader = new StreamReader(zip.Entries.Single(x => x.Name.StartsWith("Source-")).Open());
        var body = await reader.ReadToEndAsync();
        Assert.Contains($"[[personal/Target-{target.Id.ToString()[..8]}|Link]]", body);
        Assert.Contains($"`[[note:{target.Id}]]`", body);
    }
    [Fact]
    public async Task NoteHistoryAndCycleChecksPreserveContent()
    {
        var service = new NoteService(unit, Rights(owner));
        var first = await service.Save(new SaveNoteRequest { Title = "Parent", Body = "first" }, default);
        var child = await service.Save(new SaveNoteRequest { Title = "Child", Body = "child", ParentId = first.Id }, default);
        await Assert.ThrowsAsync<AppException>(() => service.Save(new SaveNoteRequest { Id = first.Id, Title = "Parent", Body = "bad", Revision = first.Revision, ParentId = child.Id }, default));
        await service.Save(new SaveNoteRequest { Id = first.Id, Title = "Parent", Body = "second", Revision = first.Revision }, default);
        Assert.Equal("first", Assert.Single(await service.History(first.Id, default)).Body);
    }
    [Fact]
    public async Task NotificationDeduplicationAndAmbiguousDeliveryDoNotResend()
    {
        var secrets = new Secrets(); var handler = new ThrowingHandler();
        var service = new NotificationService(unit, Rights(owner), secrets, new Factory(handler));
        await service.Configure(new SaveTelegramRequest { ChatId = "12345", Token = "123456:" + new string('A', 30), Enabled = true }, default);
        await service.Record(owner.Id, "unique", "Task", "https://example.test", "task", default);
        await service.Record(owner.Id, "unique", "Task", "https://example.test", "task", default);
        await unit.Commit(default);
        await service.Deliver(default); await service.Deliver(default);
        Assert.Equal(1, handler.Calls);
        Assert.Equal("uncertain", Assert.Single(await service.List(default)).Delivery);
    }
    [RedisFact]
    public async Task RedisProducerDeduplicatesAndConsumerAcknowledges()
    {
        using var queue = new RedisDeliveryQueue(new QueueOptions { Address = Environment.GetEnvironmentVariable("WORKDESK_TEST_REDIS"), PasswordFile = Environment.GetEnvironmentVariable("WORKDESK_TEST_REDIS_PASSWORD_FILE"), Prefix = "workdesk:test:" + Guid.NewGuid().ToString("N") });
        var id = Guid.NewGuid(); await queue.Publish(id); await queue.Publish(id);
        var entry = Assert.Single(await queue.Read()); Assert.Equal(id, entry.NotificationId);
        await queue.Ack(entry); Assert.Empty(await queue.Read());
    }
    [Fact]
    public async Task TaskTrashPreservesContentChecksAccessAndRejectsStaleWrites()
    {
        var space = await Space(); var reader = await Join(space);
        var service = new TaskService(unit, Rights(owner));
        var note = await new NoteService(unit, Rights(owner)).Save(new SaveNoteRequest { Title = "Guide", WorkspaceId = space.Id }, default);
        var task = await service.Save(new SaveTaskRequest { Title = "Task", WorkspaceId = space.Id, Notes = "Work log", Description = "Goal", DocumentIds = [note.Id] }, default);
        var readerService = new TaskService(unit, Rights(reader));
        Assert.Equal(403, (await Assert.ThrowsAsync<AppException>(() => readerService.SetDeleted(task.Id, task.Revision, true, default))).Status);
        Assert.Equal(409, (await Assert.ThrowsAsync<AppException>(() => service.SetDeleted(task.Id, task.Revision - 1, true, default))).Status);
        var deleted = await service.SetDeleted(task.Id, task.Revision, true, default);
        Assert.NotNull(deleted.DeletedAt); Assert.Empty(await service.GetAll(default));
        Assert.False(Assert.Single(await readerService.GetDeleted(default)).CanEdit);
        Assert.Equal(403, (await Assert.ThrowsAsync<AppException>(() => readerService.SetDeleted(task.Id, deleted.Revision, false, default))).Status);
        Assert.Equal(409, (await Assert.ThrowsAsync<AppException>(() => service.Save(new SaveTaskRequest { Id = task.Id, Title = "Overwrite", WorkspaceId = space.Id, Revision = deleted.Revision }, default))).Status);
        await Team(owner).SetRole(space.Id, reader.Id, "removed", default);
        Assert.Empty(await readerService.GetDeleted(default));
        var restored = await service.SetDeleted(task.Id, deleted.Revision, false, default);
        Assert.Null(restored.DeletedAt); Assert.Equal("Work log", restored.Notes); Assert.Equal("Goal", restored.Description);
        Assert.Equal(note.Id, Assert.Single(restored.DocumentIds)); Assert.Empty(await service.GetDeleted(default));
        Assert.Equal(restored.Id, Assert.Single(await service.GetAll(default)).Id);
    }
    [Fact]
    public async Task DocumentTrashKeepsChildrenAndHistoryAndHidesTaskLinks()
    {
        var notes = new NoteService(unit, Rights(owner));
        var parent = await notes.Save(new SaveNoteRequest { Title = "Parent", Body = "first" }, default);
        var child = await notes.Save(new SaveNoteRequest { Title = "Child", ParentId = parent.Id }, default);
        parent = await notes.Save(new SaveNoteRequest { Id = parent.Id, Title = parent.Title, Body = "second", Revision = parent.Revision }, default);
        var tasks = new TaskService(unit, Rights(owner));
        var task = await tasks.Save(new SaveTaskRequest { Title = "Task", DocumentIds = [parent.Id] }, default);
        var deleted = await notes.SetDeleted(parent.Id, parent.Revision, true, default);
        var remaining = Assert.Single(await notes.GetAll(default)); Assert.Equal(child.Id, remaining.Id); Assert.Null(remaining.ParentId);
        Assert.Empty(Assert.Single(await tasks.GetAll(default)).DocumentIds);
        Assert.Equal("first", Assert.Single(await notes.History(parent.Id, default)).Body);
        Assert.Equal(409, (await Assert.ThrowsAsync<AppException>(() => notes.Save(new SaveNoteRequest { Id = parent.Id, Title = parent.Title, Revision = deleted.Revision }, default))).Status);
        using var stream = new MemoryStream(await notes.Export(default));
        using var zip = new System.IO.Compression.ZipArchive(stream); Assert.StartsWith("Child-", Assert.Single(zip.Entries).Name);
        var hiddenTask = await tasks.SetDeleted(task.Id, task.Revision, true, default); Assert.Empty(hiddenTask.DocumentIds);
        var restored = await notes.SetDeleted(parent.Id, deleted.Revision, false, default);
        Assert.Equal("second", restored.Body); Assert.Null(restored.ParentId);
        Assert.Equal(parent.Id, Assert.Single((await tasks.SetDeleted(task.Id, hiddenTask.Revision, false, default)).DocumentIds));
    }
    [Fact]
    public async Task TrashAndRestoreRespectPersonalOwnershipAndDocumentRoles()
    {
        var space = await Space(); var reader = await Join(space);
        var notes = new NoteService(unit, Rights(owner)); var readerNotes = new NoteService(unit, Rights(reader));
        var shared = await notes.Save(new SaveNoteRequest { Title = "Shared", WorkspaceId = space.Id }, default);
        Assert.Equal(403, (await Assert.ThrowsAsync<AppException>(() => readerNotes.SetDeleted(shared.Id, shared.Revision, true, default))).Status);
        var personal = await notes.Save(new SaveNoteRequest { Title = "Private" }, default);
        var deleted = await notes.SetDeleted(personal.Id, personal.Revision, true, default);
        Assert.Empty(await readerNotes.GetDeleted(default));
        Assert.Equal(403, (await Assert.ThrowsAsync<AppException>(() => readerNotes.SetDeleted(personal.Id, deleted.Revision, false, default))).Status);
        var tasks = new TaskService(unit, Rights(owner)); var task = await tasks.Save(new SaveTaskRequest { Title = "Private task" }, default);
        var deletedTask = await tasks.SetDeleted(task.Id, task.Revision, true, default);
        var readerTasks = new TaskService(unit, Rights(reader)); Assert.Empty(await readerTasks.GetDeleted(default));
        Assert.Equal(403, (await Assert.ThrowsAsync<AppException>(() => readerTasks.SetDeleted(task.Id, deletedTask.Revision, false, default))).Status);
    }
    [Fact]
    public async Task SyncDoesNotResurrectDeletedImportedTasks()
    {
        var task = new WorkItem("Imported", "Project", "Description");
        task.Import(ConnectionId.New(), "issue:1", "Imported", "Project", "Description", "https://example.test", "opened", DateTime.UtcNow);
        task.SetDeleted(true); var revision = task.Revision;
        task.Import(task.ConnectionId!.Value, "issue:1", "Updated upstream", "Project", "New description", "https://example.test", "closed", DateTime.UtcNow);
        Assert.NotNull(task.DeletedAt); Assert.Equal(revision, task.Revision);
    }
    public void Dispose() { db.Dispose(); connection.Dispose(); }
    private sealed class Actor(Guid id) : ICurrentActor { public Guid Id => id; public bool IsSystem => false; }
    private sealed class Secrets : ISecretStore
    {
        private readonly Dictionary<Guid, string> values = [];
        public bool Has(Guid id) => values.ContainsKey(id); public string? Get(Guid id) => values.GetValueOrDefault(id); public void Set(Guid id, string token) => values[id] = token;
    }
    private sealed class ThrowingHandler : HttpMessageHandler
    {
        public int Calls { get; private set; }
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken) { Calls++; throw new HttpRequestException("Simulated uncertain transport result"); }
    }
    private sealed class Factory(HttpMessageHandler handler) : IHttpClientFactory { public HttpClient CreateClient(string name) => new(handler, false); }
}
public sealed class RedisFactAttribute : FactAttribute
{
    public RedisFactAttribute() { if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("WORKDESK_TEST_REDIS"))) Skip = "Configure WORKDESK_TEST_REDIS to run the Redis integration test."; }
}
