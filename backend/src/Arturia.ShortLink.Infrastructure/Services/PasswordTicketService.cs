using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using Arturia.ShortLink.Application.Links.Interfaces;
using Microsoft.Extensions.Configuration;

namespace Arturia.ShortLink.Infrastructure.Services;

public sealed class PasswordTicketService : IPasswordTicketService
{
    private readonly byte[] secret;

    public PasswordTicketService(IConfiguration configuration)
    {
        var dedicated = configuration["ShortLink:PasswordTicketSecret"];
        var master = configuration["Jwt:SecretKey"];
        if (string.IsNullOrWhiteSpace(dedicated) && string.IsNullOrWhiteSpace(master))
            throw new InvalidOperationException("必须配置密码票据签名密钥。");
        secret = string.IsNullOrWhiteSpace(dedicated)
            ? HMACSHA256.HashData(Encoding.UTF8.GetBytes(master!), Encoding.UTF8.GetBytes("shortlink-password-ticket-v1"))
            : Encoding.UTF8.GetBytes(dedicated);
        if (secret.Length < 32) throw new InvalidOperationException("密码票据签名密钥至少需要 32 字节。");
    }

    public string GenerateTicket(ulong domainId, string slug, string passwordHash, DateTimeOffset expiresAt)
    {
        var payload = $"{domainId}:{slug}:{passwordHash[..Math.Min(8, passwordHash.Length)]}:{expiresAt.ToUnixTimeSeconds()}";
        var bytes = Encoding.UTF8.GetBytes(payload);
        return $"{Base64Url(bytes)}.{Base64Url(HMACSHA256.HashData(secret, bytes))}";
    }

    public bool ValidateTicket(string? ticket, ulong domainId, string slug, string? passwordHash)
    {
        if (string.IsNullOrWhiteSpace(ticket) || string.IsNullOrEmpty(passwordHash)) return false;
        try
        {
            var parts = ticket.Split('.');
            if (parts.Length != 2) return false;
            var payload = FromBase64Url(parts[0]);
            var signature = FromBase64Url(parts[1]);
            if (signature.Length != 32 || !CryptographicOperations.FixedTimeEquals(HMACSHA256.HashData(secret, payload), signature)) return false;
            var fields = Encoding.UTF8.GetString(payload).Split(':');
            return fields.Length == 4 && ulong.TryParse(fields[0], NumberStyles.None, CultureInfo.InvariantCulture, out var id)
                && id == domainId && string.Equals(fields[1], slug, StringComparison.Ordinal)
                && string.Equals(fields[2], passwordHash[..Math.Min(8, passwordHash.Length)], StringComparison.Ordinal)
                && long.TryParse(fields[3], NumberStyles.None, CultureInfo.InvariantCulture, out var expires)
                && expires > DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        }
        catch (FormatException) { return false; }
        catch (ArgumentException) { return false; }
    }

    private static string Base64Url(byte[] bytes) => Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');
    private static byte[] FromBase64Url(string value) => Convert.FromBase64String(value.Replace('-', '+').Replace('_', '/') + new string('=', (4 - value.Length % 4) % 4));
}
