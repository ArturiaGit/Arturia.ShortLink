using System.Data.Common;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace Arturia.ShortLink.Infrastructure.Persistence;

public sealed class UtcConnectionInterceptor : DbConnectionInterceptor
{
    public override void ConnectionOpened(DbConnection connection, ConnectionEndEventData eventData) => SetUtc(connection);

    public override async Task ConnectionOpenedAsync(
        DbConnection connection,
        ConnectionEndEventData eventData,
        CancellationToken cancellationToken = default)
    {
        await using var command = connection.CreateCommand();
        command.CommandText = "SET time_zone = '+00:00'";
        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    private static void SetUtc(DbConnection connection)
    {
        using var command = connection.CreateCommand();
        command.CommandText = "SET time_zone = '+00:00'";
        command.ExecuteNonQuery();
    }
}
