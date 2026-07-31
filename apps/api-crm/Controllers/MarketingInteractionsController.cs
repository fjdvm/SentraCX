using Crm.Api.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Crm.Api.Controllers;

[ApiController]
[Route("api/v1/customers/{customerId:guid}/marketing-interactions")]
[Authorize]
public class MarketingInteractionsController(IMarketingInteractionService service) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetByCustomer(
        Guid customerId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10)
    {
        var result = await service.GetByCustomerIdAsync(customerId, page, pageSize);
        return Ok(result);
    }
}
