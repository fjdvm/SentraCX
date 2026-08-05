using Crm.Api.DTOs.Requests;
using Crm.Api.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Crm.Api.Controllers;

[ApiController]
[Route("api/v1/customers")]
[Authorize]
public class CustomersController(ICustomerService customerService) : ControllerBase
{
    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? customerType = null,
        [FromQuery] string? searchTerm = null)
    {
        var result = await customerService.GetAllAsync(page, pageSize, customerType, searchTerm);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetById(Guid id)
    {
        var result = await customerService.GetByIdAsync(id);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateCustomerRequestDto dto)
    {
        try
        {
            var result = await customerService.CreateAsync(dto);
            return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { message = ex.Message });
        }
    }

    [HttpPut("{id:guid}/status")]
    public async Task<IActionResult> UpdateStatus(
        Guid id, [FromBody] UpdateCustomerStatusRequestDto dto)
    {
        var success = await customerService.UpdateStatusAsync(id, dto);
        return success ? NoContent() : NotFound();
    }

    [HttpPut("{id:guid}/type")]
    public async Task<IActionResult> UpdateType(
        Guid id, [FromBody] UpdateCustomerTypeRequestDto dto)
    {
        try
        {
            var success = await customerService.UpdateTypeAsync(id, dto);
            return success ? NoContent() : NotFound();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id:guid}/notes")]
    public async Task<IActionResult> UpdateNotes(
        Guid id, [FromBody] UpdateCustomerNotesRequestDto dto)
    {
        var success = await customerService.UpdateNotesAsync(id, dto);
        return success ? NoContent() : NotFound();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var success = await customerService.SoftDeleteAsync(id);
        return success ? NoContent() : NotFound();
    }

    [HttpPost("{id:guid}/retention-action")]
    public async Task<IActionResult> ExecuteRetentionAction(Guid id, [FromBody] RetentionActionRequestDto dto)
    {
        var (success, ticketId, message) = await customerService.ExecuteRetentionActionAsync(id, dto);
        
        if (!success)
        {
            if (message == "Customer not found") return NotFound(new { message });
            return BadRequest(new { message });
        }
        
        return Ok(new { ticketId, message });
    }
}
