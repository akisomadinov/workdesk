using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Workdesk.Data;
using Workdesk.Services;

namespace Workdesk.Server.Controllers;

[ApiController, Route("api/[controller]")]
public sealed class AuthController(ITeamService team) : ControllerBase
{
    [HttpGet("session")]
    public Task<SessionResponse> Session(CancellationToken ct) => team.Session(ct);
    [EnableRateLimiting("auth")]
    [HttpPost("setup")]
    public async Task<SessionResponse> Setup(CredentialsRequest request, CancellationToken ct)
    { await SignIn(await team.Setup(request, ct)); return await team.Session(ct); }
    [EnableRateLimiting("auth")]
    [HttpPost("login")]
    public async Task<SessionResponse> Login(CredentialsRequest request, CancellationToken ct)
    { await SignIn(await team.Login(request, ct)); return await team.Session(ct); }
    [EnableRateLimiting("auth")]
    [HttpPost("accept")]
    public async Task<SessionResponse> Accept(AcceptInvitationRequest request, CancellationToken ct)
    { await SignIn(await team.Accept(request, ct)); return await team.Session(ct); }
    [HttpPost("logout")]
    public async Task<ActionResult> Logout() { await HttpContext.SignOutAsync(); return Ok(); }
    private Task SignIn(Account account)
    {
        var principal = new ClaimsPrincipal(new ClaimsIdentity([
            new Claim(ClaimTypes.NameIdentifier, account.Id.Value.ToString()), new Claim(ClaimTypes.Name, account.Name)
        ], CookieAuthenticationDefaults.AuthenticationScheme));
        HttpContext.User = principal;
        return HttpContext.SignInAsync(principal, new AuthenticationProperties { IsPersistent = false });
    }
}
