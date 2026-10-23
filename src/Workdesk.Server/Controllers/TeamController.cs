using Microsoft.AspNetCore.Mvc;
using Workdesk.Services;
namespace Workdesk.Server.Controllers;

[ApiController, Route("api/[controller]")]
public sealed class TeamController(ITeamService team) : ControllerBase
{
    [HttpGet] public Task<List<WorkspaceResponse>> Get(CancellationToken ct) => team.List(ct);
    [HttpPost("save")] public Task<WorkspaceResponse> Create(CreateWorkspaceRequest request, CancellationToken ct) => team.Create(request.Name, ct);
    [HttpPost("{id:guid}/invite")] public Task<InvitationResponse> Invite(Guid id, InviteRequest request, CancellationToken ct) => team.Invite(id, request.Role, ct, request.Login);
    [HttpGet("invitations")] public Task<List<PendingInvitationResponse>> Pending(CancellationToken ct) => team.Pending(ct);
    [HttpPost("invitations/{id:guid}/accept")] public async Task<ActionResult> Accept(Guid id, CancellationToken ct) { await team.AcceptDirect(id, ct); return Ok(); }
    [HttpPost("{id:guid}/members/{user:guid}")]
    public async Task<ActionResult> Role(Guid id, Guid user, RoleRequest request, CancellationToken ct) { await team.SetRole(id, user, request.Role, ct); return Ok(); }
}
