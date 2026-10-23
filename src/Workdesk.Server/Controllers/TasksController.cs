using Microsoft.AspNetCore.Mvc;
using Workdesk.Services;

namespace Workdesk.Server.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class TasksController(ITaskService service) : ControllerBase
{
    [ProducesResponseType<List<WorkItemResponse>>(StatusCodes.Status200OK)]
    [HttpGet]
    public Task<List<WorkItemResponse>> Get(CancellationToken ct) => service.GetAll(ct);

    [ProducesResponseType<WorkItemResponse>(StatusCodes.Status200OK)]
    [HttpPost("save")]
    public Task<WorkItemResponse> Save(SaveTaskRequest request, CancellationToken ct) => service.Save(request, ct);
    [HttpGet("trash")]
    public Task<List<WorkItemResponse>> Trash(CancellationToken ct) => service.GetDeleted(ct);

    [HttpDelete("{id:guid}")]
    public Task<WorkItemResponse> Delete(Guid id, [FromQuery] int revision, CancellationToken ct) => service.SetDeleted(id, revision, true, ct);

    [HttpPost("{id:guid}/restore")]
    public Task<WorkItemResponse> Restore(Guid id, [FromQuery] int revision, CancellationToken ct) => service.SetDeleted(id, revision, false, ct);
}
