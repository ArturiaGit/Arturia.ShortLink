using Arturia.ShortLink.Application.Auth.Interfaces;

namespace Arturia.ShortLink.Infrastructure.Security;

public sealed class BCryptPasswordHasher : IPasswordHasher
{
    private const int WorkFactor = 11;

    public string HashPassword(string password) => BCrypt.Net.BCrypt.EnhancedHashPassword(password, WorkFactor);

    public bool VerifyPassword(string password, string passwordHash)
    {
        try
        {
            if (BCrypt.Net.BCrypt.EnhancedVerify(password, passwordHash)) return true;
        }
        catch (BCrypt.Net.SaltParseException)
        {
            return false;
        }

        // 兼容阶段一演示种子中使用标准 BCrypt 生成的旧哈希。
        return BCrypt.Net.BCrypt.Verify(password, passwordHash);
    }
}
