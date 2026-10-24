using Microsoft.AspNetCore.Mvc;
using Workdesk.Services;

namespace Workdesk.Server.Controllers;

[ApiController, Route("api/[controller]")]
public sealed class MergeRequestsController(IMergeRequestService service) : ControllerBase
{
    [HttpGet] public Task<List<MergeRequestResponse>> Get(CancellationToken ct) => service.List(ct);
    [HttpGet("{id:guid}")] public Task<MergeRequestDetailsResponse> Details(Guid id, CancellationToken ct, [FromQuery] int page = 1) => service.Get(id, page, ct);
    [HttpPost("{id:guid}/notifications")]
    public async Task<ActionResult> Notifications(Guid id, SetEnabledRequest request, CancellationToken ct)
    { await service.SetNotifications(id, request.Enabled, ct); return Ok(); }
    [HttpPost("{id:guid}/read")]
    public async Task<ActionResult> Read(Guid id, ReadMergeCommentsRequest request, CancellationToken ct)
    { await service.Read(id, request, ct); return Ok(); }
}
