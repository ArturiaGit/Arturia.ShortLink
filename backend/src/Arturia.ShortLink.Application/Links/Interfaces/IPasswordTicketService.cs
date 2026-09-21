namespace Arturia.ShortLink.Application.Links.Interfaces;

public interface IPasswordTicketService
{
    string GenerateTicket(ulong domainId, string slug, string passwordHash, DateTimeOffset expiresAt);
    bool ValidateTicket(string? ticket, ulong domainId, string slug, string? passwordHash);
}
