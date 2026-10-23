using Microsoft.EntityFrameworkCore;
using Serilog;
using Workdesk.Data;
using Workdesk.Services;

namespace Workdesk.Server.Setup;

public sealed class SyncWorker(IServiceScopeFactory scopes) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromSeconds(30));
        try
        {
            while (await timer.WaitForNextTickAsync(stoppingToken))
            {
                using var scope = scopes.CreateScope();
                var unit = scope.ServiceProvider.GetRequiredService<IUnitOfWork>();
                var sources = (await unit.Connections.GetAll(stoppingToken)).Where(x => x.Enabled &&
                    (x.LastAttempt is null || x.LastAttempt < DateTime.UtcNow.AddMinutes(-5))).ToList();
                // Each source owns its scope/DbContext. An unavailable VPN doesn't serialize other hosts.
                await Task.WhenAll(sources.Select(x => Sync(x.Id.Value, stoppingToken)));
                await Deliver(stoppingToken);
            }
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { }
    }
    private async Task Deliver(CancellationToken ct)
    {
        try { using var scope = scopes.CreateScope(); await scope.ServiceProvider.GetRequiredService<INotificationService>().Deliver(ct); }
        catch (OperationCanceledException) when (ct.IsCancellationRequested) { }
        catch (Exception) { Log.Warning("Не удалось завершить доставку уведомлений."); }
    }
    private async Task Sync(Guid id, CancellationToken ct)
    {
        try
        {
            using var scope = scopes.CreateScope();
            await scope.ServiceProvider.GetRequiredService<IConnectionService>().Sync(id, ct);
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested) { }
        catch (AppException) { }
        catch (DbUpdateException) { Log.Warning("Не удалось записать результат синхронизации {ConnectionId}", id); }
        catch (Exception) { Log.Warning("Не удалось завершить синхронизацию {ConnectionId}", id); }
    }
}
