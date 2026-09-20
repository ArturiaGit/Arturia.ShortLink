using System.Text.RegularExpressions;
using Arturia.ShortLink.Application.Auth.Interfaces;
using Arturia.ShortLink.Application.Links.Dtos;
using Arturia.ShortLink.Application.Links.Interfaces;
using Arturia.ShortLink.Domain.Common;
using Arturia.ShortLink.Domain.Entities;
using Arturia.ShortLink.Domain.Interfaces;
using Arturia.ShortLink.Infrastructure.Persistence;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.EntityFrameworkCore;
using ShortLinkEntity = Arturia.ShortLink.Domain.Entities.ShortLink;

namespace Arturia.ShortLink.Infrastructure.Services;

public sealed class LinkService(
    AppDbContext dbContext,
    IWorkspaceContext workspaceContext,
    IBase62Generator base62Generator,
    IRiskControlService riskControlService,
    IPasswordHasher passwordHasher) : ILinkService
{
    private static readonly Regex SlugPattern = new("^[a-zA-Z0-9_-]{3,32}$", RegexOptions.CultureInvariant);

    public async Task<PageResultDto<ShortLinkItemDto>> ListAsync(
        int page,
        int pageSize,
        string? search,
        string? domain,
        bool? isEnabled,
        CancellationToken cancellationToken)
    {
        if (page < 1 || pageSize is < 1 or > 100) throw new BusinessException("分页参数无效");
        var query = dbContext.ShortLinks
            .Join(dbContext.LinkDomains, link => link.DomainId, linkDomain => linkDomain.Id, (link, linkDomain) => new { link, linkDomain })
            .Join(dbContext.Users, row => row.link.CreatedBy, user => user.Id, (row, user) => new { row.link, Domain = row.linkDomain.Domain, User = user })
            .AsQueryable();
        if (!string.IsNullOrWhiteSpace(search))
        {
            var keyword = search.Trim();
            query = query.Where(value => value.link.Slug.Contains(keyword) || value.link.Title.Contains(keyword) || value.link.OriginalUrl.Contains(keyword));
        }
        if (!string.IsNullOrWhiteSpace(domain))
        {
            var normalizedDomain = domain.Trim().TrimEnd('.').ToLowerInvariant();
            query = query.Where(value => value.Domain == normalizedDomain);
        }
        if (isEnabled.HasValue) query = query.Where(value => value.link.IsEnabled == isEnabled.Value);

        var total = await query.LongCountAsync(cancellationToken);
        var rows = await query.OrderByDescending(value => value.link.CreatedAt).ThenByDescending(value => value.link.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(value => new ShortLinkItemDto(
                value.link.Id.ToString(), value.link.WorkspaceId.ToString(), value.Domain, value.link.Slug,
                $"https://{value.Domain}/{value.link.Slug}", value.link.OriginalUrl, value.link.Title, value.link.Description,
                value.link.IsEnabled, value.link.IsBanned, value.link.PasswordHash != null, value.link.ExpiresAt,
                value.link.TotalClicks, value.link.TotalUniqueVisitors, value.link.CreatedBy.ToString(),
                value.User.Nickname, value.User.AvatarUrl, value.link.CreatedAt))
            .ToListAsync(cancellationToken);
        return new PageResultDto<ShortLinkItemDto>(rows, total, page, pageSize, (int)Math.Ceiling(total / (double)pageSize));
    }

    public async Task<ShortLinkItemDto> CreateAsync(ulong createdBy, CreateLinkDto request, CancellationToken cancellationToken)
    {
        var workspaceId = workspaceContext.CurrentWorkspaceId ?? throw new ForbiddenException("缺少工作空间上下文");
        await riskControlService.ValidateOriginalUrlAsync(request.OriginalUrl, cancellationToken);
        if (request.ExpiresAt is { } expiresAt && expiresAt <= DateTime.UtcNow)
            throw new BusinessException("到期时间必须晚于当前时间", 422);
        var domain = await ResolveDomainAsync(request.Domain, cancellationToken);
        var slug = string.IsNullOrWhiteSpace(request.Slug)
            ? await AllocateSlugAsync(domain.Id, cancellationToken)
            : await ValidateCustomSlugAsync(domain.Id, request.Slug.Trim(), cancellationToken);

        var uri = new Uri(request.OriginalUrl, UriKind.Absolute);
        var query = QueryHelpers.ParseQuery(uri.Query);
        var entity = new ShortLinkEntity
        {
            WorkspaceId = workspaceId,
            DomainId = domain.Id,
            Slug = slug,
            OriginalUrl = request.OriginalUrl,
            Title = request.Title?.Trim() ?? string.Empty,
            Description = request.Description?.Trim() ?? string.Empty,
            PasswordHash = string.IsNullOrWhiteSpace(request.Password) ? null : passwordHasher.HashPassword(request.Password),
            ExpiresAt = request.ExpiresAt,
            UtmSource = ReadQuery(query, "utm_source"),
            UtmMedium = ReadQuery(query, "utm_medium"),
            UtmCampaign = ReadQuery(query, "utm_campaign"),
            UtmTerm = ReadQuery(query, "utm_term"),
            UtmContent = ReadQuery(query, "utm_content"),
            CreatedBy = createdBy
        };
        dbContext.ShortLinks.Add(entity);
        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException exception) when (DatabaseErrors.IsDuplicateKey(exception))
        {
            throw new ConflictException("短码已被占用");
        }
        return await MapAsync(entity, domain.Domain, cancellationToken);
    }

    public async Task<CheckSlugResultDto> CheckSlugAsync(string domain, string slug, ulong? excludeId, CancellationToken cancellationToken)
    {
        var linkDomain = await ResolveDomainAsync(domain, cancellationToken);
        if (!SlugPattern.IsMatch(slug) || await riskControlService.IsReservedSlugAsync(slug, cancellationToken))
            return new CheckSlugResultDto(false, "该别名属于系统保留词或格式不合法");
        var canExclude = excludeId.HasValue && await dbContext.ShortLinks.AnyAsync(value => value.Id == excludeId.Value, cancellationToken);
        var occupied = await ActiveLinksAcrossWorkspaces().AnyAsync(value =>
            value.DomainId == linkDomain.Id && value.Slug == slug && (!canExclude || value.Id != excludeId!.Value), cancellationToken);
        return new CheckSlugResultDto(!occupied, occupied ? "该别名已被占用" : "该别名可用");
    }

    public async Task<ShortLinkItemDto> UpdateAsync(ulong id, ulong actorUserId, UpdateLinkDto request, CancellationToken cancellationToken)
    {
        var entity = await FindLinkAsync(id, cancellationToken);
        EnsureCanMutate(entity, actorUserId);
        await riskControlService.ValidateOriginalUrlAsync(request.OriginalUrl, cancellationToken);
        if (request.ExpiresAt is { } expiresAt && expiresAt <= DateTime.UtcNow)
            throw new BusinessException("到期时间必须晚于当前时间", 422);

        entity.OriginalUrl = request.OriginalUrl;
        entity.Title = request.Title?.Trim() ?? string.Empty;
        entity.Description = request.Description?.Trim() ?? string.Empty;
        entity.ExpiresAt = request.ExpiresAt;
        if (!request.HasPassword) entity.PasswordHash = null;
        else if (!string.IsNullOrWhiteSpace(request.Password)) entity.PasswordHash = passwordHasher.HashPassword(request.Password);
        ApplyUtm(entity);
        await dbContext.SaveChangesAsync(cancellationToken);
        var domain = await dbContext.LinkDomains.Where(value => value.Id == entity.DomainId).Select(value => value.Domain).SingleAsync(cancellationToken);
        return await MapAsync(entity, domain, cancellationToken);
    }

    public async Task<ShortLinkItemDto> ToggleStatusAsync(ulong id, ulong actorUserId, CancellationToken cancellationToken)
    {
        var entity = await FindLinkAsync(id, cancellationToken);
        EnsureCanMutate(entity, actorUserId);
        entity.IsEnabled = !entity.IsEnabled;
        await dbContext.SaveChangesAsync(cancellationToken);
        var domain = await dbContext.LinkDomains.Where(value => value.Id == entity.DomainId).Select(value => value.Domain).SingleAsync(cancellationToken);
        return await MapAsync(entity, domain, cancellationToken);
    }

    public async Task DeleteAsync(ulong id, ulong actorUserId, CancellationToken cancellationToken)
    {
        var entity = await FindLinkAsync(id, cancellationToken);
        EnsureCanMutate(entity, actorUserId);
        entity.DeletedAt = DateTime.UtcNow;
        entity.DeletedBy = actorUserId;
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<ShortLinkItemDto> BanAsync(ulong id, ulong actorUserId, BanLinkDto request, CancellationToken cancellationToken)
    {
        if (workspaceContext.CurrentRole is not ("owner" or "admin"))
            throw new ForbiddenException("仅工作空间所有者或管理员可封禁短链");
        if (request.IsBanned && string.IsNullOrWhiteSpace(request.Reason))
            throw new BusinessException("封禁短链时必须填写原因", 422);
        var entity = await FindLinkAsync(id, cancellationToken);
        entity.IsBanned = request.IsBanned;
        entity.BannedReason = request.IsBanned ? request.Reason!.Trim() : null;
        entity.BannedBy = request.IsBanned ? actorUserId : null;
        entity.BannedAt = request.IsBanned ? DateTime.UtcNow : null;
        await dbContext.SaveChangesAsync(cancellationToken);
        var domain = await dbContext.LinkDomains.Where(value => value.Id == entity.DomainId).Select(value => value.Domain).SingleAsync(cancellationToken);
        return await MapAsync(entity, domain, cancellationToken);
    }

    private async Task<LinkDomain> ResolveDomainAsync(string domain, CancellationToken cancellationToken)
    {
        var normalized = domain.Trim().TrimEnd('.').ToLowerInvariant();
        var result = await dbContext.WorkspaceDomains
            .Join(dbContext.LinkDomains, binding => binding.DomainId, linkDomain => linkDomain.Id, (_, linkDomain) => linkDomain)
            .SingleOrDefaultAsync(value => value.Domain == normalized && value.IsVerified, cancellationToken);
        return result ?? throw new BusinessException("域名未绑定当前工作空间或尚未验证", 422);
    }

    private async Task<ShortLinkEntity> FindLinkAsync(ulong id, CancellationToken cancellationToken) =>
        await dbContext.ShortLinks.SingleOrDefaultAsync(value => value.Id == id, cancellationToken)
        ?? throw new NotFoundException("短链不存在");

    private void EnsureCanMutate(ShortLinkEntity entity, ulong actorUserId)
    {
        if (workspaceContext.CurrentRole == "member" && entity.CreatedBy != actorUserId)
            throw new ForbiddenException("无权限：业务协作者仅可操作本人创建的短链");
    }

    private async Task<string> AllocateSlugAsync(ulong domainId, CancellationToken cancellationToken)
    {
        for (var attempt = 0; attempt < 3; attempt++)
        {
            var candidate = base62Generator.Generate();
            var reserved = await riskControlService.IsReservedSlugAsync(candidate, cancellationToken);
            var occupied = await ActiveLinksAcrossWorkspaces().AnyAsync(value => value.DomainId == domainId && value.Slug == candidate, cancellationToken);
            if (!reserved && !occupied) return candidate;
            if (attempt < 2) await Task.Delay(TimeSpan.FromMilliseconds(10 * (1 << attempt)), cancellationToken);
        }
        throw new ConflictException("短码分配重试耗尽，请稍后重试");
    }

    private async Task<string> ValidateCustomSlugAsync(ulong domainId, string slug, CancellationToken cancellationToken)
    {
        if (!SlugPattern.IsMatch(slug)) throw new BusinessException("短链别名格式不合法", 422);
        if (await riskControlService.IsReservedSlugAsync(slug, cancellationToken))
            throw new BusinessException("该别名属于系统保留词", 422);
        if (await ActiveLinksAcrossWorkspaces().AnyAsync(value => value.DomainId == domainId && value.Slug == slug, cancellationToken))
            throw new ConflictException("短码已被占用");
        return slug;
    }

    private IQueryable<ShortLinkEntity> ActiveLinksAcrossWorkspaces()
    {
        // Host + Slug 在共享系统域名上全局唯一，因此绕过租户过滤后显式补回软删除条件，仅用于占用探测。
        return dbContext.ShortLinks.IgnoreQueryFilters().Where(value => value.DeletedAt == null);
    }

    private async Task<ShortLinkItemDto> MapAsync(ShortLinkEntity entity, string domain, CancellationToken cancellationToken)
    {
        var creator = await dbContext.Users.Where(value => value.Id == entity.CreatedBy)
            .Select(value => new { value.Nickname, value.AvatarUrl })
            .SingleOrDefaultAsync(cancellationToken);
        return new ShortLinkItemDto(
            entity.Id.ToString(), entity.WorkspaceId.ToString(), domain, entity.Slug, $"https://{domain}/{entity.Slug}",
            entity.OriginalUrl, entity.Title, entity.Description, entity.IsEnabled, entity.IsBanned,
            !string.IsNullOrEmpty(entity.PasswordHash), entity.ExpiresAt, entity.TotalClicks, entity.TotalUniqueVisitors,
            entity.CreatedBy.ToString(), creator?.Nickname ?? "Unknown", creator?.AvatarUrl ?? string.Empty, entity.CreatedAt);
    }

    private static void ApplyUtm(ShortLinkEntity entity)
    {
        var query = QueryHelpers.ParseQuery(new Uri(entity.OriginalUrl, UriKind.Absolute).Query);
        entity.UtmSource = ReadQuery(query, "utm_source");
        entity.UtmMedium = ReadQuery(query, "utm_medium");
        entity.UtmCampaign = ReadQuery(query, "utm_campaign");
        entity.UtmTerm = ReadQuery(query, "utm_term");
        entity.UtmContent = ReadQuery(query, "utm_content");
    }

    private static string? ReadQuery(Dictionary<string, Microsoft.Extensions.Primitives.StringValues> query, string key) =>
        query.TryGetValue(key, out var values) && !string.IsNullOrWhiteSpace(values.ToString()) ? values.ToString() : null;
}
