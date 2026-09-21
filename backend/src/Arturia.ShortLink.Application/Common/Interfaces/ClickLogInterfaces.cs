using Arturia.ShortLink.Domain.Common;

namespace Arturia.ShortLink.Application.Common.Interfaces;

public interface IChannelLogWriter
{
    bool TryWrite(ClickLogEvent logEvent);
    long DroppedEventsCount { get; }
}

public sealed record UserAgentInfo(string DeviceType, string Os, string Browser);

public interface IUserAgentParser
{
    UserAgentInfo Parse(string? userAgent);
}

public sealed record GeoLocationResult(string Country, string Region, string City);

public interface IGeoLocationResolver
{
    ValueTask<GeoLocationResult> ResolveAsync(string ipAddress, CancellationToken cancellationToken = default);
}
