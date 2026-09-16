using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Arturia.ShortLink.Api.Middleware;
using Arturia.ShortLink.Domain.Interfaces;
using Arturia.ShortLink.Infrastructure.Context;
using Arturia.ShortLink.Infrastructure.Persistence;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;

namespace Arturia.ShortLink.IntegrationTests;

public sealed class WorkspaceMiddlewareTests(Phase2ApiFactory factory) : IClassFixture<Phase2ApiFactory>
{
    [Fact]
    public async Task Request_WithValidHeaderWorkspaceId_ShouldSetContextAndSucceed()
    {
        var client = await AuthenticatedClientAsync("admin@arturia.link");
        client.DefaultRequestHeaders.Add("X-Workspace-Id", "1");
        using var response = await client.GetAsync("/api/v1/workspaces/1/members");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Request_WithoutHeader_ShouldFallbackToFirstWorkspace()
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var workspaceContext = new WorkspaceContext();
        var nextCalled = false;
        var middleware = new WorkspaceMiddleware(_ =>
        {
            nextCalled = true;
            return Task.CompletedTask;
        });
        var httpContext = new DefaultHttpContext();
        httpContext.Request.Path = "/api/v1/links";

        await middleware.InvokeAsync(httpContext, dbContext, workspaceContext, new TestCurrentUserService(1, "admin@arturia.link"));

        Assert.True(nextCalled);
        Assert.Equal((ulong)1, workspaceContext.CurrentWorkspaceId);
        Assert.Equal("owner", workspaceContext.CurrentRole);
    }

    [Fact]
    public async Task Request_WithForbiddenWorkspaceId_ShouldReturnForbidden403()
    {
        var client = await AuthenticatedClientAsync("member@arturia.link");
        client.DefaultRequestHeaders.Add("X-Workspace-Id", "2");
        using var response = await client.GetAsync("/api/v1/workspaces/2/members");
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Request_WithConflictingRouteAndHeader_ShouldReturnBadRequest400()
    {
        var client = await AuthenticatedClientAsync("admin@arturia.link");
        client.DefaultRequestHeaders.Add("X-Workspace-Id", "2");
        using var response = await client.GetAsync("/api/v1/workspaces/1/members");
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    private async Task<HttpClient> AuthenticatedClientAsync(string email)
    {
        var client = factory.CreateClient();
        var token = await AuthTests.LoginAsync(client, email, "password123!");
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return client;
    }
}

internal sealed class TestCurrentUserService(ulong? userId, string? email) : ICurrentUserService
{
    public ulong? UserId { get; } = userId;
    public string? Email { get; } = email;
}
