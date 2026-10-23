using StronglyTypedIds;

namespace Workdesk.Data;

[StronglyTypedId]
public partial struct WorkItemId;
[StronglyTypedId]
public partial struct ConnectionId;

public abstract class BaseEntity<TId> where TId : struct
{
    public TId Id { get; protected set; }
    public DateTime Created { get; private set; } = DateTime.UtcNow;
    public DateTime? Modified { get; protected set; }
}

public sealed class WorkItem : BaseEntity<WorkItemId>
{
    public Guid OwnerId { get; private set; } = LocalIdentity.OwnerId;
    public Guid? WorkspaceId { get; private set; }
    public Guid? AssigneeId { get; private set; }
    public string Milestone { get; private set; } = "";
    public string ExternalMilestone { get; private set; } = "";
    public string Title { get; private set; } = "";
    public string Project { get; private set; } = "";
    public string Description { get; private set; } = "";
    public string Notes { get; private set; } = "";
    public Guid[] DocumentIds { get; private set; } = [];
    public string NextStep { get; private set; } = "";
    public string Blocker { get; private set; } = "";
    public string Stage { get; private set; } = "inbox";
    public string Priority { get; private set; } = "normal";
    public string? PlannedFor { get; private set; }
    public DateTime? DeletedAt { get; private set; }
    public bool Archived { get; private set; }
    public int Revision { get; private set; }
    public ConnectionId? ConnectionId { get; private set; }
    public string? ExternalKey { get; private set; }
    public string? ExternalUrl { get; private set; }
    public string? ExternalState { get; private set; }
    public DateTime? SourceUpdated { get; private set; }

    private WorkItem() { }
    public void SetDeleted(bool deleted) { DeletedAt = deleted ? DateTime.UtcNow : null; Revision++; Modified = DateTime.UtcNow; }
    public void SetDocuments(IEnumerable<Guid> ids) => DocumentIds = ids.Distinct().ToArray();
    public void SetOwner(Guid owner) => OwnerId = owner;
    public void SetCollaboration(Guid? workspace, Guid? assignee, string milestone) { WorkspaceId = workspace; AssigneeId = assignee; Milestone = milestone; }
    public void SetExternalMilestone(string milestone) => ExternalMilestone = milestone;
    public WorkItem(string title, string project, string description)
    {
        Id = WorkItemId.New(); Title = title; Project = project; Description = description;
    }
    public void Update(string title, string project, string description, string notes, string nextStep,
        string blocker, string stage, string priority, string? plannedFor, bool archived)
    {
        if (ConnectionId is null) { Title = title; Project = project; Description = description; }
        Notes = notes; NextStep = nextStep; Blocker = blocker; Stage = stage;
        Priority = priority; PlannedFor = plannedFor; Archived = archived;
        Revision++; Modified = DateTime.UtcNow;
    }
    public void Import(ConnectionId connectionId, string key, string title, string project,
        string description, string url, string state, DateTime updated)
    {
        ConnectionId = connectionId; ExternalKey = key; Title = title; Project = project;
        Description = description; ExternalUrl = url; ExternalState = state; SourceUpdated = updated;
        // Sync never changes local fields, Revision or the personal board stage.
    }
}

public sealed class Connection : BaseEntity<ConnectionId>
{
    public Guid OwnerId { get; private set; } = LocalIdentity.OwnerId;
    public string Projects { get; private set; } = "";
    public bool WatchMergeRequests { get; private set; }
    public string Name { get; private set; } = "";
    public string Provider { get; private set; } = "gitlab";
    public string ApiUrl { get; private set; } = "";
    public bool RequiresVpn { get; private set; }
    public bool Enabled { get; private set; } = true;
    public string Health { get; private set; } = "never";
    public string? Message { get; private set; }
    public DateTime? LastAttempt { get; private set; }
    public DateTime? LastSuccess { get; private set; }
    public DateTime? SyncedThrough { get; private set; }
    public int ImportedCount { get; private set; }

    private Connection() { }
    public void SetScope(Guid owner, string projects, bool watch)
    {
        if (Projects != projects) { SyncedThrough = null; LastSuccess = null; Health = "never"; }
        OwnerId = owner; Projects = projects; WatchMergeRequests = watch;
    }
    public Connection(string name, string provider, string apiUrl, bool requiresVpn)
    {
        Id = ConnectionId.New(); Name = name; Provider = provider; ApiUrl = apiUrl; RequiresVpn = requiresVpn;
    }
    public void SetEnabled(bool value) { Enabled = value; Modified = DateTime.UtcNow; }
    public void Record(string health, string message, int? count = null, DateTime? syncedThrough = null)
    {
        LastAttempt = DateTime.UtcNow; Health = health; Message = message;
        if (health == "ok") { LastSuccess = LastAttempt; ImportedCount = count ?? 0; SyncedThrough = syncedThrough; }
    }
}
