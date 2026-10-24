using Serilog;
using Workdesk.Services;

namespace Workdesk.Server.Setup;

public sealed class TelegramWorker(IServiceScopeFactory scopes, ISharedTelegramBot bot) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!bot.Configured) return;
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = scopes.CreateScope();
                await scope.ServiceProvider.GetRequiredService<ITelegramLinkService>().Poll(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { break; }
            catch (Exception)
            {
                Log.Warning("Не удалось проверить привязку Telegram. Повтор через 30 секунд.");
                try { await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken); } catch (OperationCanceledException) { break; }
            }
        }
    }
}
