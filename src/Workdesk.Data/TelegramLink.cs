namespace Workdesk.Data;

public sealed class TelegramLink
{
    public Guid OwnerId { get; private set; }
    public string TokenHash { get; private set; } = "";
    public DateTime ExpiresAt { get; private set; }
    public bool Used { get; private set; }
    private TelegramLink() { }
    public TelegramLink(Guid owner) => OwnerId = owner;
    public void Renew(string hash, DateTime expires) { TokenHash = hash; ExpiresAt = expires; Used = false; }
    public void Consume() => Used = true;
}

public sealed class TelegramInbox
{
    public string BotId { get; private set; } = "";
    public long Offset { get; private set; }
    private TelegramInbox() { }
    public TelegramInbox(string botId) => BotId = botId;
    public void Advance(long offset) => Offset = Math.Max(Offset, offset);
}
