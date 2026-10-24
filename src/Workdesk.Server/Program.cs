using Microsoft.AspNetCore.Diagnostics;
using Microsoft.EntityFrameworkCore;
using Serilog;
using Workdesk.Data;
using Workdesk.Server.Setup;
using Workdesk.Services;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.HttpOverrides;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.DataProtection;

var builder = WebApplication.CreateBuilder(args);
var runtime = new RuntimeOptions { SharedMode = builder.Configuration.GetValue<bool>("Workdesk:SharedMode"), AllowedSourceHosts = (builder.Configuration["Workdesk:AllowedSourceHosts"] ?? "").Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries) };
builder.WebHost.UseUrls(Environment.GetEnvironmentVariable("WORKDESK_URLS") ?? "http://127.0.0.1:5284");
builder.WebHost.ConfigureKestrel(options => options.Limits.MaxRequestBodySize = 6_000_000);
builder.Services.AddSingleton(runtime);
builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme).AddCookie(options =>
{
    options.Cookie.Name = "Workdesk.Session"; options.Cookie.HttpOnly = true; options.Cookie.SameSite = SameSiteMode.Strict;
    options.Cookie.SecurePolicy = runtime.SharedMode ? CookieSecurePolicy.Always : CookieSecurePolicy.SameAsRequest;
    options.ExpireTimeSpan = TimeSpan.FromHours(8); options.SlidingExpiration = true;
});
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy("auth", context => RateLimitPartition.GetFixedWindowLimiter(
        context.Connection.RemoteIpAddress?.ToString() ?? "local", _ => new FixedWindowRateLimiterOptions { PermitLimit = 10, Window = TimeSpan.FromMinutes(1), QueueLimit = 0 }));
});
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    foreach (var address in (builder.Configuration["Workdesk:TrustedProxies"] ?? "").Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
        options.KnownProxies.Add(System.Net.IPAddress.Parse(address));
});
var dataDirectory = Environment.GetEnvironmentVariable("WORKDESK_DATA_DIR")
    ?? Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Workdesk");
Directory.CreateDirectory(dataDirectory);
builder.Services.AddSingleton(new TelegramBotOptions { TokenFile = Environment.GetEnvironmentVariable("WORKDESK_TELEGRAM_BOT_TOKEN_FILE")
    ?? Path.Combine(dataDirectory, "secrets", "telegram-bot-token") });
var proxyFile = Environment.GetEnvironmentVariable("WORKDESK_TELEGRAM_PROXIES_FILE") ?? Path.Combine(dataDirectory, "secrets", "telegram-proxies");
var telegramProxies = Environment.GetEnvironmentVariable("WORKDESK_TELEGRAM_PROXIES") ?? (File.Exists(proxyFile) ? File.ReadAllText(proxyFile) : "");
builder.Services.AddSingleton(new TelegramProxyOptions { Addresses = telegramProxies.Split(['\n', ','], StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries) });
var instanceId = Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(dataDirectory)))[..12];
builder.Services.AddDataProtection().SetApplicationName("Workdesk-" + instanceId).PersistKeysToFileSystem(new DirectoryInfo(Path.Combine(dataDirectory, "keys")));
builder.Services.Configure<CookieAuthenticationOptions>(CookieAuthenticationDefaults.AuthenticationScheme, cookie => cookie.Cookie.Name = "Workdesk.Session." + instanceId);
builder.Services.AddSingleton(new SecretStoreOptions { Directory = Path.Combine(dataDirectory, "secrets"), MasterKeyFile = Environment.GetEnvironmentVariable("WORKDESK_MASTER_KEY_FILE") });
if (runtime.SharedMode && (runtime.AllowedSourceHosts.Length == 0 || string.IsNullOrWhiteSpace(builder.Configuration["AllowedHosts"]) || builder.Configuration["AllowedHosts"] == "*"))
    throw new InvalidOperationException("Для командного режима задай AllowedHosts и Workdesk__AllowedSourceHosts.");
if (runtime.SharedMode && !OperatingSystem.IsMacOS() && string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("WORKDESK_MASTER_KEY_FILE")))
    throw new InvalidOperationException("Для командного режима нужен WORKDESK_MASTER_KEY_FILE (32 байта).");
builder.Services.AddSingleton(new QueueOptions { Address = builder.Configuration["Workdesk:Redis"], PasswordFile = Environment.GetEnvironmentVariable("WORKDESK_REDIS_PASSWORD_FILE"), Prefix = "workdesk:" + Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(dataDirectory)))[..12] });
if (!OperatingSystem.IsWindows()) File.SetUnixFileMode(dataDirectory, UnixFileMode.UserRead | UnixFileMode.UserWrite | UnixFileMode.UserExecute);
builder.Host.UseSerilog((_, config) => config.MinimumLevel.Warning().WriteTo.Console());
builder.Services.AddDataDependencies(Path.Combine(dataDirectory, "workdesk.db"));
builder.Services.AddServiceDependencies();
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options => options.CustomOperationIds(api =>
    api.ActionDescriptor.RouteValues.TryGetValue("controller", out var controller)
        && api.ActionDescriptor.RouteValues.TryGetValue("action", out var action)
        ? controller + action : "App" + api.RelativePath?.Replace("/", "")));
builder.Services.AddProblemDetails();
var app = builder.Build();
if (runtime.SharedMode) app.UseForwardedHeaders();
app.UseAuthentication();
app.UseRateLimiter();
app.UseExceptionHandler(handler => handler.Run(async context =>
{
    var exception = context.Features.Get<IExceptionHandlerFeature>()?.Error;
    var status = exception is AppException known ? known.Status : StatusCodes.Status500InternalServerError;
    await Results.Problem(statusCode: status, title: exception is AppException ? exception.Message : "Не удалось выполнить действие. Повтори попытку.").ExecuteAsync(context);
}));
app.Use(async (context, next) =>
{
    if (!runtime.SharedMode && context.Request.Host.Host is not ("127.0.0.1" or "localhost" or "[::1]"))
    { context.Response.StatusCode = 403; return; }
    // Browsers cannot send this header cross-origin without a CORS preflight. No CORS is enabled.
    if (context.Request.Path.StartsWithSegments("/api") && context.Request.Method is not ("GET" or "HEAD")
        && context.Request.Headers["X-Workdesk"] != "1")
    { await Results.Problem(statusCode: 403, title: "Открой приложение с локального адреса.").ExecuteAsync(context); return; }
    context.Response.Headers["X-Content-Type-Options"] = "nosniff";
    context.Response.Headers["Referrer-Policy"] = "no-referrer";
    context.Response.Headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'";
    context.Response.Headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()";
    if (context.Request.Path.StartsWithSegments("/api")) context.Response.Headers.CacheControl = "no-store";
    if (runtime.RequireAuthentication && context.Request.Path.StartsWithSegments("/api") && context.Request.Path != "/api/health")
    {
        if (runtime.SharedMode && !context.Request.IsHttps) { await Results.Problem(statusCode: 403, title: "Командный сервер требует HTTPS.").ExecuteAsync(context); return; }
        if (!context.Request.Path.StartsWithSegments("/api/Auth") && context.User.Identity?.IsAuthenticated != true)
        { await Results.Problem(statusCode: 401, title: "Войди в свою учётную запись.").ExecuteAsync(context); return; }
    }
    await next();
});
app.UseSwagger();
app.UseDefaultFiles();
app.UseStaticFiles();
app.MapControllers();
app.MapGet("/api/health", () => new { status = "ok", version = "0.9.0" });
app.MapGet("/api/backup", async (ITaskService tasks, IConnectionService connections, INoteService notes, CancellationToken ct) =>
    Results.Json(new { Version = 3, ExportedAt = DateTime.UtcNow, Tasks = await tasks.GetAll(ct), Connections = await connections.GetAll(ct), Notes = await notes.GetAll(ct), DeletedTasks = await tasks.GetDeleted(ct), DeletedNotes = await notes.GetDeleted(ct) }));
app.MapFallbackToFile("index.html");
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<WorkdeskContext>();
    await db.Database.MigrateAsync();
    await db.Database.ExecuteSqlRawAsync("PRAGMA journal_mode=WAL;");
    runtime.LocalAccountConfigured = await db.Set<Account>().AnyAsync(x => x.Id == new UserId(LocalIdentity.OwnerId));
    if (runtime.SharedMode && !runtime.LocalAccountConfigured)
        throw new InvalidOperationException("Сначала создай учётную запись владельца в локальном режиме, затем включи командный режим.");
}
app.Run();

public partial class Program;
