using Arturia.ShortLink.Domain.Interfaces;

namespace Arturia.ShortLink.Infrastructure.Context;

public sealed class WorkspaceContext : IWorkspaceContext
{
    public ulong? CurrentWorkspaceId { get; private set; }
    public string? CurrentRole { get; private set; }

    public void SetContext(ulong workspaceId, string role)
    {
        CurrentWorkspaceId = workspaceId;
        CurrentRole = role;
    }
}
