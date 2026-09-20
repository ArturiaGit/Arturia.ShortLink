using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Encodings.Web;
using Arturia.ShortLink.Infrastructure.Persistence;
using Arturia.ShortLink.Infrastructure.Security;
using Microsoft.AspNetCore.Authentication;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;

namespace Arturia.ShortLink.Infrastructure.Authentication;

public sealed class DualBearerAuthenticationHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> schemeOptions,
    ILoggerFactory logger,
    UrlEncoder encoder,
    IOptions<JwtOptions> jwtOptions,
    AppDbContext dbContext)
    : AuthenticationHandler<AuthenticationSchemeOptions>(schemeOptions, logger, encoder)
{
    public const string SchemeName = "DualBearer";
    public const string CredentialTypeClaim = "credential_type";
    public const string WorkspaceIdClaim = "workspace_id";
    public const string ApiKeyHashClaim = "api_key_hash";
    public const string JwtCredential = "jwt";
    public const string ApiKeyCredential = "api_key";

    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var authorization = Request.Headers.Authorization.ToString();
        if (!authorization.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
            return AuthenticateResult.NoResult();
        var token = authorization["Bearer ".Length..].Trim();
        if (string.IsNullOrEmpty(token)) return AuthenticateResult.Fail("Bearer 凭据为空");
        return token.StartsWith("art_live_", StringComparison.Ordinal)
            ? await AuthenticateApiKeyAsync(token)
            : AuthenticateJwt(token);
    }

    private async Task<AuthenticateResult> AuthenticateApiKeyAsync(string plaintext)
    {
        var hash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(plaintext))).ToLowerInvariant();
        // 认证发生在租户上下文建立之前，必须跨租户按不可逆哈希精确定位密钥。
        var apiKey = await dbContext.ApiKeys.IgnoreQueryFilters()
            .SingleOrDefaultAsync(value => value.KeyHash == hash, Context.RequestAborted);
        if (apiKey is null || apiKey.ExpiresAt is { } expiresAt && expiresAt <= DateTime.UtcNow)
            return AuthenticateResult.Fail("API Key 无效或已过期");

        apiKey.LastUsedAt = DateTime.UtcNow;
        await dbContext.SaveChangesAsync(Context.RequestAborted);
        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, apiKey.CreatedBy.ToString()),
            new Claim(WorkspaceIdClaim, apiKey.WorkspaceId.ToString()),
            new Claim(ClaimTypes.Role, "admin"),
            new Claim(CredentialTypeClaim, ApiKeyCredential),
            new Claim(ApiKeyHashClaim, hash)
        };
        var principal = new ClaimsPrincipal(new ClaimsIdentity(claims, SchemeName, ClaimTypes.Name, ClaimTypes.Role));
        return AuthenticateResult.Success(new AuthenticationTicket(principal, SchemeName));
    }

    private AuthenticateResult AuthenticateJwt(string token)
    {
        try
        {
            var settings = jwtOptions.Value;
            var handler = new JwtSecurityTokenHandler { MapInboundClaims = false };
            var principal = handler.ValidateToken(token, new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                ValidIssuer = settings.Issuer,
                ValidAudience = settings.Audience,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(settings.SecretKey)),
                NameClaimType = JwtRegisteredClaimNames.Name
            }, out _);
            ((ClaimsIdentity)principal.Identity!).AddClaim(new Claim(CredentialTypeClaim, JwtCredential));
            return AuthenticateResult.Success(new AuthenticationTicket(principal, SchemeName));
        }
        catch (Exception exception) when (exception is SecurityTokenException or ArgumentException)
        {
            return AuthenticateResult.Fail("JWT 无效");
        }
    }
}
