using Arturia.ShortLink.Application.Common.Interfaces;

namespace Arturia.ShortLink.Infrastructure.Services;

public sealed class UserAgentParser : IUserAgentParser
{
    public UserAgentInfo Parse(string? userAgent)
    {
        var ua = userAgent ?? string.Empty;
        bool Has(string value) => ua.Contains(value, StringComparison.OrdinalIgnoreCase);
        var device = Has("iPad") || Has("Tablet") ? "平板端" : Has("Mobile") || Has("Android") || Has("iPhone") ? "移动端" : "桌面端";
        var os = Has("Windows") ? "Windows" : Has("iPhone") || Has("iPad") ? "iOS" : Has("Android") ? "Android" : Has("Macintosh") || Has("Mac OS") ? "macOS" : Has("Linux") ? "Linux" : "其他";
        var browser = Has("Edg/") ? "Edge" : Has("Chrome/") ? "Chrome" : Has("Firefox/") ? "Firefox" : Has("Safari/") ? "Safari" : "其他";
        return new UserAgentInfo(device, os, browser);
    }
}
