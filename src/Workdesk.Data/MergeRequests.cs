using StronglyTypedIds;

namespace Workdesk.Data;

[StronglyTypedId] public partial struct MergeRequestId;
[StronglyTypedId] public partial struct MergeCommentId;

public sealed record MergeCodeLine(int? OldLine, int? NewLine, string Kind, string Text, bool Highlighted);
public sealed record MergeCodeContext(string Path, string OldPath, int? OldLine, int? NewLine, string Commit,
    bool Outdated, bool? Resolved, List<MergeCodeLine> Lines);

public sealed class MergeRequest : BaseEntity<MergeRequestId>
{
    public Guid OwnerId { get; private set; }
    public ConnectionId ConnectionId { get; private set; }
    public string ExternalKey { get; private set; } = "";
    public string Project { get; private set; } = "";
    public int Number { get; private set; }
    public string Title { get; private set; } = "";
    public string Description { get; private set; } = "";
    public string Url { get; private set; } = "";
    public string State { get; private set; } = "opened";
    public string Author { get; private set; } = "";
    public string Reviewers { get; private set; } = "";
    public string SourceBranch { get; private set; } = "";
    public string TargetBranch { get; private set; } = "";
    public bool IsAuthor { get; private set; }
    public bool NeedsMyReview { get; private set; }
    public bool Draft { get; private set; }
    public bool NotificationsEnabled { get; private set; } = true;
    public DateTime SourceUpdated { get; private set; }
    private MergeRequest() { }
    public MergeRequest(Guid owner, ConnectionId connection, string key)
    { Id = MergeRequestId.New(); OwnerId = owner; ConnectionId = connection; ExternalKey = key; }
    public void Update(string project, int number, string title, string description, string url, string state,
        string author, string reviewers, string sourceBranch, string targetBranch, bool isAuthor, bool needsMyReview, bool draft, DateTime updated)
    {
        Project = project; Number = number; Title = title; Description = description; Url = url; State = state;
        Author = author; Reviewers = reviewers; SourceBranch = sourceBranch; TargetBranch = targetBranch;
        IsAuthor = isAuthor; NeedsMyReview = needsMyReview; Draft = draft; SourceUpdated = updated; Modified = DateTime.UtcNow;
    }
    public void SetNotifications(bool enabled) => NotificationsEnabled = enabled;
}

public sealed class MergeComment : BaseEntity<MergeCommentId>
{
    public MergeCodeContext? CodeContext { get; private set; }
    public MergeRequestId MergeRequestId { get; private set; }
    public string ExternalKey { get; private set; } = "";
    public string Author { get; private set; } = "";
    public string Body { get; private set; } = "";
    public string Url { get; private set; } = "";
    public bool IsOwn { get; private set; }
    public bool Read { get; private set; }
    public DateTime PostedAt { get; private set; }
    public DateTime UpdatedAt { get; private set; }
    private MergeComment() { }
    public MergeComment(MergeRequestId mergeRequest, string key, bool read)
    { Id = MergeCommentId.New(); MergeRequestId = mergeRequest; ExternalKey = key; Read = read; }
    public void Update(string author, string body, string url, bool isOwn, DateTime postedAt, DateTime updatedAt)
    { Author = author; Body = body; Url = url; IsOwn = isOwn; PostedAt = postedAt; UpdatedAt = updatedAt; Modified = DateTime.UtcNow; }
    public void MarkRead() => Read = true;
    public void SetCodeContext(MergeCodeContext? context)
    {
        // Keep a saved fragment when the provider can no longer return that exact diff revision.
        if (context is { Lines.Count: 0 } && CodeContext is { Lines.Count: > 0 } saved
            && context.Path == saved.Path && context.Commit == saved.Commit
            && context.OldLine == saved.OldLine && context.NewLine == saved.NewLine)
            context = context with { Lines = saved.Lines };
        CodeContext = context;
    }
}
