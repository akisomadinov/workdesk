using Microsoft.AspNetCore.Mvc;
using Workdesk.Services;
namespace Workdesk.Server.Controllers;

[ApiController, Route("api/[controller]")]
public sealed class NotesController(INoteService notes) : ControllerBase
{
    [HttpGet] public Task<List<NoteResponse>> Get(CancellationToken ct) => notes.GetAll(ct);
    [HttpPost("save")] public Task<NoteResponse> Save(SaveNoteRequest request, CancellationToken ct) => notes.Save(request, ct);
    [HttpGet("{id:guid}/history")] public Task<List<NoteHistoryResponse>> History(Guid id, CancellationToken ct) => notes.History(id, ct);
    [HttpPost("import")]
    [RequestSizeLimit(12_000_000)]
    public Task<List<NoteResponse>> Import(ImportNotesRequest request, CancellationToken ct) => notes.Import(request, ct);
    [HttpGet("export")]
    public async Task<FileContentResult> Export(CancellationToken ct) => File(await notes.Export(ct), "application/zip", "workdesk-notes.zip");
    [HttpGet("trash")] public Task<List<NoteResponse>> Trash(CancellationToken ct) => notes.GetDeleted(ct);
    [HttpDelete("{id:guid}")] public Task<NoteResponse> Delete(Guid id, [FromQuery] int revision, CancellationToken ct) => notes.SetDeleted(id, revision, true, ct);
    [HttpPost("{id:guid}/restore")] public Task<NoteResponse> Restore(Guid id, [FromQuery] int revision, CancellationToken ct) => notes.SetDeleted(id, revision, false, ct);
}
