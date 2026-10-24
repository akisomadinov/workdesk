using System.Net;

namespace Workdesk.Services;

public sealed class TelegramProxyOptions { public string[] Addresses { get; init; } = []; }
public sealed class TelegramUnavailableException() : HttpRequestException("Все прокси Telegram недоступны.");

public sealed class TelegramProxyPool : IDisposable
{
    private readonly HttpMessageInvoker[] routes;
    private readonly bool configured;
    private readonly TimeProvider clock;
    private readonly SemaphoreSlim selection = new(1);
    private readonly DateTimeOffset[] unavailableUntil;
    private int selected = -1;
    private DateTimeOffset validUntil;

    public TelegramProxyPool(TelegramProxyOptions options) : this(options, CreateHandler, TimeProvider.System) { }
    public TelegramProxyPool(TelegramProxyOptions options, Func<Uri?, HttpMessageHandler> createHandler, TimeProvider clock)
    {
        this.clock = clock;
        configured = options.Addresses.Length > 0;
        if (options.Addresses.Length > 4) throw new InvalidOperationException("Укажи не более четырёх прокси Telegram.");
        var addresses = options.Addresses.Select(Parse).ToArray();
        routes = (configured ? addresses : new Uri?[] { null }).Select(uri => new HttpMessageInvoker(createHandler(uri))).ToArray();
        unavailableUntil = new DateTimeOffset[routes.Length];
    }
    private static Uri Parse(string address)
    {
        if (!Uri.TryCreate(address, UriKind.Absolute, out var uri) || uri.Scheme is not ("socks5" or "http" or "https")
            || uri.UserInfo.Length > 0 || uri.AbsolutePath != "/" || uri.Query.Length > 0 || uri.Fragment.Length > 0 || uri.Port is <= 0 or > 65535)
            throw new InvalidOperationException("Прокси Telegram должен иметь адрес socks5/http/https без логина, пароля и пути.");
        return uri;
    }
    private static HttpMessageHandler CreateHandler(Uri? proxy) => new SocketsHttpHandler
    {
        Proxy = proxy is null ? null : new WebProxy(proxy),
        AllowAutoRedirect = false,
        UseCookies = false,
        ConnectTimeout = TimeSpan.FromSeconds(4),
        PooledConnectionLifetime = TimeSpan.FromMinutes(2)
    };

    public async Task<HttpResponseMessage> Send(HttpRequestMessage request, CancellationToken ct)
    {
        if (request.RequestUri is not { Scheme: "https", Host: "api.telegram.org", IsDefaultPort: true })
            throw new HttpRequestException("Этот транспорт предназначен только для Telegram API.");
        var route = await Select(ct);
        try { return await routes[route].SendAsync(request, ct); }
        catch (Exception exception) when (exception is HttpRequestException or OperationCanceledException)
        {
            await Invalidate(route);
            // Never replay a bot request here: sendMessage may already have reached Telegram.
            throw;
        }
    }
    private async Task<int> Select(CancellationToken ct)
    {
        if (!configured) return 0;
        await selection.WaitAsync(ct);
        try
        {
            var now = clock.GetUtcNow();
            if (selected >= 0 && now < validUntil) return selected;
            for (var index = 0; index < routes.Length; index++)
            {
                if (now < unavailableUntil[index]) continue;
                using var timeout = CancellationTokenSource.CreateLinkedTokenSource(ct);
                timeout.CancelAfter(TimeSpan.FromSeconds(4));
                try
                {
                    // A token-free probe verifies the proxy, remote DNS, TLS, and Telegram reachability.
                    using var probe = new HttpRequestMessage(HttpMethod.Head, "https://api.telegram.org/");
                    using var response = await routes[index].SendAsync(probe, timeout.Token);
                    if ((int)response.StatusCode is >= 200 and < 400)
                    {
                        selected = index; validUntil = clock.GetUtcNow().AddSeconds(15); return index;
                    }
                }
                catch (Exception exception) when (!ct.IsCancellationRequested && (exception is HttpRequestException or OperationCanceledException)) { }
                unavailableUntil[index] = clock.GetUtcNow().AddSeconds(30);
            }
            selected = -1;
            throw new TelegramUnavailableException();
        }
        finally { selection.Release(); }
    }
    private async Task Invalidate(int index)
    {
        await selection.WaitAsync();
        try { unavailableUntil[index] = clock.GetUtcNow().AddSeconds(30); if (selected == index) selected = -1; }
        finally { selection.Release(); }
    }
    public void Dispose() { foreach (var route in routes) route.Dispose(); selection.Dispose(); }
}

public sealed class TelegramProxyHandler(TelegramProxyPool pool) : HttpMessageHandler
{
    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken) => pool.Send(request, cancellationToken);
}
