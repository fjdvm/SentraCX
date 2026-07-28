using Crm.Api.DTOs.Requests;
using Crm.Api.Interfaces.Services;
using Microsoft.AspNetCore.Mvc;

namespace Crm.Api.Controllers;

[ApiController]
[Route("api/v1/webhooks")]
public class WebhooksController(IOrderService orderService, ICustomerService customerService) : ControllerBase
{
    [HttpPost("orders")]
    public async Task<IActionResult> ProcessOrderEvent(
        [FromBody] OrderWebhookRequestDto dto)
    {
        await orderService.ProcessWebhookAsync(dto);
        return Ok();
    }

    [HttpPost("customer-signup")]
    public async Task<IActionResult> ProcessCustomerSignup(
        [FromBody] CustomerWebhookRequestDto dto)
    {
        // Idempotent: skip if a user with this email already exists
        var existing = await customerService.GetByEmailAsync(dto.Email);
        if (existing is not null)
        {
            return Ok();
        }

        var createDto = new CreateCustomerRequestDto
        {
            Email = dto.Email,
            FirstName = dto.FirstName,
            LastName = dto.LastName,
            PhoneNumber = dto.PhoneNumber,
            CustomerType = "Regular",
            Address = dto.Address,
            ExternalUserId = dto.ExternalUserId
        };
        await customerService.CreateAsync(createDto);
        return Ok();
    }

    [HttpPost("lead-submission")]
    public async Task<IActionResult> ProcessLeadSubmission(
        [FromBody] CustomerWebhookRequestDto dto)
    {
        var createDto = new CreateCustomerRequestDto
        {
            Email = dto.Email,
            FirstName = dto.FirstName,
            LastName = dto.LastName,
            PhoneNumber = dto.PhoneNumber,
            CustomerType = "Lead",
            Address = dto.Address
        };
        await customerService.CreateAsync(createDto);
        return Ok();
    }
}
