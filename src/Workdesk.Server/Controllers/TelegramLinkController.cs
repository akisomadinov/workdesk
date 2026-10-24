using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Workdesk.Services;

namespace Workdesk.Server.Controllers;

[ApiController, Route("api/[controller]")]
public sealed class TelegramLinkController(ITelegramLinkService service) : ControllerBase
{
    [HttpGet] public Task<TelegramLinkState> Get(CancellationToken ct) => service.State(ct);
    [EnableRateLimiting("auth"), HttpPost]
    public Task<TelegramLinkResponse> Create(CancellationToken ct) => service.Begin(ct);
    [EnableRateLimiting("auth"), HttpPost("confirm")]
    public async Task<ActionResult> Confirm(ConfirmTelegramRequest request, CancellationToken ct) { await service.Confirm(request, ct); return Ok(); }
    [HttpPost("cancel")]
    public async Task<ActionResult> Cancel(CancellationToken ct) { await service.Cancel(ct); return Ok(); }
    [HttpDelete] public async Task<ActionResult> Delete(CancellationToken ct) { await service.Disconnect(ct); return Ok(); }
}
