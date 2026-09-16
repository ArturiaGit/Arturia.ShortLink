using System.Data;
using Arturia.ShortLink.Application.Workspaces.Dtos;
using Arturia.ShortLink.Application.Workspaces.Interfaces;
using Arturia.ShortLink.Domain.Common;
using Arturia.ShortLink.Domain.Entities;
using Arturia.ShortLink.Domain.Enums;
using Arturia.ShortLink.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using System.Text.RegularExpressions;

namespace Arturia.ShortLink.Infrastructure.Services;

public sealed class WorkspaceService(AppDbContext dbContext) : IWorkspaceService
{
    private static readonly Regex SlugPattern = new("^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])?$", RegexOptions.CultureInvariant);
    public async Task<IReadOnlyList<WorkspaceDto>> ListAsync(ulong userId, CancellationToken cancellationToken)
    {
        // 用户级端点读取本人全部空间，因此绕过租户过滤并显式限制 userId。
        var rows = await dbContext.WorkspaceMembers.IgnoreQueryFilters()
            .Where(value => value.UserId == userId)
            .Join(dbContext.Workspaces, member => member.WorkspaceId, workspace => workspace.Id,
                (member, workspace) => new { workspace.Id, workspace.Name, workspace.Slug, member.Role })
            .OrderBy(value => value.Id)
            .ToListAsync(cancellationToken);
        return rows.Select(value => new WorkspaceDto(value.Id.ToString(), value.Name, value.Slug, value.Role.ToString().ToLowerInvariant())).ToList();
    }

    public async Task<WorkspaceDto> CreateAsync(ulong userId, CreateWorkspaceDto request, CancellationToken cancellationToken)
    {
        var slug = request.Slug.Trim().ToLowerInvariant();
        await using var transaction = await dbContext.Database.BeginTransactionAsync(IsolationLevel.Serializable, cancellationToken);
        if (await dbContext.Workspaces.AnyAsync(value => value.Slug == slug, cancellationToken))
            throw new ConflictException("工作空间标识已被占用");
        var workspace = new Workspace { Name = request.Name.Trim(), Slug = slug, CreatedBy = userId };
        dbContext.Workspaces.Add(workspace);
        try { await dbContext.SaveChangesAsync(cancellationToken); }
        catch (DbUpdateException exception) when (DatabaseErrors.IsDuplicateKey(exception))
        {
            throw new ConflictException("工作空间标识已被占用");
        }
        var domainId = await dbContext.LinkDomains.Where(value => value.IsSystem && value.Domain == "art.link").Select(value => value.Id).SingleAsync(cancellationToken);
        dbContext.WorkspaceMembers.Add(new WorkspaceMember { WorkspaceId = workspace.Id, UserId = userId, Role = WorkspaceRole.Owner });
        dbContext.WorkspaceDomains.Add(new WorkspaceDomain { WorkspaceId = workspace.Id, DomainId = domainId, IsSystem = true, IsPrimary = true });
        await dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return new WorkspaceDto(workspace.Id.ToString(), workspace.Name, workspace.Slug, "owner");
    }

    public async Task<CheckSlugResultDto> CheckSlugAsync(string slug, CancellationToken cancellationToken)
    {
        var normalized = slug.Trim().ToLowerInvariant();
        if (!SlugPattern.IsMatch(slug)) throw new BusinessException("工作空间标识格式无效");
        var available = !await dbContext.Workspaces.AnyAsync(value => value.Slug == normalized, cancellationToken);
        return new CheckSlugResultDto(available, available ? "该标识可用" : "该标识已被占用");
    }
}
