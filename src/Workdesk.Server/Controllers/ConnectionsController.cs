using Microsoft.AspNetCore.Mvc;
using Workdesk.Services;

namespace Workdesk.Server.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class ConnectionsController(IConnectionService service) : ControllerBase
{
    [ProducesResponseType<List<ConnectionResponse>>(StatusCodes.Status200OK)]
    [HttpGet]
    public Task<List<ConnectionResponse>> Get(CancellationToken ct) => service.GetAll(ct);

    [ProducesResponseType<ConnectionResponse>(StatusCodes.Status200OK)]
    [HttpPost("save")]
    public Task<ConnectionResponse> Create(CreateConnectionRequest request, CancellationToken ct) => service.Create(request, ct);

    [ProducesResponseType<ConnectionResponse>(StatusCodes.Status200OK)]
    [HttpPost("{id:guid}/token")]
    public Task<ConnectionResponse> Token(Guid id, SetTokenRequest request, CancellationToken ct) => service.SetToken(id, request.Token, ct);

    [ProducesResponseType<ConnectionResponse>(StatusCodes.Status200OK)]
    [HttpPost("{id:guid}/enabled")]
    public Task<ConnectionResponse> Enable(Guid id, SetEnabledRequest request, CancellationToken ct) => service.SetEnabled(id, request.Enabled, ct);
    [HttpPost("{id:guid}/scope")]
    public Task<ConnectionResponse> Scope(Guid id, SetScopeRequest request, CancellationToken ct) => service.SetScope(id, request, ct);

    [ProducesResponseType<ConnectionResponse>(StatusCodes.Status200OK)]
    [HttpPost("{id:guid}/sync")]
    public Task<ConnectionResponse> Sync(Guid id, CancellationToken ct) => service.Sync(id, ct);
}
