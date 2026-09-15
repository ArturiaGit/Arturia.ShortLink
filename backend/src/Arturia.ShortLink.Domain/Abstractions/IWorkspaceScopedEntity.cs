namespace Arturia.ShortLink.Domain.Abstractions;

public interface IWorkspaceScopedEntity
{
    ulong WorkspaceId { get; set; }
}
