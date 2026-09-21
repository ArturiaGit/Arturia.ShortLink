using System.Globalization;
using Arturia.ShortLink.Domain.Entities;
using Arturia.ShortLink.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using ShortLinkEntity = Arturia.ShortLink.Domain.Entities.ShortLink;

namespace Arturia.ShortLink.Api.Services;

public static class PublicLinkLookup
{
    public static async Task<(LinkDomain? Domain, ShortLinkEntity? Link)> FindAsync(AppDbContext db, HostString requestHost, string slug, CancellationToken cancellationToken)
    {
        string host;
        try
        {
            host = new IdnMapping().GetAscii(requestHost.Host.TrimEnd('.')).ToLowerInvariant();
            if (host.Length is < 1 or > 253 || host.Contains('/') || host.Contains('\\') || host.Any(char.IsWhiteSpace)) return (null, null);
        }
        catch (ArgumentException) { return (null, null); }

        var domain = await db.LinkDomains.AsNoTracking().SingleOrDefaultAsync(d => d.Domain == host && d.IsVerified, cancellationToken);
        if (domain is null) return (null, null);
        var link = await db.ShortLinks.IgnoreQueryFilters().AsNoTracking()
            .SingleOrDefaultAsync(l => l.DomainId == domain.Id && l.Slug == slug && l.DeletedAt == null, cancellationToken);
        return (domain, link);
    }
}
