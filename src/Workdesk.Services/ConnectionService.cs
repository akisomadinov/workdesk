using System.Collections.Concurrent;
using System.Text.Json;
using Workdesk.Data;

namespace Workdesk.Services;

public sealed class SyncLocks
{
    private readonly ConcurrentDictionary<Guid, SemaphoreSlim> locks = new();
    public SemaphoreSlim For(Guid id) => locks.GetOrAdd(id, _ => new SemaphoreSlim(1));
}
public interface IConnectionService
{
    Task<List<ConnectionResponse>> GetAll(CancellationToken ct);
    Task<ConnectionResponse> Create(CreateConnectionRequest request, CancellationToken ct);
    Task<ConnectionResponse> SetToken(Guid id, string token, CancellationToken ct);
    Task<ConnectionResponse> SetEnabled(Guid id, bool enabled, CancellationToken ct);
    Task<ConnectionResponse> Sync(Guid id, CancellationToken ct);
    Task<ConnectionResponse> SetScope(Guid id, SetScopeRequest request, CancellationToken ct);
}
public sealed class ConnectionService(IUnitOfWork unit, ISecretStore secrets, IIssueClient client, SyncLocks locks, IAccessPolicy? access = null, INotificationService? notifications = null, IActivityClient? activities = null, RuntimeOptions? runtime = null) : IConnectionService
{
    private readonly IAccessPolicy rights = access ?? new AccessPolicy(unit, new LocalActor());
    public async Task<List<ConnectionResponse>> GetAll(CancellationToken ct) =>
        (await unit.Connections.GetAll(ct)).Where(x => x.OwnerId == rights.UserId).OrderBy(x => x.Created).Select(View).ToList();

    public async Task<ConnectionResponse> Create(CreateConnectionRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Name) || request.Name.Length > 100) throw new AppException("Укажи название подключения, до 100 символов.");
        if (request.Provider is not ("gitlab" or "github")) throw new AppException("Выбери GitLab или GitHub.");
        if (!Uri.TryCreate(request.ApiUrl.Trim().TrimEnd('/') + "/", UriKind.Absolute, out var uri)
            || uri.UserInfo.Length > 0 || uri.Query.Length > 0 || uri.Fragment.Length > 0
            || (uri.Scheme != "https" && !(uri.Scheme == "http" && uri.IsLoopback)))
            throw new AppException("Укажи HTTPS-адрес API без токена и параметров: например https://gitlab.company.ru/api/v4/.");
        var connection = new Connection(request.Name.Trim(), request.Provider, uri.AbsoluteUri, request.RequiresVpn);
        RequireAllowedHost(uri);
        ValidateProjects(request.Projects);
        if (request.WatchMergeRequests && string.IsNullOrWhiteSpace(request.Projects)) throw new AppException("Для комментариев MR/PR выбери конкретные проекты.");
        connection.SetScope(rights.UserId, request.Projects.Trim(), request.WatchMergeRequests);
        if (!string.IsNullOrWhiteSpace(request.Token)) { ValidateToken(request.Token); secrets.Set(connection.Id.Value, request.Token.Trim()); }
        unit.Connections.Add(connection); await unit.Commit(ct);
        return View(connection);
    }
    public async Task<ConnectionResponse> SetToken(Guid id, string token, CancellationToken ct)
    {
        var connection = await Find(id, ct); ValidateToken(token); secrets.Set(id, token.Trim()); return View(connection);
    }
    public async Task<ConnectionResponse> SetEnabled(Guid id, bool enabled, CancellationToken ct)
    {
        var connection = await Find(id, ct); connection.SetEnabled(enabled); await unit.Commit(ct); return View(connection);
    }
    public async Task<ConnectionResponse> SetScope(Guid id, SetScopeRequest request, CancellationToken ct)
    {
        var connection = await Find(id, ct); ValidateProjects(request.Projects);
        if (request.WatchMergeRequests && string.IsNullOrWhiteSpace(request.Projects)) throw new AppException("Для комментариев MR/PR выбери конкретные проекты.");
        connection.SetScope(connection.OwnerId, request.Projects.Trim(), request.WatchMergeRequests);
        await unit.Commit(ct); return View(connection);
    }
    public async Task<ConnectionResponse> Sync(Guid id, CancellationToken ct)
    {
        var semaphore = locks.For(id);
        if (!await semaphore.WaitAsync(0, ct)) throw new AppException("Это подключение уже синхронизируется. Остальные доступны.", 409);
        try
        {
            var connection = await Find(id, ct);
            RequireAllowedHost(new Uri(connection.ApiUrl));
            if (!connection.Enabled) throw new AppException("Подключение приостановлено.");
            var started = DateTime.UtcNow;
            try
            {
                var token = secrets.Get(id);
                if (string.IsNullOrWhiteSpace(token)) throw new SourceException("auth", "Добавь токен для загрузки назначенных тебе задач.");
                using var timeout = CancellationTokenSource.CreateLinkedTokenSource(ct);
                timeout.CancelAfter(TimeSpan.FromMinutes(2));
                var issues = await client.Fetch(connection, token, timeout.Token);
                foreach (var issue in issues.DistinctBy(x => x.Key))
                {
                    var item = await unit.Tasks.FindExternal(connection.Id, issue.Key, ct);
                    if (item is null)
                    {
                        item = new WorkItem(issue.Title, issue.Project, issue.Description); item.SetOwner(connection.OwnerId); unit.Tasks.Add(item);
                        if (connection.LastSuccess is not null && notifications is not null) await notifications.Record(connection.OwnerId, $"{id}:task:{issue.Key}", "Новая задача: " + issue.Title, issue.Url, "task", ct);
                    }
                    item.Import(connection.Id, issue.Key, issue.Title, issue.Project, issue.Description, issue.Url, issue.State, issue.Updated);
                    item.SetExternalMilestone(issue.Milestone);
                }
                if (activities is not null && notifications is not null)
                    foreach (var activity in await activities.Fetch(connection, token, timeout.Token))
                        await notifications.Record(connection.OwnerId, activity.Key, activity.Title, activity.Url, "comment", ct);
                connection.Record("ok", $"Синхронизация завершена. Обработано задач: {issues.Count}.", issues.Count, started);
            }
            catch (SourceException exception) { connection.Record(exception.Health, exception.Message); }
            catch (OperationCanceledException) when (!ct.IsCancellationRequested)
            { connection.Record("offline", "Сервер не ответил вовремя. Проверь сеть или VPN. Сохранённые задачи доступны."); }
            catch (HttpRequestException)
            { connection.Record("offline", "Нет соединения с сервером. Проверь VPN, сеть и доверие к сертификату. Сохранённые задачи доступны."); }
            catch (Exception exception) when (exception is JsonException or InvalidOperationException or KeyNotFoundException or FormatException)
            { connection.Record("error", "Не удалось прочитать ответ сервера. Проверь адрес API и совместимость его версии."); }
            await unit.Commit(ct); return View(connection);
        }
        finally { semaphore.Release(); }
    }
    private Task<Connection> Find(Guid id, CancellationToken ct) => FindCore(id, ct);
    private async Task<Connection> FindCore(Guid id, CancellationToken ct)
    {
        var connection = await unit.Connections.Get(new ConnectionId(id), ct);
        if (connection is null || (!rights.IsSystem && connection.OwnerId != rights.UserId)) throw new AppException("Подключение не найдено.", 404);
        return connection;
    }
    private ConnectionResponse View(Connection value) => new(value, secrets.Has(value.Id.Value));
    private static void ValidateToken(string token)
    {
        if (string.IsNullOrWhiteSpace(token) || token.Length > 4096 || token.Any(char.IsControl)) throw new AppException("Укажи корректный токен без переносов строк.");
    }
    private static void ValidateProjects(string projects)
    {
        if (projects.Length > 10000 || projects.Split(['\n', ','], StringSplitOptions.RemoveEmptyEntries).Length > 50 || projects.Any(c => char.IsControl(c) && c is not ('\n' or '\r' or '\t')))
            throw new AppException("Укажи до 50 проектов, по одному в строке.");
    }
    private void RequireAllowedHost(Uri uri)
    {
        if (runtime?.SharedMode == true && !runtime.AllowedSourceHosts.Contains(uri.Authority, StringComparer.OrdinalIgnoreCase))
            throw new AppException("Адрес API не входит в список разрешённых серверов приложения.", 403);
    }
}
