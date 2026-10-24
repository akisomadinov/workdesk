using System.Net;
using System.Text.Json;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Workdesk.Data;
using Workdesk.Services;
using Xunit;

namespace Workdesk.Tests;

public sealed class TelegramLinkTests : IDisposable
{
    private readonly SqliteConnection connection = new("Data Source=:memory:");
    private readonly WorkdeskContext db;
    private readonly IUnitOfWork unit;
    private readonly Bot bot = new();
    public TelegramLinkTests()
    {
        connection.Open(); db = new(new DbContextOptionsBuilder<WorkdeskContext>().UseSqlite(connection).Options); db.Database.Migrate();
        unit = new UnitOfWork(db, new TaskRepository(db), new ConnectionRepository(db));
    }
    [Fact]
    public async Task AccountsLinkIndependentlyAndNotificationsGoOnlyToTheirOwner()
    {
        var first = Guid.NewGuid(); var second = Guid.NewGuid();
        var a = Service(first); var b = Service(second);
        var linkA = await a.Begin(default); var linkB = await b.Begin(default);
        var tokenA = Token(linkA); var tokenB = Token(linkB);
        Assert.NotEqual(tokenA, tokenB); Assert.InRange(tokenA.Length, 43, 64);
        Assert.DoesNotContain(tokenA, (await unit.TelegramLinks.Get(first, default))!.TokenHash);
        Assert.InRange((linkA.ExpiresAt - DateTime.UtcNow).TotalMinutes, 9, 10);
        bot.Items = [new(1, 111, 111, true, "/start " + tokenA), new(2, 222, 222, true, "/start " + tokenB)];
        await a.Poll(default);
        Assert.True((await a.State(default)).Connected); Assert.True((await b.State(default)).Connected);
        Assert.Equal("111", (await unit.Telegram.Get(first, default))!.ChatId);
        Assert.Equal("222", (await unit.Telegram.Get(second, default))!.ChatId);
        bot.Items = [new(3, 333, 333, true, "/start " + tokenA)]; await a.Poll(default);
        Assert.Equal("111", (await unit.Telegram.Get(first, default))!.ChatId);
        var handler = new Handler();
        var notifications = new NotificationService(unit, Rights(first), new NoSecrets(), new Factory(handler), sharedBot: bot);
        await notifications.Record(first, "first", "First only", "https://example.test/1", "comment", default);
        await notifications.Record(second, "second", "Second only", "https://example.test/2", "comment", default);
        await unit.Commit(default); await notifications.Deliver(default); await notifications.Deliver(default);
        Assert.Equal(new[] { "111:First only", "222:Second only" }, handler.Delivered.OrderBy(x => x));
    }
    [Fact]
    public async Task GroupsWrongSendersExpiredAndSupersededCodesCannotLink()
    {
        var owner = Guid.NewGuid(); var service = Service(owner);
        var initial = await service.Begin(default);
        await Assert.ThrowsAsync<AppException>(() => service.Begin(default));
        var link = (await unit.TelegramLinks.Get(owner, default))!;
        link.Renew(link.TokenHash, DateTime.UtcNow.AddMinutes(-1)); await unit.Commit(default);
        bot.Items = [new(1, 111, 111, true, "/start " + Token(initial))]; await service.Poll(default);
        Assert.False((await service.State(default)).Connected);
        var current = await service.Begin(default);
        bot.Items = [new(2, 111, 111, true, "/start " + Token(initial)),
            new(3, -111, 111, false, "/start " + Token(current)), new(4, 111, 222, true, "/start " + Token(current))];
        await service.Poll(default); Assert.False((await service.State(default)).Connected);
        bot.Items = [new(5, 111, 111, true, "/start " + Token(current))]; await service.Poll(default);
        Assert.True((await service.State(default)).Connected);
    }
    [Fact]
    public async Task DisconnectCancelsOnlyOwnQueueAndSharedChatCannotBeReplacedManually()
    {
        var first = Guid.NewGuid(); var second = Guid.NewGuid();
        var settings = new TelegramSettings(first); settings.Link("111"); unit.Telegram.Add(settings);
        var other = new TelegramSettings(second); other.Link("222"); unit.Telegram.Add(other);
        var own = new Notification(first, "own", "Own", "", "comment", true);
        var foreign = new Notification(second, "foreign", "Other", "", "comment", true);
        unit.Notifications.Add(own); unit.Notifications.Add(foreign); await unit.Commit(default);
        var notifications = new NotificationService(unit, Rights(first), new NoSecrets(), new Factory(new Handler()), sharedBot: bot);
        await Assert.ThrowsAsync<AppException>(() => notifications.Configure(new SaveTelegramRequest { ChatId = "222", Enabled = true }, default));
        await Service(first).Disconnect(default);
        Assert.Equal("off", own.Delivery); Assert.Equal("pending", foreign.Delivery);
        Assert.False((await Service(first).State(default)).Connected);
        Assert.True((await Service(second).State(default)).Connected);
    }
    private AccessPolicy Rights(Guid owner) => new(unit, new Actor(owner));
    private TelegramLinkService Service(Guid owner) => new(unit, Rights(owner), bot);
    private static string Token(TelegramLinkResponse link) => link.Url.Split("?start=")[1];
    public void Dispose() { db.Dispose(); connection.Dispose(); }
    private sealed class Actor(Guid id) : ICurrentActor { public Guid Id => id; public bool IsSystem => false; }
    private sealed class Bot : ISharedTelegramBot
    {
        public bool Configured => true;
        public string BotId => "fixture";
        public string Token => "fixture";
        public List<TelegramBotUpdate> Items { get; set; } = [];
        public Task<string> Username(CancellationToken ct) => Task.FromResult("workdesk_fixture_bot");
        public Task<List<TelegramBotUpdate>> Updates(long offset, CancellationToken ct) => Task.FromResult(Items.Where(x => x.Id >= offset).ToList());
    }
    private sealed class NoSecrets : ISecretStore
    {
        public bool Has(Guid id) => false;
        public string? Get(Guid id) => throw new InvalidOperationException("Personal token must not be used");
        public void Set(Guid id, string value) => throw new InvalidOperationException();
    }
    private sealed class Factory(Handler handler) : IHttpClientFactory { public HttpClient CreateClient(string name) => new(handler, false); }
    private sealed class Handler : HttpMessageHandler
    {
        public List<string> Delivered { get; } = [];
        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
        {
            using var body = JsonDocument.Parse(await request.Content!.ReadAsStringAsync(ct));
            Delivered.Add(body.RootElement.GetProperty("chat_id").GetString() + ":" + body.RootElement.GetProperty("text").GetString()!.Split('\n')[0]);
            return new(HttpStatusCode.OK);
        }
    }
}
