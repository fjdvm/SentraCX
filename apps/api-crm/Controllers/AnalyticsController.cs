using Crm.Api.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Crm.Api.Controllers;

[ApiController]
[Route("api/v1/analytics")]
[Authorize]
public class AnalyticsController(IAnalyticsService analyticsService) : ControllerBase
{
    [HttpGet("tickets/daily-counts")]
    [AllowAnonymous]
    public async Task<IActionResult> GetDailyTicketCounts([FromQuery] DateTime? from, [FromQuery] DateTime? to)
    {
        var toDate = to ?? DateTime.UtcNow;
        var fromDate = from ?? toDate.AddDays(-30);

        var result = await analyticsService.GetDailyTicketCountsAsync(fromDate, toDate);
        return Ok(result);
    }

    [HttpGet("orders/revenue-by-customer-type")]
    [AllowAnonymous]
    public async Task<IActionResult> GetRevenueByCustomerType([FromQuery] DateTime? from, [FromQuery] DateTime? to)
    {
        var toDate = to ?? DateTime.UtcNow;
        var fromDate = from ?? toDate.AddDays(-30);

        var result = await analyticsService.GetRevenueByCustomerTypeAsync(fromDate, toDate);
        return Ok(result);
    }

    [HttpGet("tickets/resolution-stats")]
    [AllowAnonymous]
    public async Task<IActionResult> GetResolutionStats([FromQuery] DateTime? from, [FromQuery] DateTime? to)
    {
        var toDate = to ?? DateTime.UtcNow;
        var fromDate = from ?? toDate.AddDays(-30);

        var result = await analyticsService.GetResolutionStatsAsync(fromDate, toDate);
        return Ok(result);
    }
}
