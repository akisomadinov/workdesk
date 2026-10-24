using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Workdesk.Data;

namespace Workdesk.Services;

public sealed class RuntimeOptions
{
    public bool SharedMode { get; init; }
    public bool LocalAccountConfigured { get; set; }
    public bool RequireAuthentication => SharedMode || LocalAccountConfigured;
    public string[] AllowedSourceHosts { get; init; } = [];
}
public interface ICurrentActor { Guid Id { get; } bool IsSystem { get; } }
public sealed class CurrentActor(IHttpContextAccessor accessor, RuntimeOptions options) : ICurrentActor
{
    public bool IsSystem => accessor.HttpContext is null;
    public Guid Id => Guid.TryParse(accessor.HttpContext?.User.FindFirstValue(ClaimTypes.NameIdentifier), out var id)
        ? id : !options.RequireAuthentication || IsSystem ? LocalIdentity.OwnerId : Guid.Empty;
}
public sealed class LocalActor : ICurrentActor { public Guid Id => LocalIdentity.OwnerId; public bool IsSystem => false; }
public interface IAccessPolicy
{
    Guid UserId { get; }
    bool IsSystem { get; }
    Task<bool> CanRead(Guid owner, Guid? workspace, CancellationToken ct);
    Task<bool> CanEdit(Guid owner, Guid? workspace, CancellationToken ct);
    Task RequireWrite(Guid owner, Guid? workspace, CancellationToken ct);
    Task RequireWorkspace(Guid? workspace, Guid? assignee, CancellationToken ct);
}
public sealed class AccessPolicy(IUnitOfWork unit, ICurrentActor actor) : IAccessPolicy
{
    public Guid UserId => actor.Id;
    public bool IsSystem => actor.IsSystem;
    private async Task<string?> Role(Guid? workspace, CancellationToken ct) => workspace is null ? null :
        (await unit.Members.GetAll(ct)).FirstOrDefault(x => x.WorkspaceId == workspace && x.UserId == actor.Id && x.Role != "removed")?.Role;
    public async Task<bool> CanRead(Guid owner, Guid? workspace, CancellationToken ct) =>
        workspace is null ? owner == actor.Id : await Role(workspace, ct) is not null;
    public async Task<bool> CanEdit(Guid owner, Guid? workspace, CancellationToken ct) =>
        workspace is null ? owner == actor.Id : await Role(workspace, ct) is "owner" or "editor";
    public async Task RequireWrite(Guid owner, Guid? workspace, CancellationToken ct)
    { if (!await CanEdit(owner, workspace, ct)) throw new AppException("Нет прав на изменение этого материала.", 403); }
    public async Task RequireWorkspace(Guid? workspace, Guid? assignee, CancellationToken ct)
    {
        if (workspace is not null && await Role(workspace, ct) is not ("owner" or "editor")) throw new AppException("Нет прав на запись в это пространство.", 403);
        if (assignee is not null && (workspace is null ? assignee != actor.Id : !(await unit.Members.GetAll(ct)).Any(x => x.WorkspaceId == workspace && x.UserId == assignee && x.Role != "removed")))
            throw new AppException("Исполнитель должен состоять в выбранном пространстве.");
    }
}
