using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Identity;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Workdesk.Data;

namespace Workdesk.Services;

public sealed class CredentialsRequest { public string Login { get; set; } = ""; public string Name { get; set; } = ""; public string Email { get; set; } = ""; public string Password { get; set; } = ""; }
public sealed class AcceptInvitationRequest { public string Login { get; set; } = ""; public string Token { get; set; } = ""; public string Name { get; set; } = ""; public string Email { get; set; } = ""; public string Password { get; set; } = ""; }
public sealed class JoinInvitationRequest { public string Token { get; set; } = ""; }
public sealed class CreateWorkspaceRequest { public string Name { get; set; } = ""; }
public sealed class InviteRequest { public string Login { get; set; } = ""; public string Role { get; set; } = "reader"; }
public sealed class RoleRequest { public string Role { get; set; } = "reader"; }
public sealed record PersonResponse(Guid Id, string Name, string Role);
public sealed record WorkspaceResponse(Guid Id, string Name, string Role, List<PersonResponse> Members);
public sealed record SessionResponse(Guid UserId, string Name, bool Authenticated, bool SetupRequired, bool SharedMode, string Login = "");
public sealed record InvitationResponse(string Token, DateTime Expires, string Workspace, string Role);
public sealed record PendingInvitationResponse(Guid Id, string Workspace, string Role, DateTime Expires);
public interface ITeamService
{
    Task<SessionResponse> Session(CancellationToken ct);
    Task<Account> Setup(CredentialsRequest request, CancellationToken ct);
    Task<Account> Register(CredentialsRequest request, CancellationToken ct);
    Task<Account> Login(CredentialsRequest request, CancellationToken ct);
    Task<Account> Join(string token, CancellationToken ct);
    Task<List<WorkspaceResponse>> List(CancellationToken ct);
    Task<WorkspaceResponse> Create(string name, CancellationToken ct);
    Task<InvitationResponse> Invite(Guid id, string role, CancellationToken ct, string login = "");
    Task<List<PendingInvitationResponse>> Pending(CancellationToken ct);
    Task AcceptDirect(Guid id, CancellationToken ct);
    Task<Account> Accept(AcceptInvitationRequest request, CancellationToken ct);
    Task SetRole(Guid workspace, Guid person, string role, CancellationToken ct);
}
public sealed class TeamService(IUnitOfWork unit, ICurrentActor actor, RuntimeOptions options, INotificationService? notifications = null) : ITeamService
{
    private static readonly PasswordHasher<Account> hasher = new(Microsoft.Extensions.Options.Options.Create(new PasswordHasherOptions { IterationCount = 210_000 }));
    private static readonly Account dummy = new(Guid.Empty, "", "", "");
    private static readonly string dummyHash = hasher.HashPassword(dummy, Convert.ToHexString(RandomNumberGenerator.GetBytes(32)));
    public async Task<SessionResponse> Session(CancellationToken ct)
    {
        var account = await unit.Accounts.Get(new UserId(actor.Id), ct);
        var configured = await unit.Accounts.Get(new UserId(LocalIdentity.OwnerId), ct) is not null;
        return new(actor.Id, account?.Name ?? "Моё пространство", account is not null, !configured, options.SharedMode, account?.Login ?? "");
    }
    public async Task<Account> Setup(CredentialsRequest request, CancellationToken ct)
    {
        if (options.SharedMode || actor.Id != LocalIdentity.OwnerId || await unit.Accounts.Get(new UserId(LocalIdentity.OwnerId), ct) is not null)
            throw new AppException("Начальная настройка уже завершена или недоступна.", 403);
        var account = NewAccount(LocalIdentity.OwnerId, request.Name, request.Email, request.Password, request.Login);
        unit.Accounts.Add(account); await CommitAccount(ct); options.LocalAccountConfigured = true; return account;
    }
    public async Task<Account> Register(CredentialsRequest request, CancellationToken ct)
    {
        if (await unit.Accounts.Get(new UserId(LocalIdentity.OwnerId), ct) is null)
            throw new AppException("Сначала создай аккаунт владельца на этом компьютере.", 403);
        if (await unit.Accounts.Get(new UserId(actor.Id), ct) is not null)
            throw new AppException("Сначала выйди из текущего аккаунта.", 409);
        var account = NewAccount(Guid.NewGuid(), request.Name, request.Email, request.Password, request.Login);
        unit.Accounts.Add(account);
        await CommitAccount(ct);
        return account;
    }
    private async Task CommitAccount(CancellationToken ct)
    {
        try { await unit.Commit(ct); }
        catch (DbUpdateException exception) when (exception.InnerException is SqliteException { SqliteErrorCode: 19 })
        { throw new AppException("Этот логин или адрес почты уже занят. Войди или укажи другой.", 409); }
    }
    public async Task<Account> Login(CredentialsRequest request, CancellationToken ct)
    {
        if (request.Password.Length > 1024) throw new AppException("Не удалось войти. Проверь почту и пароль.", 401);
        var identifier = (string.IsNullOrWhiteSpace(request.Login) ? request.Email : request.Login).Trim().ToLowerInvariant();
        var account = (await unit.Accounts.GetAll(ct)).FirstOrDefault(x => x.Email == identifier || x.Login == identifier);
        var verified = hasher.VerifyHashedPassword(account ?? dummy, account?.PasswordHash ?? dummyHash, request.Password);
        if (account is null || verified == PasswordVerificationResult.Failed)
            throw new AppException("Не удалось войти. Проверь почту и пароль.", 401);
        if (verified == PasswordVerificationResult.SuccessRehashNeeded) { account.SetPassword(hasher.HashPassword(account, request.Password)); await unit.Commit(ct); }
        return account;
    }
    public async Task<List<WorkspaceResponse>> List(CancellationToken ct)
    {
        var memberships = (await unit.Members.GetAll(ct)).Where(x => x.Role != "removed").ToList(); var accounts = await unit.Accounts.GetAll(ct);
        return (await unit.Workspaces.GetAll(ct)).Where(w => memberships.Any(m => m.WorkspaceId == w.Id.Value && m.UserId == actor.Id))
            .Select(w => new WorkspaceResponse(w.Id.Value, w.Name, memberships.First(m => m.WorkspaceId == w.Id.Value && m.UserId == actor.Id).Role,
                memberships.Where(m => m.WorkspaceId == w.Id.Value).Select(m => new PersonResponse(m.UserId, accounts.FirstOrDefault(a => a.Id.Value == m.UserId)?.Name ?? "Участник", m.Role)).ToList())).ToList();
    }
    public async Task<WorkspaceResponse> Create(string name, CancellationToken ct)
    {
        if (await unit.Accounts.Get(new UserId(actor.Id), ct) is null) throw new AppException("Сначала войди в свой аккаунт.", 401);
        if (string.IsNullOrWhiteSpace(name) || name.Length > 100) throw new AppException("Укажи название пространства, до 100 символов.");
        var workspace = new Workspace(name.Trim(), actor.Id); unit.Workspaces.Add(workspace);
        unit.Members.Add(new Membership(workspace.Id.Value, actor.Id, "owner")); await unit.Commit(ct);
        return (await List(ct)).Single(x => x.Id == workspace.Id.Value);
    }
    public async Task<InvitationResponse> Invite(Guid id, string role, CancellationToken ct, string login = "")
    {
        var workspace = await RequireOwner(id, ct); ValidateRole(role);
        var token = Convert.ToHexString(RandomNumberGenerator.GetBytes(32));
        var invitation = new Invitation(id, Hash(token), role);
        if (!string.IsNullOrWhiteSpace(login))
        {
            var target = (await unit.Accounts.GetAll(ct)).FirstOrDefault(x => x.Login == login.Trim().ToLowerInvariant()) ?? throw new AppException("Пользователь с таким логином не найден. Можно отправить приглашение по ссылке.", 404);
            invitation.SetTarget(target.Id.Value);
            if (notifications is not null) await notifications.Record(target.Id.Value, "invite:" + invitation.Id, "Приглашение в пространство: " + workspace.Name, "/team", "invite", ct);
        }
        unit.Invitations.Add(invitation); await unit.Commit(ct);
        return new(invitation.TargetUserId is null ? token : "", invitation.Expires, workspace.Name, role);
    }
    public async Task<Account> Accept(AcceptInvitationRequest request, CancellationToken ct)
    {
        var invitation = await FindInvitation(request.Token, ct);
        var email = request.Email.Trim().ToLowerInvariant();
        var identifier = string.IsNullOrWhiteSpace(request.Login) ? email : request.Login.Trim().ToLowerInvariant();
        var account = (await unit.Accounts.GetAll(ct)).FirstOrDefault(x => x.Email == identifier || x.Login == identifier || (email.Length > 0 && x.Email == email));
        if (account is not null || string.IsNullOrWhiteSpace(request.Name))
        {
            account = await Login(new CredentialsRequest { Login = identifier, Password = request.Password }, ct);
        }
        else
        {
            if (invitation.TargetUserId is not null) throw new AppException("Это приглашение предназначено другому пользователю.", 403);
            account = NewAccount(Guid.NewGuid(), request.Name, email, request.Password, request.Login); unit.Accounts.Add(account);
        }
        return await AddInvitedMember(invitation, account, ct);
    }
    public async Task<Account> Join(string token, CancellationToken ct)
    {
        var account = await unit.Accounts.Get(new UserId(actor.Id), ct)
            ?? throw new AppException("Войди в свой аккаунт.", 401);
        return await AddInvitedMember(await FindInvitation(token, ct), account, ct);
    }
    private async Task<Invitation> FindInvitation(string token, CancellationToken ct)
    {
        if (token.Length != 64 || !token.All(char.IsAsciiHexDigit)) throw new AppException("Ссылка приглашения неполная или недействительна.", 410);
        return (await unit.Invitations.GetAll(ct)).FirstOrDefault(x => x.TokenHash == Hash(token) && !x.Used && x.Expires > DateTime.UtcNow)
            ?? throw new AppException("Приглашение истекло или уже использовано.", 410);
    }
    private async Task<Account> AddInvitedMember(Invitation invitation, Account account, CancellationToken ct)
    {
        if (invitation.TargetUserId is not null && invitation.TargetUserId != account.Id.Value) throw new AppException("Это приглашение предназначено другому пользователю.", 403);
        var member = (await unit.Members.GetAll(ct)).FirstOrDefault(x => x.WorkspaceId == invitation.WorkspaceId && x.UserId == account.Id.Value);
        if (member is null)
            unit.Members.Add(new Membership(invitation.WorkspaceId, account.Id.Value, invitation.Role));
        else if (member.Role == "removed") member.SetRole(invitation.Role);
        invitation.Use();
        try { await unit.Commit(ct); } catch (DbUpdateException) { throw new AppException("Приглашение уже использовано или учётная запись создана. Повтори вход.", 409); }
        return account;
    }
    public async Task SetRole(Guid workspace, Guid person, string role, CancellationToken ct)
    {
        await RequireOwner(workspace, ct);
        var member = (await unit.Members.GetAll(ct)).SingleOrDefault(x => x.WorkspaceId == workspace && x.UserId == person)
            ?? throw new AppException("Участник не найден.", 404);
        if (member.Role == "owner") throw new AppException("Нельзя изменить роль владельца.");
        if (role == "removed") { member.SetRole("removed"); }
        else { ValidateRole(role); member.SetRole(role); }
        await unit.Commit(ct);
    }
    private async Task<Workspace> RequireOwner(Guid id, CancellationToken ct)
    {
        var workspace = await unit.Workspaces.Get(new WorkspaceId(id), ct);
        if (workspace is null || workspace.OwnerId != actor.Id) throw new AppException("Только владелец пространства управляет участниками.", 403);
        return workspace;
    }
    public async Task<List<PendingInvitationResponse>> Pending(CancellationToken ct)
    {
        var spaces = await unit.Workspaces.GetAll(ct);
        return (await unit.Invitations.GetAll(ct)).Where(x => x.TargetUserId == actor.Id && !x.Used && x.Expires > DateTime.UtcNow)
            .Select(x => new PendingInvitationResponse(x.Id.Value, spaces.FirstOrDefault(s => s.Id.Value == x.WorkspaceId)?.Name ?? "Пространство", x.Role, x.Expires)).ToList();
    }
    public async Task AcceptDirect(Guid id, CancellationToken ct)
    {
        var invitation = await unit.Invitations.Get(new InvitationId(id), ct);
        if (invitation is null || invitation.TargetUserId != actor.Id || invitation.Used || invitation.Expires < DateTime.UtcNow) throw new AppException("Приглашение недоступно.", 410);
        var member = (await unit.Members.GetAll(ct)).FirstOrDefault(x => x.UserId == actor.Id && x.WorkspaceId == invitation.WorkspaceId);
        if (member is null) unit.Members.Add(new Membership(invitation.WorkspaceId, actor.Id, invitation.Role));
        else if (member.Role == "removed") member.SetRole(invitation.Role);
        invitation.Use();
        try { await unit.Commit(ct); } catch (DbUpdateException) { throw new AppException("Приглашение уже обработано.", 409); }
    }
    private Account NewAccount(Guid id, string name, string email, string password, string login)
    {
        if (string.IsNullOrWhiteSpace(name) || name.Length > 100 || email.Length > 254 || !System.Net.Mail.MailAddress.TryCreate(email.Trim(), out var address) || address.Address != email.Trim())
            throw new AppException("Укажи имя и корректный адрес почты.");
        if (password.Length < 12 || password.Length > 1024) throw new AppException("Пароль должен содержать от 12 до 1024 символов.");
        var account = new Account(id, name.Trim(), email.Trim().ToLowerInvariant(), "");
        login = string.IsNullOrWhiteSpace(login) ? "user-" + id.ToString("N")[..12] : login.Trim().ToLowerInvariant();
        if (!System.Text.RegularExpressions.Regex.IsMatch(login, "^[a-z0-9][a-z0-9_-]{2,39}$")) throw new AppException("Логин: 3–40 латинских букв, цифр, дефисов и подчёркиваний.");
        account.SetLogin(login);
        account.SetPassword(hasher.HashPassword(account, password)); return account;
    }
    private static void ValidateRole(string role) { if (role is not ("reader" or "editor")) throw new AppException("Выбери читателя или редактора."); }
    private static string Hash(string token) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token)));
}
