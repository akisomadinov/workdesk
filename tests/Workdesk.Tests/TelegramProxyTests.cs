using System.Net;
using Workdesk.Services;
using Xunit;

namespace Workdesk.Tests;

public sealed class TelegramProxyTests
{
    [Fact]
    public async Task FailedPrimaryUsesBackupAndRecoveredPrimaryIsPreferredAgain()
    {
        var clock = new Clock();
        var first = new Route { Available = false }; var second = new Route();
        using var pool = Pool(first, second, clock);
        using var firstRequest = Request(); using var firstResponse = await pool.Send(firstRequest, default);
        Assert.Equal(0, first.Sends); Assert.Equal(1, second.Sends);
        Assert.Equal(1, first.Probes); Assert.Equal(1, second.Probes);
        using var secondRequest = Request(); using var secondResponse = await pool.Send(secondRequest, default);
        Assert.Equal(1, first.Probes); Assert.Equal(1, second.Probes); Assert.Equal(2, second.Sends);
        first.Available = true; clock.Advance(TimeSpan.FromSeconds(31));
        using var thirdRequest = Request(); using var thirdResponse = await pool.Send(thirdRequest, default);
        Assert.Equal(2, first.Probes); Assert.Equal(1, first.Sends); Assert.Equal(2, second.Sends);
    }
    [Fact]
    public async Task AmbiguousSendIsNeverReplayedThroughBackup()
    {
        var first = new Route { FailSend = true }; var second = new Route();
        using var pool = Pool(first, second, new Clock());
        using var request = Request(); await Assert.ThrowsAsync<HttpRequestException>(() => pool.Send(request, default));
        Assert.Equal(1, first.Sends); Assert.Equal(0, second.Sends);
        using var next = Request(); using var response = await pool.Send(next, default);
        Assert.Equal(1, first.Sends); Assert.Equal(1, second.Sends);
    }
    [Fact]
    public async Task AllUnavailableMeansNoBotRequestWasSentAndNoDirectFallback()
    {
        var first = new Route { Available = false }; var second = new Route { Available = false };
        using var pool = Pool(first, second, new Clock());
        using var request = Request(); await Assert.ThrowsAsync<TelegramUnavailableException>(() => pool.Send(request, default));
        Assert.Equal(1, first.Probes); Assert.Equal(1, second.Probes);
        Assert.Equal(0, first.Sends); Assert.Equal(0, second.Sends);
    }
    [Fact]
    public async Task TransportRejectsOtherHostsAndCancellation()
    {
        var first = new Route(); var second = new Route();
        using var pool = Pool(first, second, new Clock());
        using var foreign = new HttpRequestMessage(HttpMethod.Post, "https://foreign.invalid/");
        await Assert.ThrowsAsync<HttpRequestException>(() => pool.Send(foreign, default));
        using var canceled = new CancellationTokenSource(); canceled.Cancel();
        using var request = Request(); await Assert.ThrowsAnyAsync<OperationCanceledException>(() => pool.Send(request, canceled.Token));
        Assert.Equal(0, first.Probes); Assert.Equal(0, second.Probes);
    }
    [Fact]
    public async Task UnconfiguredTransportKeepsNormalNetworkBehaviorWithoutProbes()
    {
        var route = new Route();
        using var pool = new TelegramProxyPool(new TelegramProxyOptions(), uri => { Assert.Null(uri); return route; }, new Clock());
        using var request = Request(); using var response = await pool.Send(request, default);
        Assert.Equal(0, route.Probes); Assert.Equal(1, route.Sends);
    }
    private static TelegramProxyPool Pool(Route first, Route second, Clock clock) => new(
        new TelegramProxyOptions { Addresses = ["socks5://127.0.0.1:11090", "socks5://127.0.0.1:11091"] },
        uri => uri!.Port == 11090 ? first : second, clock);
    private static HttpRequestMessage Request() => new(HttpMethod.Post, "https://api.telegram.org/botfixture/sendMessage") { Content = new StringContent("private fixture") };
    private sealed class Clock : TimeProvider
    {
        private DateTimeOffset now = DateTimeOffset.UtcNow;
        public override DateTimeOffset GetUtcNow() => now;
        public void Advance(TimeSpan duration) => now += duration;
    }
    private sealed class Route : HttpMessageHandler
    {
        public bool Available { get; set; } = true;
        public bool FailSend { get; init; }
        public int Probes { get; private set; }
        public int Sends { get; private set; }
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
        {
            if (request.Method == HttpMethod.Head)
            {
                Probes++;
                Assert.Equal("https://api.telegram.org/", request.RequestUri!.AbsoluteUri);
                Assert.Null(request.Content); Assert.Empty(request.Headers);
                if (!Available) throw new HttpRequestException("Fixture proxy is down");
            }
            else { Sends++; if (FailSend) throw new HttpRequestException("Ambiguous fixture failure after send"); }
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK));
        }
    }
}
