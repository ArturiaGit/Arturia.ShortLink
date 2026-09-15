using System.Reflection;
using System.Text.Json;
using Arturia.ShortLink.Api;

namespace Arturia.ShortLink.IntegrationTests;

public sealed class VersionConsistencyTests
{
    [Fact]
    public void RepositoryVersionsAreConsistent()
    {
        var root = RepositoryPaths.FindRoot();
        var rootVersion = ReadVersion(Path.Combine(root, "package.json"));
        var frontendVersion = ReadVersion(Path.Combine(root, "frontend", "package.json"));
        var assemblyVersion = typeof(ApiAssemblyMarker).Assembly
            .GetCustomAttribute<AssemblyInformationalVersionAttribute>()?.InformationalVersion
            .Split('+')[0];

        Assert.Equal("0.4.0", rootVersion);
        Assert.Equal(rootVersion, frontendVersion);
        Assert.Equal(rootVersion, assemblyVersion);
    }

    private static string ReadVersion(string path)
    {
        using var document = JsonDocument.Parse(File.ReadAllText(path));
        return document.RootElement.GetProperty("version").GetString()!;
    }
}

internal static class RepositoryPaths
{
    public static string FindRoot()
    {
        var directory = new DirectoryInfo(AppContext.BaseDirectory);
        while (directory is not null && !File.Exists(Path.Combine(directory.FullName, "AGENTS.md")))
        {
            directory = directory.Parent;
        }

        return directory?.FullName ?? throw new DirectoryNotFoundException("无法定位仓库根目录。");
    }
}
