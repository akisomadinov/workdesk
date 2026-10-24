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
    [HttpDelete] public async Task<ActionResult> Delete(CancellationToken ct) { await service.Disconnect(ct); return Ok(); }
}
