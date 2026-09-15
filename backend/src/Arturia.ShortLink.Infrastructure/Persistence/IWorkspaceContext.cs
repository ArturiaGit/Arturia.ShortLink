namespace Arturia.ShortLink.Infrastructure.Persistence;

public interface IWorkspaceContext
{
    ulong? WorkspaceId { get; }
}

public sealed class NullWorkspaceContext : IWorkspaceContext
{
    public ulong? WorkspaceId => null;
}
