using System.Security.Cryptography;
using Arturia.ShortLink.Application.Links.Interfaces;

namespace Arturia.ShortLink.Infrastructure.Services;

public sealed class Base62Generator : IBase62Generator
{
    private const string Alphabet = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

    public string Generate(int length = 6) => RandomNumberGenerator.GetString(Alphabet, length);
}
