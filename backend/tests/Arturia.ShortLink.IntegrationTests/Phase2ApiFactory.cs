using Arturia.ShortLink.Api;
using Arturia.ShortLink.Infrastructure.Persistence;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Testcontainers.MySql;
using Arturia.ShortLink.Infrastructure.Context;

namespace Arturia.ShortLink.IntegrationTests;

public sealed class Phase2ApiFactory : WebApplicationFactory<ApiAssemblyMarker>, IAsyncLifetime
{
    private readonly MySqlContainer database = new MySqlBuilder("mysql:8.0.46")
        .WithDatabase("arturia_phase2")
        .WithUsername("arturia_test")
        .WithPassword($"T-{Guid.NewGuid():N}")
        .Build();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.UseSetting("ConnectionStrings:DefaultConnection", database.GetConnectionString());
        builder.UseSetting("Database:AutoMigrate", "true");
        builder.UseSetting("Database:SeedDemoData", "true");
        builder.UseSetting("Jwt:SecretKey", "phase-2-integration-test-secret-key-at-least-32-bytes");
        builder.UseSetting("Jwt:Issuer", "Arturia.ShortLink.Tests");
        builder.UseSetting("Jwt:Audience", "Arturia.ShortLink.Tests");
        builder.UseSetting("Jwt:ExpirationDays", "7");
    }

    public string ConnectionString => database.GetConnectionString();

    public async Task InitializeAsync() => await database.StartAsync();

    async Task IAsyncLifetime.DisposeAsync()
    {
        await DisposeAsync();
        await database.DisposeAsync();
    }

    public async Task<AppDbContext> CreateDbContextAsync()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseMySql(database.GetConnectionString(), ServerVersion.Parse("8.0.46-mysql"))
            .AddInterceptors(new UtcConnectionInterceptor())
            .Options;
        var context = new AppDbContext(options, new WorkspaceContext());
        context.Database.SetCommandTimeout(TimeSpan.FromSeconds(30));
        await Task.CompletedTask;
        return context;
    }
}
