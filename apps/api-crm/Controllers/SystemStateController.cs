using Microsoft.AspNetCore.Mvc;
using Crm.Api.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using System.Threading.Tasks;

namespace Crm.Api.Controllers;

[ApiController]
[Route("api/v1/system-state")]
// Unauthenticated in dev for AI analytics direct call, or add Authorize if service tokens are used
public class SystemStateController : ControllerBase
{
    private readonly ISystemStateService _systemStateService;

    public SystemStateController(ISystemStateService systemStateService)
    {
        _systemStateService = systemStateService;
    }

    [HttpGet("snapshot")]
    public async Task<IActionResult> GetSnapshot()
    {
        var snapshot = await _systemStateService.GetGlobalSnapshotAsync();
        return Ok(snapshot);
    }
}
