using Workdesk.Data;

namespace Workdesk.Services;

public sealed record MergeRequestResponse(Guid Id, Guid ConnectionId, string Source, string Provider, string Project, int Number,
    string Title, string Url, string State, string Author, string Reviewers, string SourceBranch, string TargetBranch,
    bool IsAuthor, bool NeedsMyReview, bool Draft, bool NotificationsEnabled, int UnreadComments, int CommentCount, DateTime SourceUpdated);
public sealed record MergeCommentResponse(Guid Id, string Author, string Body, string Url, bool IsOwn, bool Read, DateTime PostedAt, DateTime UpdatedAt, MergeCodeContext? CodeContext);
public sealed record MergeRequestDetailsResponse(MergeRequestResponse Item, string Description, List<MergeCommentResponse> Comments, int Page, int TotalPages);
public sealed class ReadMergeCommentsRequest { public Guid[] Ids { get; set; } = []; }
public interface IMergeRequestService
{
    Task<List<MergeRequestResponse>> List(CancellationToken ct);
    Task<MergeRequestDetailsResponse> Get(Guid id, int page, CancellationToken ct);
    Task SetNotifications(Guid id, bool enabled, CancellationToken ct);
    Task Read(Guid id, ReadMergeCommentsRequest request, CancellationToken ct);
    Task Sync(Connection source, string token, CancellationToken ct);
}
public sealed class MergeRequestService(IUnitOfWork unit, IAccessPolicy access, IMergeRequestClient client, INotificationService? notifications = null) : IMergeRequestService
{
    public async Task<List<MergeRequestResponse>> List(CancellationToken ct)
    {
        var sources = (await unit.Connections.GetAll(ct)).Where(x => x.OwnerId == access.UserId).ToDictionary(x => x.Id);
        var comments = (await unit.MergeComments.GetAll(ct)).ToLookup(x => x.MergeRequestId);
        return (await unit.MergeRequests.GetAll(ct)).Where(x => x.OwnerId == access.UserId && sources.ContainsKey(x.ConnectionId))
            .OrderByDescending(x => x.SourceUpdated).Select(x => View(x, sources[x.ConnectionId], comments[x.Id])).ToList();
    }
    public async Task<MergeRequestDetailsResponse> Get(Guid id, int page, CancellationToken ct)
    {
        var (item, source) = await Find(id, ct);
        var comments = (await unit.MergeComments.GetAll(ct)).Where(x => x.MergeRequestId == item.Id).OrderByDescending(x => x.PostedAt).ThenBy(x => x.Id.Value).ToList();
        var totalPages = Math.Max(1, (comments.Count + 49) / 50);
        page = Math.Clamp(page, 1, totalPages);
        return new(View(item, source, comments), item.Description, comments.Skip((page - 1) * 50).Take(50)
            .Select(x => new MergeCommentResponse(x.Id.Value, x.Author, x.Body, x.Url, x.IsOwn, x.Read, x.PostedAt, x.UpdatedAt, x.CodeContext)).ToList(), page, totalPages);
    }
    public async Task SetNotifications(Guid id, bool enabled, CancellationToken ct)
    {
        var (item, _) = await Find(id, ct); item.SetNotifications(enabled);
        if (!enabled)
            foreach (var notification in (await unit.Notifications.GetAll(ct)).Where(x => x.OwnerId == access.UserId && x.MergeRequestId == id)) notification.StopDelivery();
        await unit.Commit(ct);
    }
    public async Task Read(Guid id, ReadMergeCommentsRequest request, CancellationToken ct)
    {
        var (item, _) = await Find(id, ct);
        if (request.Ids is null || request.Ids.Length > 50) throw new AppException("Можно отметить до 50 комментариев за раз.");
        var ids = request.Ids.ToHashSet();
        var comments = (await unit.MergeComments.GetAll(ct)).Where(x => x.MergeRequestId == item.Id && ids.Contains(x.Id.Value)).ToList();
        foreach (var comment in comments) comment.MarkRead();
        var urls = comments.Select(x => x.Url).ToHashSet();
        foreach (var notification in (await unit.Notifications.GetAll(ct)).Where(x => x.OwnerId == access.UserId && x.MergeRequestId == id && urls.Contains(x.Url))) notification.MarkRead();
        await unit.Commit(ct);
    }
    public async Task Sync(Connection source, string token, CancellationToken ct)
    {
        if (!source.WatchMergeRequests || string.IsNullOrWhiteSpace(source.Projects)) return;
        var started = DateTime.UtcNow;
        var tracked = (await unit.MergeRequests.TrackedKeys(source.Id, ct)).ToHashSet();
        var snapshot = await client.Fetch(source, token, tracked, ct);
        var existing = (await unit.MergeRequests.GetAll(ct)).Where(x => x.ConnectionId == source.Id).ToDictionary(x => x.ExternalKey);
        var comments = (await unit.MergeComments.GetAll(ct)).ToDictionary(x => (x.MergeRequestId, x.ExternalKey));
        foreach (var incoming in snapshot.DistinctBy(x => x.Key))
        {
            var alreadyTracked = existing.TryGetValue(incoming.Key, out var item);
            if (!alreadyTracked)
            {
                item = new MergeRequest(source.OwnerId, source.Id, incoming.Key); unit.MergeRequests.Add(item); existing.Add(incoming.Key, item);
            }
            item!.Update(incoming.Project, incoming.Number, incoming.Title, incoming.Description, incoming.Url, incoming.State,
                incoming.Author, incoming.Reviewers, incoming.SourceBranch, incoming.TargetBranch, incoming.IsAuthor, incoming.NeedsMyReview, incoming.Draft, incoming.Updated);
            foreach (var note in incoming.Comments.DistinctBy(x => x.Key))
            {
                var fresh = source.MergeRequestsSyncedThrough is { } since && (alreadyTracked || note.Created >= since.AddMinutes(-2)) && !note.IsOwn;
                if (!comments.TryGetValue((item.Id, note.Key), out var comment))
                {
                    comment = new MergeComment(item.Id, note.Key, !fresh); unit.MergeComments.Add(comment); comments.Add((item.Id, note.Key), comment);
                    if (fresh && item.NotificationsEnabled && notifications is not null)
                        await notifications.Record(source.OwnerId, $"{source.Id}:mr:{incoming.Key}:comment:{note.Key}",
                            $"{(source.Provider == "gitlab" ? "MR !" : "PR #")}{incoming.Number}: {note.Author} · {incoming.Title}", note.Url, "comment", ct, item.Id.Value);
                }
                comment.Update(note.Author, note.Body, note.Url, note.IsOwn, note.Created, note.Updated);
                comment.SetCodeContext(note.CodeContext);
            }
        }
        source.RecordMergeRequestSync(started);
    }
    private async Task<(MergeRequest, Connection)> Find(Guid id, CancellationToken ct)
    {
        var item = await unit.MergeRequests.Get(new MergeRequestId(id), ct);
        if (item is null || item.OwnerId != access.UserId) throw new AppException("MR не найден.", 404);
        var source = await unit.Connections.Get(item.ConnectionId, ct);
        if (source is null || source.OwnerId != access.UserId) throw new AppException("MR не найден.", 404);
        return (item, source);
    }
    private static MergeRequestResponse View(MergeRequest item, Connection source, IEnumerable<MergeComment> comments)
    {
        var list = comments.ToList();
        return new(item.Id.Value, source.Id.Value, source.Name, source.Provider, item.Project, item.Number, item.Title, item.Url,
            item.State, item.Author, item.Reviewers, item.SourceBranch, item.TargetBranch, item.IsAuthor, item.NeedsMyReview, item.Draft,
            item.NotificationsEnabled, list.Count(x => !x.Read), list.Count, item.SourceUpdated);
    }
}
