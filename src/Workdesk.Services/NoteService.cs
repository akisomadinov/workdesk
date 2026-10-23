using System.IO.Compression;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Workdesk.Data;

namespace Workdesk.Services;

public sealed class NoteResponse(Note note, bool canEdit)
{
    public Guid Id { get; } = note.Id.Value;
    public Guid? ParentId { get; } = note.ParentId;
    public Guid OwnerId { get; } = note.OwnerId;
    public Guid? WorkspaceId { get; } = note.WorkspaceId;
    public string Title { get; } = note.Title;
    public string Body { get; } = note.Body;
    public string Project { get; } = note.Project;
    public string Tags { get; } = note.Tags;
    public bool Pinned { get; } = note.Pinned;
    public bool Archived { get; } = note.Archived;
    public DateTime? DeletedAt { get; } = note.DeletedAt;
    public int Revision { get; } = note.Revision;
    public DateTime Created { get; } = note.Created;
    public DateTime? Modified { get; } = note.Modified;
    public bool CanEdit { get; } = canEdit;
}
public sealed class SaveNoteRequest
{
    public Guid? ParentId { get; set; }
    public Guid? Id { get; set; }
    public int Revision { get; set; }
    public Guid? WorkspaceId { get; set; }
    public string Title { get; set; } = "";
    public string Body { get; set; } = "";
    public string Project { get; set; } = "";
    public string Tags { get; set; } = "";
    public bool Pinned { get; set; }
    public bool Archived { get; set; }
}
public sealed record NoteHistoryResponse(Guid Id, string Title, string Body, int Number, Guid AuthorId, DateTime Created);
public sealed class MarkdownFileRequest { public string Name { get; set; } = ""; public string Content { get; set; } = ""; }
public sealed class ImportNotesRequest { public Guid? WorkspaceId { get; set; } public List<MarkdownFileRequest> Files { get; set; } = []; }
public interface INoteService
{
    Task<List<NoteResponse>> GetAll(CancellationToken ct);
    Task<List<NoteResponse>> GetDeleted(CancellationToken ct);
    Task<NoteResponse> SetDeleted(Guid id, int revision, bool deleted, CancellationToken ct);
    Task<NoteResponse> Save(SaveNoteRequest request, CancellationToken ct);
    Task<List<NoteHistoryResponse>> History(Guid id, CancellationToken ct);
    Task<List<NoteResponse>> Import(ImportNotesRequest request, CancellationToken ct);
    Task<byte[]> Export(CancellationToken ct);
}
public sealed class NoteService(IUnitOfWork unit, IAccessPolicy access) : INoteService
{
    public Task<List<NoteResponse>> GetAll(CancellationToken ct) => List(false, ct);
    public Task<List<NoteResponse>> GetDeleted(CancellationToken ct) => List(true, ct);
    private async Task<List<NoteResponse>> List(bool deleted, CancellationToken ct)
    {
        var result = new List<NoteResponse>();
        foreach (var note in await unit.Notes.GetAll(ct))
            if ((note.DeletedAt is not null) == deleted && await access.CanRead(note.OwnerId, note.WorkspaceId, ct)) result.Add(new NoteResponse(note, await access.CanEdit(note.OwnerId, note.WorkspaceId, ct)));
        return result.OrderByDescending(x => x.Pinned).ThenByDescending(x => x.Modified ?? x.Created).ToList();
    }
    public async Task<NoteResponse> Save(SaveNoteRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Title) || request.Title.Length > 200 || request.Body.Length > 500_000 || request.Project.Length > 200 || request.Tags.Length > 500)
            throw new AppException("Проверь название (до 200 символов) и размер заметки (до 500 000 символов).");
        var note = request.Id is { } id ? await unit.Notes.Get(new NoteId(id), ct) ?? throw new AppException("Заметка не найдена.", 404) : new Note(access.UserId);
        await access.RequireWrite(note.OwnerId, note.WorkspaceId, ct);
        if (note.DeletedAt is not null) throw new AppException("Документ в корзине. Сначала восстанови его.", 409);
        if (request.WorkspaceId != note.WorkspaceId && note.OwnerId != access.UserId) throw new AppException("Только автор может перенести заметку в другое пространство.", 403);
        if (request.WorkspaceId != note.WorkspaceId && (await unit.Notes.GetAll(ct)).Any(x => x.ParentId == note.Id.Value)) throw new AppException("Сначала перенеси вложенные страницы на верхний уровень.");
        await access.RequireWorkspace(request.WorkspaceId, null, ct);
        if (request.ParentId is { } parentId)
        {
            var visited = new HashSet<Guid> { note.Id.Value }; Guid? current = parentId;
            while (current is { } next)
            {
                if (!visited.Add(next) || visited.Count > 50) throw new AppException("Страницы не могут образовывать цикл.");
                var parent = await unit.Notes.Get(new NoteId(next), ct);
                if (parent is null || parent.DeletedAt is not null || parent.WorkspaceId != request.WorkspaceId || !await access.CanRead(parent.OwnerId, parent.WorkspaceId, ct)) throw new AppException("Родительская страница должна быть доступна в том же пространстве.");
                current = parent.ParentId;
            }
        }
        if (request.Revision != note.Revision) throw new AppException("Заметка изменена другим участником. Сохрани черновик и открой актуальную версию.", 409);
        if (note.Revision > 0 && (note.Body != request.Body || note.Title != request.Title)) unit.NoteHistory.Add(new NoteRevision(note, access.UserId));
        if (request.Id is null) unit.Notes.Add(note);
        note.Update(request.Title.Trim(), request.Body, request.Project.Trim(), request.Tags.Trim(), request.Pinned, request.Archived, request.WorkspaceId, request.ParentId);
        try { await unit.Commit(ct); } catch (DbUpdateConcurrencyException) { throw new AppException("Заметка уже изменена. Черновик можно восстановить после обновления.", 409); }
        return new NoteResponse(note, true);
    }
    public async Task<NoteResponse> SetDeleted(Guid id, int revision, bool deleted, CancellationToken ct)
    {
        var note = await unit.Notes.Get(new NoteId(id), ct) ?? throw new AppException("Документ не найден.", 404);
        await access.RequireWrite(note.OwnerId, note.WorkspaceId, ct);
        if (note.Revision != revision) throw new AppException("Документ уже изменён. Обнови страницу перед повторной попыткой.", 409);
        if ((note.DeletedAt is not null) != deleted)
        {
            if (deleted)
            {
                var children = (await unit.Notes.GetAll(ct)).Where(child => child.ParentId == id).ToList();
                foreach (var child in children) await access.RequireWrite(child.OwnerId, child.WorkspaceId, ct);
                foreach (var child in children) child.DetachParent();
            }
            note.SetDeleted(deleted);
        }
        try { await unit.Commit(ct); }
        catch (DbUpdateConcurrencyException) { throw new AppException("Документ уже изменён. Обнови страницу.", 409); }
        return new NoteResponse(note, true);
    }
    public async Task<List<NoteHistoryResponse>> History(Guid id, CancellationToken ct)
    {
        var note = await unit.Notes.Get(new NoteId(id), ct);
        if (note is null || !await access.CanRead(note.OwnerId, note.WorkspaceId, ct)) throw new AppException("Заметка не найдена.", 404);
        return (await unit.NoteHistory.GetAll(ct)).Where(x => x.NoteId == id).OrderByDescending(x => x.Created).Take(100)
            .Select(x => new NoteHistoryResponse(x.Id.Value, x.Title, x.Body, x.Number, x.AuthorId, x.Created)).ToList();
    }
    public async Task<List<NoteResponse>> Import(ImportNotesRequest request, CancellationToken ct)
    {
        await access.RequireWorkspace(request.WorkspaceId, null, ct);
        if (request.Files.Count is < 1 or > 100 || request.Files.Any(x => x.Content.Length > 500_000) || request.Files.Sum(x => (long)x.Content.Length) > 5_000_000)
            throw new AppException("Импортируй до 100 Markdown-файлов общим объёмом до 5 МБ.");
        var result = new List<NoteResponse>();
        foreach (var file in request.Files)
        {
            var name = Path.GetFileNameWithoutExtension(file.Name.Replace('\\', '/'));
            if (string.IsNullOrWhiteSpace(name)) name = "Импортированная заметка";
            var note = new Note(access.UserId);
            note.Update(name[..Math.Min(200, name.Length)], file.Content, "", "импорт", false, false, request.WorkspaceId);
            unit.Notes.Add(note); result.Add(new NoteResponse(note, true));
        }
        await unit.Commit(ct); return result;
    }
    public async Task<byte[]> Export(CancellationToken ct)
    {
        var notes = await GetAll(ct);
        var paths = notes.ToDictionary(x => x.Id, x => $"{(x.WorkspaceId?.ToString() ?? "personal")}/{string.Concat(x.Title.Select(c => char.IsLetterOrDigit(c) || c is ' ' or '-' or '_' ? c : '_')).Trim()}-{x.Id.ToString()[..8]}");
        using var output = new MemoryStream();
        using (var zip = new ZipArchive(output, ZipArchiveMode.Create, leaveOpen: true))
        {
            foreach (var note in notes)
            {
                var entry = zip.CreateEntry(paths[note.Id] + ".md");
                // Keep code examples unchanged; rewrite wiki links to vault-relative paths for Obsidian.
                var body = System.Text.RegularExpressions.Regex.Replace(note.Body, @"```[\s\S]*?```|~~~[\s\S]*?~~~|`[^`\n]*`|\[\[([^\]\n]+)\]\]", match =>
                {
                    if (!match.Value.StartsWith("[[")) return match.Value;
                    var parts = match.Groups[1].Value.Split('|', 2); var target = parts[0];
                    var candidates = notes.Where(x => target.StartsWith("note:") ? "note:" + x.Id == target : x.Title.Equals(target.Trim(), StringComparison.OrdinalIgnoreCase)).ToList();
                    var local = candidates.Where(x => x.WorkspaceId == note.WorkspaceId).ToList();
                    var found = local.Count == 1 ? local[0] : candidates.Count == 1 ? candidates[0] : null;
                    return found is null ? match.Value : $"[[{paths[found.Id]}|{(parts.Length > 1 ? parts[1] : found.Title)}]]";
                });
                using var writer = new StreamWriter(entry.Open(), new UTF8Encoding(false)); writer.Write(body);
            }
        }
        return output.ToArray();
    }
}
