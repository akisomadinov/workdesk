namespace Workdesk.Data;

public sealed class TelegramLink
{
    public Guid OwnerId { get; private set; }
    public string TokenHash { get; private set; } = "";
    public DateTime ExpiresAt { get; private set; }
    public bool Used { get; private set; }
    public Guid? ConfirmationId { get; private set; }
    public long? ChatId { get; private set; }
    public string DisplayName { get; private set; } = "";
    public string Username { get; private set; } = "";
    private TelegramLink() { }
    public TelegramLink(Guid owner) => OwnerId = owner;
    public void Renew(string hash, DateTime expires)
    { TokenHash = hash; ExpiresAt = expires; Used = false; ClearCandidate(); }
    public void Propose(long chatId, string name, string username)
    {
        if (Used || ConfirmationId is not null || ExpiresAt <= DateTime.UtcNow || chatId <= 0) return;
        ConfirmationId = Guid.NewGuid(); ChatId = chatId;
        DisplayName = name[..Math.Min(name.Length, 160)]; Username = username[..Math.Min(username.Length, 32)];
    }
    public void Consume() { Used = true; ClearCandidate(); }
    private void ClearCandidate() { ConfirmationId = null; ChatId = null; DisplayName = ""; Username = ""; }
}

public sealed class TelegramInbox
{
    public string BotId { get; private set; } = "";
    public long Offset { get; private set; }
    private TelegramInbox() { }
    public TelegramInbox(string botId) => BotId = botId;
    public void Advance(long offset) => Offset = Math.Max(Offset, offset);
}
