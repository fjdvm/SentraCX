using Crm.Api.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Crm.Api.Controllers;

[ApiController]
[Route("api/v1/customers/{customerId:guid}/orders")]
[Authorize]
public class OrdersController(IOrderService orderService, ICustomerService customerService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetByCustomer(Guid customerId)
    {
        var customer = await customerService.GetByIdAsync(customerId);
        if (customer is null)
        {
            return NotFound();
        }

        if (customer.CustomerType.Equals("Lead", StringComparison.OrdinalIgnoreCase))
        {
            return StatusCode(403, "Leads do not have order history.");
        }

        var orders = await orderService.GetByCustomerIdAsync(customerId);
        return Ok(orders);
    }
}
