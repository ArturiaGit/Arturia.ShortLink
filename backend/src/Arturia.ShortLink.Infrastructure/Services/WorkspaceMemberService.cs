using System.Security.Cryptography;
using Arturia.ShortLink.Application.Workspaces.Dtos;
using Arturia.ShortLink.Application.Workspaces.Interfaces;
using Arturia.ShortLink.Domain.Common;
using Arturia.ShortLink.Domain.Entities;
using Arturia.ShortLink.Domain.Enums;
using Arturia.ShortLink.Domain.Interfaces;
using Arturia.ShortLink.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using System.Data;

namespace Arturia.ShortLink.Infrastructure.Services;

public sealed class WorkspaceMemberService(AppDbContext dbContext, IWorkspaceContext workspaceContext) : IWorkspaceMemberService
{
    public async Task<IReadOnlyList<TeamMemberDto>> ListAsync(ulong workspaceId, CancellationToken cancellationToken)
    {
        EnsureContext(workspaceId);
        var members = await dbContext.WorkspaceMembers
            .Join(dbContext.Users, member => member.UserId, user => user.Id,
                (member, user) => new { member, user })
            .OrderBy(value => value.member.Id)
            .ToListAsync(cancellationToken);
        var result = members.Select(value => MapMember(value.member, value.user)).ToList();
        var invitations = await dbContext.WorkspaceInvitations
            .Where(value => value.Status == InvitationStatus.Pending)
            .OrderBy(value => value.Id)
            .ToListAsync(cancellationToken);
        result.AddRange(invitations.Select(value => new TeamMemberDto(
            value.Id.ToString(), string.Empty, value.Email, string.Empty, null,
            value.Role.ToString().ToLowerInvariant(), "pending", value.CreatedAt)));
        return result;
    }

    public async Task<TeamMemberDto> InviteAsync(ulong workspaceId, ulong actorUserId, InviteMemberRequest request, CancellationToken cancellationToken)
    {
        EnsureContext(workspaceId);
        var actorRole = ParseRole(workspaceContext.CurrentRole);
        if (actorRole == WorkspaceRole.Member) throw new ForbiddenException();
        if (actorRole == WorkspaceRole.Admin && request.Role != "member")
            throw new ForbiddenException("管理员只能邀请普通成员");
        var email = request.Email.Trim().ToLowerInvariant();
        await using var transaction = await dbContext.Database.BeginTransactionAsync(IsolationLevel.Serializable, cancellationToken);
        var user = await dbContext.Users.SingleOrDefaultAsync(value => value.Email == email, cancellationToken);
        if (user is { IsActive: false }) throw new ConflictException("该账号已停用，无法加入工作空间");
        if (user is not null && await dbContext.WorkspaceMembers.AnyAsync(value => value.UserId == user.Id, cancellationToken))
            throw new ConflictException("该用户已是工作空间成员");

        var pending = await dbContext.WorkspaceInvitations
            .Where(value => value.Email == email && value.Status == InvitationStatus.Pending)
            .OrderByDescending(value => value.Id)
            .FirstOrDefaultAsync(cancellationToken);
        if (pending is not null)
        {
            if (pending.ExpiresAt > DateTime.UtcNow) throw new ConflictException("该邮箱已有待处理的团队邀请，请勿重复邀请");
            pending.Status = InvitationStatus.Expired;
        }

        var role = request.Role == "admin" ? WorkspaceRole.Admin : WorkspaceRole.Member;
        if (user is not null)
        {
            var member = new WorkspaceMember { WorkspaceId = workspaceId, UserId = user.Id, Role = role };
            dbContext.WorkspaceMembers.Add(member);
            try { await dbContext.SaveChangesAsync(cancellationToken); }
            catch (DbUpdateException exception) when (DatabaseErrors.IsDuplicateKey(exception))
            {
                throw new ConflictException("该用户已是工作空间成员");
            }
            await transaction.CommitAsync(cancellationToken);
            return MapMember(member, user);
        }

        var invitation = new WorkspaceInvitation
        {
            WorkspaceId = workspaceId,
            Email = email,
            Role = role == WorkspaceRole.Admin ? InvitationRole.Admin : InvitationRole.Member,
            TokenHash = Convert.ToHexString(SHA256.HashData(RandomNumberGenerator.GetBytes(32))).ToLowerInvariant(),
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            InvitedBy = actorUserId
        };
        dbContext.WorkspaceInvitations.Add(invitation);
        try { await dbContext.SaveChangesAsync(cancellationToken); }
        catch (DbUpdateException exception) when (DatabaseErrors.IsDuplicateKey(exception))
        {
            throw new ConflictException("该邮箱已有待处理的团队邀请，请勿重复邀请");
        }
        await transaction.CommitAsync(cancellationToken);
        return new TeamMemberDto(invitation.Id.ToString(), string.Empty, email, string.Empty, null, request.Role, "pending", invitation.CreatedAt);
    }

    public async Task<TeamMemberDto> UpdateRoleAsync(ulong workspaceId, ulong memberId, ulong actorUserId, UpdateMemberRoleRequest request, CancellationToken cancellationToken)
    {
        EnsureContext(workspaceId);
        if (ParseRole(workspaceContext.CurrentRole) != WorkspaceRole.Owner) throw new ForbiddenException("仅所有者可修改成员角色");
        var member = await dbContext.WorkspaceMembers.SingleOrDefaultAsync(value => value.Id == memberId, cancellationToken)
            ?? throw new NotFoundException("成员不存在");
        if (member.Role == WorkspaceRole.Owner || member.UserId == actorUserId) throw new ForbiddenException("所有者角色不可修改");
        member.Role = request.Role == "admin" ? WorkspaceRole.Admin : WorkspaceRole.Member;
        await dbContext.SaveChangesAsync(cancellationToken);
        var user = await dbContext.Users.SingleAsync(value => value.Id == member.UserId, cancellationToken);
        return MapMember(member, user);
    }

    public async Task RemoveAsync(ulong workspaceId, ulong memberId, ulong actorUserId, CancellationToken cancellationToken)
    {
        EnsureContext(workspaceId);
        var actorRole = ParseRole(workspaceContext.CurrentRole);
        if (actorRole == WorkspaceRole.Member) throw new ForbiddenException();
        var member = await dbContext.WorkspaceMembers.SingleOrDefaultAsync(value => value.Id == memberId, cancellationToken)
            ?? throw new NotFoundException("成员不存在");
        if (member.Role == WorkspaceRole.Owner || member.UserId == actorUserId) throw new ForbiddenException("所有者不可被移除或退出当前空间");
        if (actorRole == WorkspaceRole.Admin && member.Role != WorkspaceRole.Member)
            throw new ForbiddenException("管理员只能移除普通成员");
        dbContext.WorkspaceMembers.Remove(member);
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private void EnsureContext(ulong workspaceId)
    {
        if (workspaceContext.CurrentWorkspaceId != workspaceId) throw new ForbiddenException("无权访问此工作空间");
    }

    private static WorkspaceRole ParseRole(string? role) => Enum.TryParse<WorkspaceRole>(role, true, out var parsed) ? parsed : WorkspaceRole.Member;
    private static TeamMemberDto MapMember(WorkspaceMember member, User user) => new(
        member.Id.ToString(), user.Id.ToString(), user.Email, user.Nickname,
        string.IsNullOrEmpty(user.AvatarUrl) ? null : user.AvatarUrl,
        member.Role.ToString().ToLowerInvariant(), "active", member.CreatedAt);
}
