using System.Text.Json;
using Arturia.ShortLink.Api.Serialization;

namespace Arturia.ShortLink.IntegrationTests;

public sealed class SerializationConventionTests
{
    [Fact]
    public void IdsAreStringsAndTimesAreUtcIso8601()
    {
        var options = new JsonSerializerOptions(JsonSerializerDefaults.Web);
        options.Converters.Add(new UtcDateTimeJsonConverter());
        options.Converters.Add(new NullableUtcDateTimeJsonConverter());

        var json = JsonSerializer.Serialize(new ConventionDto(ulong.MaxValue.ToString(), 3482, new DateTime(2026, 9, 14, 12, 30, 0, DateTimeKind.Unspecified)), options);
        using var document = JsonDocument.Parse(json);

        Assert.Equal(ulong.MaxValue.ToString(), document.RootElement.GetProperty("id").GetString());
        Assert.Equal(JsonValueKind.Number, document.RootElement.GetProperty("pvCount").ValueKind);
        Assert.EndsWith("Z", document.RootElement.GetProperty("createdAt").GetString());
    }

    private sealed record ConventionDto(string Id, ulong PvCount, DateTime CreatedAt);
}
