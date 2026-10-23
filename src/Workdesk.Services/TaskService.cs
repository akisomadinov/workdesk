using System.Globalization;
using Microsoft.EntityFrameworkCore;
using Workdesk.Data;

namespace Workdesk.Services;

public interface ITaskService
{
    Task<List<WorkItemResponse>> GetAll(CancellationToken ct);
    Task<WorkItemResponse> Save(SaveTaskRequest request, CancellationToken ct);
}
public sealed class TaskService(IUnitOfWork unit, IAccessPolicy? access = null) : ITaskService
{
    private readonly IAccessPolicy rights = access ?? new AccessPolicy(unit, new LocalActor());
    public async Task<List<WorkItemResponse>> GetAll(CancellationToken ct)
    {
        var result = new List<WorkItemResponse>();
        var documents = (await unit.Notes.GetAll(ct)).ToDictionary(note => note.Id.Value);
        foreach (var item in await unit.Tasks.GetAll(ct))
        {
            if (!await rights.CanRead(item.OwnerId, item.WorkspaceId, ct)) continue;
            var ids = new List<Guid>();
            foreach (var id in item.DocumentIds)
                if (documents.TryGetValue(id, out var note) && SameAudience(note, item.OwnerId, item.WorkspaceId)
                    && await rights.CanRead(note.OwnerId, note.WorkspaceId, ct)) ids.Add(id);
            result.Add(new WorkItemResponse(item, await rights.CanEdit(item.OwnerId, item.WorkspaceId, ct), ids.ToArray()));
        }
        return result.OrderByDescending(x => x.Created).ToList();
    }

    public async Task<WorkItemResponse> Save(SaveTaskRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Title) || request.Title.Length > 500)
            throw new AppException("Укажи название задачи, до 500 символов.");
        if (!new[] { "inbox", "planned", "doing", "waiting", "done" }.Contains(request.Stage))
            throw new AppException("Неизвестный статус задачи.");
        if (!new[] { "low", "normal", "high", "urgent" }.Contains(request.Priority))
            throw new AppException("Неизвестный приоритет.");
        if (request.PlannedFor is not null && !DateOnly.TryParseExact(request.PlannedFor, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out _))
            throw new AppException("Некорректная дата плана.");
        if (request.Notes.Length > 200_000 || request.Description.Length > 200_000 || request.NextStep.Length > 10_000 || request.Blocker.Length > 10_000 || request.Project.Length > 200)
            throw new AppException("Текст слишком длинный.");
        var item = request.Id is { } id
            ? await unit.Tasks.Get(new WorkItemId(id), ct) ?? throw new AppException("Задача не найдена.", 404)
            : new WorkItem(request.Title.Trim(), request.Project.Trim(), request.Description);
        if (request.Id is null) item.SetOwner(rights.UserId);
        await rights.RequireWrite(item.OwnerId, item.WorkspaceId, ct);
        if (item.WorkspaceId != request.WorkspaceId && item.OwnerId != rights.UserId) throw new AppException("Только автор может перенести задачу в другое пространство.", 403);
        await rights.RequireWorkspace(request.WorkspaceId, request.AssigneeId, ct);
        if (request.Milestone.Length > 200) throw new AppException("Название milestone должно быть короче 200 символов.");
        if (item.Revision != request.Revision) throw new AppException("Задача изменена в другой вкладке. Твой черновик сохранён в браузере. Обнови карточку перед повторным сохранением.", 409);
        var documentIds = request.DocumentIds ?? item.DocumentIds;
        if (documentIds.Length > 50) throw new AppException("К задаче можно прикрепить до 50 документов.");
        var validDocuments = new List<Guid>();
        foreach (var documentId in documentIds.Distinct())
        {
            var note = await unit.Notes.Get(new NoteId(documentId), ct);
            var existing = item.DocumentIds.Contains(documentId);
            if (note is null || !SameAudience(note, item.OwnerId, request.WorkspaceId)
                || !await rights.CanRead(note.OwnerId, note.WorkspaceId, ct) || (note.Archived && !existing))
            {
                // Removed access or a moved document must not block unrelated task edits.
                if (existing) continue;
                throw new AppException("Документ недоступен. Выбери документ из того же пространства, что и задача.", 403);
            }
            validDocuments.Add(documentId);
        }
        if (request.Id is null) unit.Tasks.Add(item);
        item.SetDocuments(validDocuments);
        item.Update(request.Title.Trim(), request.Project.Trim(), request.Description, request.Notes,
            request.NextStep, request.Blocker, request.Stage, request.Priority, request.PlannedFor, request.Archived);
        item.SetCollaboration(request.WorkspaceId, request.AssigneeId, request.Milestone.Trim());
        try { await unit.Commit(ct); }
        catch (DbUpdateConcurrencyException) { throw new AppException("Задача уже изменена. Обнови карточку перед сохранением.", 409); }
        return new WorkItemResponse(item);
    }
    private static bool SameAudience(Note note, Guid owner, Guid? workspace) =>
        note.WorkspaceId == workspace && (workspace is not null || note.OwnerId == owner);

}
