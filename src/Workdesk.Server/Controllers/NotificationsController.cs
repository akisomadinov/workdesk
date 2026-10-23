using Microsoft.AspNetCore.Mvc;
using Workdesk.Services;
namespace Workdesk.Server.Controllers;

[ApiController, Route("api/[controller]")]
public sealed class NotificationsController(INotificationService notifications) : ControllerBase
{
    [HttpGet] public Task<List<NotificationResponse>> Get(CancellationToken ct) => notifications.List(ct);
    [HttpPost("{id:guid}/read")]
    public async Task<ActionResult> Read(Guid id, CancellationToken ct) { await notifications.Read(id, ct); return Ok(); }
    [HttpGet("telegram")] public Task<TelegramResponse> Telegram(CancellationToken ct) => notifications.Settings(ct);
    [HttpPost("telegram")] public Task<TelegramResponse> Configure(SaveTelegramRequest request, CancellationToken ct) => notifications.Configure(request, ct);
}
