using Workdesk.Data;

namespace Workdesk.Services;

public sealed class WorkItemResponse(WorkItem task, bool canEdit = true)
{
    public Guid OwnerId { get; } = task.OwnerId;
    public Guid? WorkspaceId { get; } = task.WorkspaceId;
    public Guid? AssigneeId { get; } = task.AssigneeId;
    public string Milestone { get; } = task.Milestone;
    public string ExternalMilestone { get; } = task.ExternalMilestone;
    public bool CanEdit { get; } = canEdit;
    public Guid Id { get; } = task.Id.Value;
    public string Title { get; } = task.Title;
    public string Project { get; } = task.Project;
    public string Description { get; } = task.Description;
    public string Notes { get; } = task.Notes;
    public string NextStep { get; } = task.NextStep;
    public string Blocker { get; } = task.Blocker;
    public string Stage { get; } = task.Stage;
    public string Priority { get; } = task.Priority;
    public string? PlannedFor { get; } = task.PlannedFor;
    public bool Archived { get; } = task.Archived;
    public int Revision { get; } = task.Revision;
    public Guid? ConnectionId { get; } = task.ConnectionId?.Value;
    public string? ExternalKey { get; } = task.ExternalKey;
    public string? ExternalUrl { get; } = task.ExternalUrl;
    public string? ExternalState { get; } = task.ExternalState;
    public DateTime Created { get; } = task.Created;
    public DateTime? Modified { get; } = task.Modified;
    public DateTime? SourceUpdated { get; } = task.SourceUpdated;
}
public sealed class SaveTaskRequest
{
    public Guid? WorkspaceId { get; set; }
    public Guid? AssigneeId { get; set; }
    public string Milestone { get; set; } = "";
    public Guid? Id { get; set; }
    public int Revision { get; set; }
    public string Title { get; set; } = "";
    public string Project { get; set; } = "";
    public string Description { get; set; } = "";
    public string Notes { get; set; } = "";
    public string NextStep { get; set; } = "";
    public string Blocker { get; set; } = "";
    public string Stage { get; set; } = "inbox";
    public string Priority { get; set; } = "normal";
    public string? PlannedFor { get; set; }
    public bool Archived { get; set; }
}
public sealed class ConnectionResponse(Connection connection, bool hasToken)
{
    public string Projects { get; } = connection.Projects;
    public bool WatchMergeRequests { get; } = connection.WatchMergeRequests;
    public Guid Id { get; } = connection.Id.Value;
    public string Name { get; } = connection.Name;
    public string Provider { get; } = connection.Provider;
    public string ApiUrl { get; } = connection.ApiUrl;
    public bool RequiresVpn { get; } = connection.RequiresVpn;
    public bool Enabled { get; } = connection.Enabled;
    public string Health { get; } = connection.Health;
    public string? Message { get; } = connection.Message;
    public DateTime? LastAttempt { get; } = connection.LastAttempt;
    public DateTime? LastSuccess { get; } = connection.LastSuccess;
    public int ImportedCount { get; } = connection.ImportedCount;
    public bool HasToken { get; } = hasToken;
}
public sealed class CreateConnectionRequest
{
    public string Projects { get; set; } = "";
    public bool WatchMergeRequests { get; set; }
    public string Name { get; set; } = "";
    public string Provider { get; set; } = "gitlab";
    public string ApiUrl { get; set; } = "";
    public bool RequiresVpn { get; set; }
    public string? Token { get; set; }
}
public sealed class SetTokenRequest { public string Token { get; set; } = ""; }
public sealed class SetEnabledRequest { public bool Enabled { get; set; } }
public sealed class SetScopeRequest { public string Projects { get; set; } = ""; public bool WatchMergeRequests { get; set; } }
public sealed record BackupResponse(int Version, DateTime ExportedAt, List<WorkItemResponse> Tasks, List<ConnectionResponse> Connections);
public sealed class AppException(string message, int status = 400) : Exception(message)
{
    public int Status { get; } = status;
}
