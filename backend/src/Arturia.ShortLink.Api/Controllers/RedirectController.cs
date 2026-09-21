using Arturia.ShortLink.Api.Extensions;
using Arturia.ShortLink.Api.Services;
using Arturia.ShortLink.Application.Common.Interfaces;
using Arturia.ShortLink.Application.Links.Interfaces;
using Arturia.ShortLink.Domain.Common;
using Arturia.ShortLink.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.Primitives;

namespace Arturia.ShortLink.Api.Controllers;

[ApiController]
[AllowAnonymous]
[ApiExplorerSettings(IgnoreApi = true)]
public sealed class RedirectController : ControllerBase
{
    [HttpGet("/{slug:regex(^[[a-zA-Z0-9_-]]{{3,32}}$)}")]
    [EnableRateLimiting(RateLimiterExtensions.PublicRedirectPolicy)]
    public async Task<IActionResult> RedirectToTarget(string slug, [FromServices] AppDbContext db,
        [FromServices] IChannelLogWriter channelWriter, [FromServices] IPasswordTicketService ticketService,
        [FromServices] IConfiguration config, [FromServices] IWebHostEnvironment environment, CancellationToken cancellationToken)
    {
        Response.Headers.CacheControl = "no-cache, no-store, max-age=0, must-revalidate";
        Response.Headers.Pragma = "no-cache";
        var (domain, link) = await PublicLinkLookup.FindAsync(db, Request.Host, slug, cancellationToken);
        var notFound = config["Platform:DefaultNotFoundUrl"] ?? "https://art.link/404";
        if (domain is null) return Redirect(notFound);

        string StatusPage(string path)
        {
            var developmentBase = environment.IsDevelopment() ? config["Frontend:BaseUrl"] : null;
            var baseUrl = !string.IsNullOrWhiteSpace(developmentBase) ? developmentBase.TrimEnd('/') : $"https://{domain.Domain}";
            return baseUrl + path;
        }

        if (link is null) return Redirect(StatusPage("/404"));
        if (link.IsBanned) return Redirect(StatusPage("/banned"));
        if (!link.IsEnabled) return Redirect(StatusPage("/suspended"));
        if (link.ExpiresAt is { } expiry && expiry <= DateTime.UtcNow) return Redirect(StatusPage("/expired"));
        if (!string.IsNullOrEmpty(link.PasswordHash) &&
            !ticketService.ValidateTicket(Request.Cookies[$"art_pwd_ticket_{slug}"], domain.Id, slug, link.PasswordHash))
            return Redirect(StatusPage($"/unlock/{slug}"));

        var uri = new UriBuilder(link.OriginalUrl);
        var parameters = new Dictionary<string, StringValues>(QueryHelpers.ParseQuery(uri.Query), StringComparer.OrdinalIgnoreCase);
        foreach (var (key, value) in Request.Query) parameters[key] = value;
        uri.Query = QueryString.Create(parameters.SelectMany(pair => pair.Value.Select(value => new KeyValuePair<string, string?>(pair.Key, value)))).Value?.TrimStart('?');
        string? Utm(string name) => parameters.TryGetValue(name, out var values) ? values.FirstOrDefault() : null;
        var remoteIp = HttpContext.Connection.RemoteIpAddress;
        var ip = remoteIp is null ? "0.0.0.0" : remoteIp.IsIPv4MappedToIPv6 ? remoteIp.MapToIPv4().ToString() : remoteIp.ToString();
        channelWriter.TryWrite(new ClickLogEvent(link.Id, link.WorkspaceId, ip,
            Request.Headers.UserAgent.ToString(), Request.Headers.Referer.ToString(), DateTime.UtcNow,
            Utm("utm_source") ?? link.UtmSource, Utm("utm_medium") ?? link.UtmMedium,
            Utm("utm_campaign") ?? link.UtmCampaign, Utm("utm_term") ?? link.UtmTerm,
            Utm("utm_content") ?? link.UtmContent));
        return Redirect(uri.Uri.AbsoluteUri);
    }
}
