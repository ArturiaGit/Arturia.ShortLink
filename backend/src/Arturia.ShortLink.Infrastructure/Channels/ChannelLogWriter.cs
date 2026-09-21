using System.Threading.Channels;
using Arturia.ShortLink.Application.Common.Interfaces;
using Arturia.ShortLink.Domain.Common;

namespace Arturia.ShortLink.Infrastructure.Channels;

public sealed class ChannelLogWriter(Channel<ClickLogEvent> channel) : IChannelLogWriter
{
    private long droppedEventsCount;
    public long DroppedEventsCount => Interlocked.Read(ref droppedEventsCount);

    public bool TryWrite(ClickLogEvent logEvent)
    {
        if (channel.Writer.TryWrite(logEvent)) return true;
        Interlocked.Increment(ref droppedEventsCount);
        return false;
    }
}
