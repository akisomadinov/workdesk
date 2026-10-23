using StackExchange.Redis;

namespace Workdesk.Services;

public sealed class QueueOptions { public string? Address { get; init; } public string? PasswordFile { get; init; } public string Prefix { get; init; } = "workdesk:local"; }
public sealed record QueueMessage(string Id, Guid NotificationId);
public interface IDeliveryQueue
{
    bool Configured { get; }
    bool Connected { get; }
    Task Publish(Guid id);
    Task<List<QueueMessage>> Read();
    Task Ack(QueueMessage message);
}
public sealed class RedisDeliveryQueue : IDeliveryQueue, IDisposable
{
    private readonly ConnectionMultiplexer? connection;
    private readonly string stream;
    private readonly string prefix;
    private readonly string consumer = Guid.NewGuid().ToString("N");
    private const string Group = "telegram";
    public bool Configured => connection is not null;
    public bool Connected => connection?.IsConnected == true;
    public RedisDeliveryQueue(QueueOptions options)
    {
        prefix = options.Prefix; stream = prefix + ":deliveries";
        if (string.IsNullOrWhiteSpace(options.Address)) return;
        var config = ConfigurationOptions.Parse(options.Address);
        config.AbortOnConnectFail = false; config.ConnectTimeout = 3000; config.AsyncTimeout = 3000;
        config.AllowAdmin = false;
        if (!string.IsNullOrWhiteSpace(options.PasswordFile)) { config.Password = File.ReadAllText(options.PasswordFile).Trim(); config.User = "workdesk"; }
        connection = ConnectionMultiplexer.Connect(config);
    }
    public async Task Publish(Guid id)
    {
        if (connection is null) return;
        const string script = "if redis.call('SET',KEYS[2],ARGV[1],'NX','EX',604800) then return redis.call('XADD',KEYS[1],'*','id',ARGV[1]) end return ''";
        await connection.GetDatabase().ScriptEvaluateAsync(script, [stream, prefix + ":queued:" + id], [id.ToString()]);
    }
    public async Task<List<QueueMessage>> Read()
    {
        if (connection is null) return [];
        var db = connection.GetDatabase();
        try { await db.StreamCreateConsumerGroupAsync(stream, Group, "0-0", createStream: true); }
        catch (RedisServerException exception) when (exception.Message.StartsWith("BUSYGROUP", StringComparison.Ordinal)) { }
        var old = await db.StreamAutoClaimAsync(stream, Group, consumer, 60000, "0-0", count: 10);
        var fresh = await db.StreamReadGroupAsync(stream, Group, consumer, ">", count: 10);
        return old.ClaimedEntries.Concat(fresh).Select(entry => new QueueMessage(entry.Id.ToString(), Guid.TryParse(entry.Values.FirstOrDefault(x => x.Name == "id").Value.ToString(), out var id) ? id : Guid.Empty)).ToList();
    }
    public async Task Ack(QueueMessage message)
    {
        if (connection is null) return;
        var db = connection.GetDatabase();
        const string script = "redis.call('XACK',KEYS[1],ARGV[1],ARGV[2]); redis.call('XDEL',KEYS[1],ARGV[2]); redis.call('DEL',KEYS[2]); return 1";
        await db.ScriptEvaluateAsync(script, [stream, prefix + ":queued:" + message.NotificationId], [Group, message.Id]);
    }
    public void Dispose() => connection?.Dispose();
}
