using Arturia.ShortLink.Application.Common;
using Microsoft.AspNetCore.Mvc;

namespace Arturia.ShortLink.Api.Controllers;

[ApiController]
[Route("api/v1/system")]
public sealed class SystemController : ControllerBase
{
    [HttpGet("version")]
    [ProducesResponseType<ApiResponse<VersionResponse>>(StatusCodes.Status200OK)]
    public ActionResult<ApiResponse<VersionResponse>> GetVersion() => Ok(ApiResponse<VersionResponse>.Ok(new("0.4.0")));
}

public sealed record VersionResponse(string Version);
