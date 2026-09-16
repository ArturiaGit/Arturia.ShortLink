namespace Arturia.ShortLink.Domain.Interfaces;

public interface IWorkspaceContext
{
    ulong? CurrentWorkspaceId { get; }
    string? CurrentRole { get; }
    void SetContext(ulong workspaceId, string role);
}

public interface ICurrentUserService
{
    ulong? UserId { get; }
    string? Email { get; }
}
