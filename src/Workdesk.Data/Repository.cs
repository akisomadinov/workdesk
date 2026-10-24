using Microsoft.EntityFrameworkCore;

namespace Workdesk.Data;

public interface IBaseRepository<TEntity, in TId> where TEntity : BaseEntity<TId> where TId : struct
{
    Task<TEntity?> Get(TId id, CancellationToken ct);
    Task<List<TEntity>> GetAll(CancellationToken ct);
    void Add(TEntity entity);
}

public class BaseRepository<TEntity, TId>(WorkdeskContext context) : IBaseRepository<TEntity, TId>
    where TEntity : BaseEntity<TId> where TId : struct
{
    protected WorkdeskContext Context => context;
    public async Task<TEntity?> Get(TId id, CancellationToken ct) => await context.Set<TEntity>().FindAsync([id], ct);
    public Task<List<TEntity>> GetAll(CancellationToken ct) => context.Set<TEntity>().ToListAsync(ct);
    public void Add(TEntity entity) => context.Set<TEntity>().Add(entity);
}

public interface ITaskRepository : IBaseRepository<WorkItem, WorkItemId>
{
    Task<WorkItem?> FindExternal(ConnectionId connectionId, string externalKey, CancellationToken ct);
}
public sealed class TaskRepository(WorkdeskContext context) : BaseRepository<WorkItem, WorkItemId>(context), ITaskRepository
{
    public Task<WorkItem?> FindExternal(ConnectionId connectionId, string externalKey, CancellationToken ct) =>
        Context.Tasks.SingleOrDefaultAsync(x => x.ConnectionId == connectionId && x.ExternalKey == externalKey, ct);
}
public interface IConnectionRepository : IBaseRepository<Connection, ConnectionId>;
public sealed class ConnectionRepository(WorkdeskContext context) : BaseRepository<Connection, ConnectionId>(context), IConnectionRepository;

public interface IMergeRequestRepository : IBaseRepository<MergeRequest, MergeRequestId>
{
    Task<List<string>> TrackedKeys(ConnectionId connectionId, CancellationToken ct);
}
public sealed class MergeRequestRepository(WorkdeskContext context) : BaseRepository<MergeRequest, MergeRequestId>(context), IMergeRequestRepository
{
    public Task<List<string>> TrackedKeys(ConnectionId connectionId, CancellationToken ct) =>
        Context.Set<MergeRequest>().AsNoTracking().Where(x => x.ConnectionId == connectionId).Select(x => x.ExternalKey).ToListAsync(ct);
}

public interface IUnitOfWork
{
    ITelegramLinkRepository TelegramLinks { get; }
    IMergeRequestRepository MergeRequests { get; }
    IBaseRepository<MergeComment, MergeCommentId> MergeComments { get; }
    ITelegramRepository Telegram { get; }
    IBaseRepository<Account, UserId> Accounts { get; }
    IBaseRepository<Workspace, WorkspaceId> Workspaces { get; }
    IBaseRepository<Membership, MembershipId> Members { get; }
    IBaseRepository<Invitation, InvitationId> Invitations { get; }
    IBaseRepository<Note, NoteId> Notes { get; }
    IBaseRepository<NoteRevision, RevisionId> NoteHistory { get; }
    IBaseRepository<Notification, NotificationId> Notifications { get; }
    ITaskRepository Tasks { get; }
    IConnectionRepository Connections { get; }
    Task Commit(CancellationToken ct);
}
public sealed class UnitOfWork(WorkdeskContext context, ITaskRepository tasks, IConnectionRepository connections) : IUnitOfWork
{
    public ITelegramLinkRepository TelegramLinks { get; } = new TelegramLinkRepository(context);
    public IMergeRequestRepository MergeRequests { get; } = new MergeRequestRepository(context);
    public IBaseRepository<MergeComment, MergeCommentId> MergeComments { get; } = new BaseRepository<MergeComment, MergeCommentId>(context);
    public ITelegramRepository Telegram { get; } = new TelegramRepository(context);
    public IBaseRepository<Account, UserId> Accounts { get; } = new BaseRepository<Account, UserId>(context);
    public IBaseRepository<Workspace, WorkspaceId> Workspaces { get; } = new BaseRepository<Workspace, WorkspaceId>(context);
    public IBaseRepository<Membership, MembershipId> Members { get; } = new BaseRepository<Membership, MembershipId>(context);
    public IBaseRepository<Invitation, InvitationId> Invitations { get; } = new BaseRepository<Invitation, InvitationId>(context);
    public IBaseRepository<Note, NoteId> Notes { get; } = new BaseRepository<Note, NoteId>(context);
    public IBaseRepository<NoteRevision, RevisionId> NoteHistory { get; } = new BaseRepository<NoteRevision, RevisionId>(context);
    public IBaseRepository<Notification, NotificationId> Notifications { get; } = new BaseRepository<Notification, NotificationId>(context);
    public ITaskRepository Tasks => tasks;
    public IConnectionRepository Connections => connections;
    public async Task Commit(CancellationToken ct) => await context.SaveChangesAsync(ct);
}
public interface ITelegramLinkRepository
{
    Task<TelegramLink?> Get(Guid owner, CancellationToken ct);
    Task<TelegramLink?> Find(string hash, CancellationToken ct);
    Task<TelegramInbox?> Inbox(string botId, CancellationToken ct);
    void Add(TelegramLink link);
    void Add(TelegramInbox inbox);
}
public sealed class TelegramLinkRepository(WorkdeskContext context) : ITelegramLinkRepository
{
    public Task<TelegramLink?> Get(Guid owner, CancellationToken ct) => context.Set<TelegramLink>().SingleOrDefaultAsync(x => x.OwnerId == owner, ct);
    public Task<TelegramLink?> Find(string hash, CancellationToken ct) => context.Set<TelegramLink>().SingleOrDefaultAsync(x => x.TokenHash == hash, ct);
    public Task<TelegramInbox?> Inbox(string botId, CancellationToken ct) => context.Set<TelegramInbox>().SingleOrDefaultAsync(x => x.BotId == botId, ct);
    public void Add(TelegramLink link) => context.Set<TelegramLink>().Add(link);
    public void Add(TelegramInbox inbox) => context.Set<TelegramInbox>().Add(inbox);
}
public interface ITelegramRepository { Task<TelegramSettings?> Get(Guid owner, CancellationToken ct); Task<List<TelegramSettings>> GetAll(CancellationToken ct); void Add(TelegramSettings settings); }
public sealed class TelegramRepository(WorkdeskContext context) : ITelegramRepository
{
    public Task<TelegramSettings?> Get(Guid owner, CancellationToken ct) => context.Telegram.SingleOrDefaultAsync(x => x.OwnerId == owner, ct);
    public Task<List<TelegramSettings>> GetAll(CancellationToken ct) => context.Telegram.ToListAsync(ct);
    public void Add(TelegramSettings settings) => context.Telegram.Add(settings);
}
