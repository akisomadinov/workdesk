using Microsoft.EntityFrameworkCore;
using Workdesk.Data;
using Workdesk.Services;

namespace Workdesk.Server.Setup;

public static class Dependencies
{
    public static IServiceCollection AddDataDependencies(this IServiceCollection services, string path)
    {
        services.AddDbContext<WorkdeskContext>(options => options.UseSqlite($"Data Source={path};Default Timeout=30;Foreign Keys=True"));
        services.AddScoped<ITaskRepository, TaskRepository>();
        services.AddScoped<IConnectionRepository, ConnectionRepository>();
        services.AddScoped<IUnitOfWork, UnitOfWork>();
        return services;
    }
    public static IServiceCollection AddServiceDependencies(this IServiceCollection services)
    {
        services.AddTransient<ITaskService, TaskService>();
        services.AddTransient<IConnectionService, ConnectionService>();
        services.AddTransient<IIssueClient, IssueClient>();
        services.AddTransient<IMergeRequestClient, MergeRequestClient>();
        services.AddTransient<IMergeRequestService, MergeRequestService>();
        services.AddTransient<INoteService, NoteService>();
        services.AddTransient<ITeamService, TeamService>();
        services.AddTransient<IAccessPolicy, AccessPolicy>();
        services.AddTransient<ICurrentActor, CurrentActor>();
        services.AddTransient<INotificationService, NotificationService>();
        services.AddTransient<ITelegramLinkService, TelegramLinkService>();
        services.AddSingleton<ISharedTelegramBot, SharedTelegramBot>();
        services.AddSingleton<TelegramProxyPool>();
        services.AddHttpClient("telegram-poll", client => client.Timeout = TimeSpan.FromSeconds(30))
            .ConfigurePrimaryHttpMessageHandler(provider => new TelegramProxyHandler(provider.GetRequiredService<TelegramProxyPool>())).RemoveAllLoggers();
        services.AddHostedService<TelegramWorker>();
        services.AddHttpContextAccessor();
        services.AddHttpClient("telegram", client => client.Timeout = TimeSpan.FromSeconds(15))
            .ConfigurePrimaryHttpMessageHandler(provider => new TelegramProxyHandler(provider.GetRequiredService<TelegramProxyPool>())).RemoveAllLoggers();
        services.AddSingleton<ISecretStore, SecretStore>();
        services.AddSingleton<SyncLocks>();
        services.AddSingleton<IDeliveryQueue, RedisDeliveryQueue>();
        services.AddHttpClient("issues", client =>
        {
            client.Timeout = TimeSpan.FromSeconds(25);
            client.DefaultRequestHeaders.UserAgent.ParseAdd("Workdesk/0.2");
        }).ConfigurePrimaryHttpMessageHandler(() => new HttpClientHandler { AllowAutoRedirect = false, UseCookies = false });
        services.AddHostedService<SyncWorker>();
        return services;
    }
}
