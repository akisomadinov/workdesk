using StronglyTypedIds;

namespace Workdesk.Data;

public static class LocalIdentity { public static readonly Guid OwnerId = Guid.Parse("00000000-0000-4000-8000-000000000001"); }
[StronglyTypedId] public partial struct UserId;
[StronglyTypedId] public partial struct WorkspaceId;
[StronglyTypedId] public partial struct MembershipId;
[StronglyTypedId] public partial struct InvitationId;
[StronglyTypedId] public partial struct NoteId;
[StronglyTypedId] public partial struct RevisionId;
[StronglyTypedId] public partial struct NotificationId;

public sealed class Account : BaseEntity<UserId>
{
    public string Name { get; private set; } = "";
    public string Email { get; private set; } = "";
    public string Login { get; private set; } = "";
    public string PasswordHash { get; private set; } = "";
    private Account() { }
    public Account(Guid id, string name, string email, string hash) { Id = new UserId(id); Name = name; Email = email; PasswordHash = hash; }
    public void SetPassword(string hash) => PasswordHash = hash;
    public void SetLogin(string login) => Login = login;
}
public sealed class Workspace : BaseEntity<WorkspaceId>
{
    public string Name { get; private set; } = "";
    public Guid OwnerId { get; private set; }
    private Workspace() { }
    public Workspace(string name, Guid ownerId) { Id = WorkspaceId.New(); Name = name; OwnerId = ownerId; }
}
public sealed class Membership : BaseEntity<MembershipId>
{
    public Guid WorkspaceId { get; private set; }
    public Guid UserId { get; private set; }
    public string Role { get; private set; } = "reader";
    private Membership() { }
    public Membership(Guid workspace, Guid user, string role) { Id = MembershipId.New(); WorkspaceId = workspace; UserId = user; Role = role; }
    public void SetRole(string role) => Role = role;
}
public sealed class Invitation : BaseEntity<InvitationId>
{
    public Guid WorkspaceId { get; private set; }
    public string TokenHash { get; private set; } = "";
    public string Role { get; private set; } = "reader";
    public DateTime Expires { get; private set; }
    public bool Used { get; private set; }
    public Guid? TargetUserId { get; private set; }
    private Invitation() { }
    public Invitation(Guid workspace, string hash, string role) { Id = InvitationId.New(); WorkspaceId = workspace; TokenHash = hash; Role = role; Expires = DateTime.UtcNow.AddDays(7); }
    public void Use() => Used = true;
    public void SetTarget(Guid user) => TargetUserId = user;
}
public sealed class Note : BaseEntity<NoteId>
{
    public Guid? ParentId { get; private set; }
    public Guid OwnerId { get; private set; }
    public Guid? WorkspaceId { get; private set; }
    public string Title { get; private set; } = "";
    public string Body { get; private set; } = "";
    public string Project { get; private set; } = "";
    public string Tags { get; private set; } = "";
    public bool Pinned { get; private set; }
    public bool Archived { get; private set; }
    public int Revision { get; private set; }
    private Note() { }
    public Note(Guid owner) { Id = NoteId.New(); OwnerId = owner; }
    public void Update(string title, string body, string project, string tags, bool pinned, bool archived, Guid? workspace, Guid? parentId = null)
    {
        Title = title; Body = body; Project = project; Tags = tags; Pinned = pinned; Archived = archived; WorkspaceId = workspace; ParentId = parentId;
        Revision++; Modified = DateTime.UtcNow;
    }
}
public sealed class NoteRevision : BaseEntity<RevisionId>
{
    public Guid NoteId { get; private set; }
    public Guid AuthorId { get; private set; }
    public string Title { get; private set; } = "";
    public string Body { get; private set; } = "";
    public int Number { get; private set; }
    private NoteRevision() { }
    public NoteRevision(Note note, Guid author) { Id = RevisionId.New(); NoteId = note.Id.Value; AuthorId = author; Title = note.Title; Body = note.Body; Number = note.Revision; }
}
public sealed class Notification : BaseEntity<NotificationId>
{
    public Guid OwnerId { get; private set; }
    public string EventKey { get; private set; } = "";
    public string Title { get; private set; } = "";
    public string Url { get; private set; } = "";
    public string Kind { get; private set; } = "task";
    public bool Read { get; private set; }
    public string Delivery { get; private set; } = "off";
    public int Attempts { get; private set; }
    public DateTime? RetryAt { get; private set; }
    private Notification() { }
    public Notification(Guid owner, string key, string title, string url, string kind, bool telegram)
    { Id = NotificationId.New(); OwnerId = owner; EventKey = key; Title = title; Url = url; Kind = kind; Delivery = telegram ? "pending" : "off"; }
    public void MarkRead() => Read = true;
    public void Delivered() { Delivery = "sent"; Attempts++; RetryAt = null; }
    public void Failed(int? delaySeconds = null) { Attempts++; Delivery = Attempts >= 5 ? "failed" : "pending"; RetryAt = DateTime.UtcNow.AddSeconds(delaySeconds ?? Math.Min(3600, 30 * Math.Pow(2, Attempts))); }
    public void Sending() { Delivery = "sending"; RetryAt = DateTime.UtcNow; }
    public void Uncertain() { Delivery = "uncertain"; Attempts++; RetryAt = null; }
}
public sealed class TelegramSettings
{
    public Guid OwnerId { get; private set; }
    public string ChatId { get; private set; } = "";
    public bool Enabled { get; private set; }
    private TelegramSettings() { }
    public TelegramSettings(Guid owner) => OwnerId = owner;
    public void Update(string chat, bool enabled) { ChatId = chat; Enabled = enabled; }
}
