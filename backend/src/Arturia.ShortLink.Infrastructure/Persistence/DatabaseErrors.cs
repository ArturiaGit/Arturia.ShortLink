using Microsoft.EntityFrameworkCore;
using MySqlConnector;

namespace Arturia.ShortLink.Infrastructure.Persistence;

public static class DatabaseErrors
{
    public static bool IsDuplicateKey(DbUpdateException exception) =>
        exception.InnerException is MySqlException { ErrorCode: MySqlErrorCode.DuplicateKeyEntry };

    public static bool IsConcurrencyConflict(Exception exception)
    {
        for (var current = exception; current is not null; current = current.InnerException)
        {
            if (current is MySqlException { ErrorCode: MySqlErrorCode.DuplicateKeyEntry or MySqlErrorCode.LockDeadlock or MySqlErrorCode.LockWaitTimeout })
                return true;
        }
        return false;
    }
}
