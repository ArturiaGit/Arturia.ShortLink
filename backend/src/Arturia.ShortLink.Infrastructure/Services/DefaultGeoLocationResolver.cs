using System.Net;
using Arturia.ShortLink.Application.Common.Interfaces;

namespace Arturia.ShortLink.Infrastructure.Services;

public sealed class DefaultGeoLocationResolver : IGeoLocationResolver
{
    public ValueTask<GeoLocationResult> ResolveAsync(string ipAddress, CancellationToken cancellationToken = default)
    {
        if (IPAddress.TryParse(ipAddress, out var ip) && (IPAddress.IsLoopback(ip) || ip.IsIPv6LinkLocal || IsPrivate(ip)))
            return ValueTask.FromResult(new GeoLocationResult("本地/内网", "未知", "未知"));
        return ValueTask.FromResult(new GeoLocationResult("未知", "", ""));
    }

    private static bool IsPrivate(IPAddress ip)
    {
        var bytes = ip.MapToIPv4().GetAddressBytes();
        return bytes[0] == 10 || bytes[0] == 172 && bytes[1] is >= 16 and <= 31 || bytes[0] == 192 && bytes[1] == 168;
    }
}
