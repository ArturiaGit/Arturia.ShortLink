using System.ComponentModel.DataAnnotations;

namespace Arturia.ShortLink.Application.Links.Dtos;

public sealed record UnlockLinkCommand([property: Required, StringLength(64, MinimumLength = 1)] string Password);
public sealed record UnlockLinkResultDto(string OriginalUrl, string Ticket);
