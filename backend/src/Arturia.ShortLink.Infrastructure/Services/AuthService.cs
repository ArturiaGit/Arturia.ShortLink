using System.Data;
using System.Security.Cryptography;
using System.Text.RegularExpressions;
using Arturia.ShortLink.Application.Auth.Dtos;
using Arturia.ShortLink.Application.Auth.Interfaces;
using Arturia.ShortLink.Domain.Common;
using Arturia.ShortLink.Domain.Entities;
using Arturia.ShortLink.Domain.Enums;
using Arturia.ShortLink.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Arturia.ShortLink.Infrastructure.Services;

public sealed partial class AuthService(
    AppDbContext dbContext,
    IPasswordHasher passwordHasher,
    IJwtTokenService jwtTokenService) : IAuthService
{
    public async Task<AuthResponseDto> LoginAsync(LoginRequest request, CancellationToken cancellationToken)
    {
        var email = NormalizeEmail(request.Email);
        var user = await dbContext.Users.SingleOrDefaultAsync(value => value.Email == email && value.IsActive, cancellationToken);
        if (user is null || !passwordHasher.VerifyPassword(request.Password, user.PasswordHash))
            throw new UnauthorizedException("邮箱或密码错误");

        return new AuthResponseDto(jwtTokenService.CreateToken(user), MapUser(user), await GetWorkspacesAsync(user.Id, cancellationToken));
    }

    public async Task<AuthResponseDto> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken)
    {
        var email = NormalizeEmail(request.Email);
        await using var transaction = await dbContext.Database.BeginTransactionAsync(IsolationLevel.Serializable, cancellationToken);
        if (await dbContext.Users.AnyAsync(value => value.Email == email, cancellationToken))
            throw new ConflictException("邮箱已被注册");

        var user = new User
        {
            Email = email,
            PasswordHash = passwordHasher.HashPassword(request.Password),
            Nickname = request.Nickname.Trim()
        };
        dbContext.Users.Add(user);
        try { await dbContext.SaveChangesAsync(cancellationToken); }
        catch (DbUpdateException exception) when (DatabaseErrors.IsDuplicateKey(exception))
        {
            throw new ConflictException("邮箱已被注册");
        }

        var workspace = new Workspace
        {
            Name = $"{user.Nickname}的工作空间",
            Slug = await GeneratePersonalSlugAsync(email, cancellationToken),
            CreatedBy = user.Id
        };
        dbContext.Workspaces.Add(workspace);
        await dbContext.SaveChangesAsync(cancellationToken);

        var systemDomainId = await dbContext.LinkDomains
            .Where(value => value.IsSystem && value.Domain == "art.link")
            .Select(value => value.Id)
            .SingleAsync(cancellationToken);
        dbContext.WorkspaceMembers.Add(new WorkspaceMember { WorkspaceId = workspace.Id, UserId = user.Id, Role = WorkspaceRole.Owner });
        dbContext.WorkspaceDomains.Add(new WorkspaceDomain { WorkspaceId = workspace.Id, DomainId = systemDomainId, IsSystem = true, IsPrimary = true });

        // 注册需要按邮箱跨租户消费邀请，因此显式绕过过滤并补回邮箱与 pending 状态条件。
        var invitations = await dbContext.WorkspaceInvitations.IgnoreQueryFilters()
            .Where(value => value.Email == email && value.Status == InvitationStatus.Pending)
            .ToListAsync(cancellationToken);
        var now = DateTime.UtcNow;
        foreach (var invitation in invitations)
        {
            if (invitation.ExpiresAt <= now)
            {
                invitation.Status = InvitationStatus.Expired;
                continue;
            }

            invitation.Status = InvitationStatus.Accepted;
            invitation.AcceptedBy = user.Id;
            invitation.AcceptedAt = now;
            dbContext.WorkspaceMembers.Add(new WorkspaceMember
            {
                WorkspaceId = invitation.WorkspaceId,
                UserId = user.Id,
                Role = invitation.Role == InvitationRole.Admin ? WorkspaceRole.Admin : WorkspaceRole.Member
            });
        }
        await dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return new AuthResponseDto(jwtTokenService.CreateToken(user), MapUser(user), await GetWorkspacesAsync(user.Id, cancellationToken));
    }

    public async Task<AuthMeResponseDto> GetMeAsync(ulong userId, CancellationToken cancellationToken)
    {
        var user = await dbContext.Users.SingleOrDefaultAsync(value => value.Id == userId && value.IsActive, cancellationToken)
            ?? throw new UnauthorizedException();
        return new AuthMeResponseDto(MapUser(user), await GetWorkspacesAsync(user.Id, cancellationToken));
    }

    private async Task<IReadOnlyList<WorkspaceDto>> GetWorkspacesAsync(ulong userId, CancellationToken cancellationToken)
    {
        // 用户级端点需要读取当前用户的全部成员关系，因此显式绕过租户过滤并补回 userId 条件。
        var rows = await dbContext.WorkspaceMembers.IgnoreQueryFilters()
            .Where(member => member.UserId == userId)
            .Join(dbContext.Workspaces, member => member.WorkspaceId, workspace => workspace.Id,
                (member, workspace) => new { workspace.Id, workspace.Name, workspace.Slug, member.Role })
            .OrderBy(value => value.Id)
            .ToListAsync(cancellationToken);
        return rows.Select(value => new WorkspaceDto(
            value.Id.ToString(), value.Name, value.Slug, value.Role.ToString().ToLowerInvariant())).ToList();
    }

    private async Task<string> GeneratePersonalSlugAsync(string email, CancellationToken cancellationToken)
    {
        var localPart = email.Split('@', 2)[0].ToLowerInvariant();
        var prefix = InvalidSlugCharacters().Replace(localPart, "-");
        prefix = RepeatedHyphens().Replace(prefix, "-").Trim('-');
        if (prefix.Length < 3) prefix = "user";
        if (prefix.Length > 20) prefix = prefix[..20].TrimEnd('-');
        const string alphabet = "0123456789abcdefghijklmnopqrstuvwxyz";
        for (var attempt = 0; attempt < 5; attempt++)
        {
            var suffix = new string(Enumerable.Range(0, 4).Select(_ => alphabet[RandomNumberGenerator.GetInt32(alphabet.Length)]).ToArray());
            var candidate = $"{prefix}-{suffix}";
            if (!await dbContext.Workspaces.AnyAsync(value => value.Slug == candidate, cancellationToken)) return candidate;
        }
        throw new ConflictException("无法生成唯一的工作空间标识，请重试");
    }

    private static string NormalizeEmail(string email) => email.Trim().ToLowerInvariant();
    private static UserDto MapUser(User user) => new(user.Id.ToString(), user.Email, user.Nickname, string.IsNullOrEmpty(user.AvatarUrl) ? null : user.AvatarUrl);

    [GeneratedRegex("[^a-z0-9]+")]
    private static partial Regex InvalidSlugCharacters();
    [GeneratedRegex("-+")]
    private static partial Regex RepeatedHyphens();
}
