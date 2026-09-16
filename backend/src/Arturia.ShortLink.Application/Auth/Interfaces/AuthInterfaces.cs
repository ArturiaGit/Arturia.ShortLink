using Arturia.ShortLink.Application.Auth.Dtos;
using Arturia.ShortLink.Domain.Entities;

namespace Arturia.ShortLink.Application.Auth.Interfaces;

public interface IAuthService
{
    Task<AuthResponseDto> LoginAsync(LoginRequest request, CancellationToken cancellationToken);
    Task<AuthResponseDto> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken);
    Task<AuthMeResponseDto> GetMeAsync(ulong userId, CancellationToken cancellationToken);
}

public interface IPasswordHasher
{
    string HashPassword(string password);
    bool VerifyPassword(string password, string passwordHash);
}

public interface IJwtTokenService
{
    string CreateToken(User user);
}
