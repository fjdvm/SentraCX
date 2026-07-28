using Crm.Api.DTOs.Requests;
using Crm.Api.DTOs.Responses;
using Crm.Api.Interfaces.Services;
using Microsoft.AspNetCore.Mvc;

namespace Crm.Api.Controllers;

[ApiController]
[Route("api/v1/tickets")]
// [Authorize] // TODO: Re-enable authentication before production/merge to main
public class TicketsController(ITicketService ticketService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? status = null,
        [FromQuery] Guid? customerId = null,
        // TODO (auth): Extract assignedToId from JWT claims (e.g. User.FindFirstValue("sub"))
        //              when [Authorize] is re-enabled. Null = no filter (dev bypass mode).
        [FromQuery] string? assignedToId = null)
    {
        var result = await ticketService.GetAllAsync(page, pageSize, status, customerId, assignedToId);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var result = await ticketService.GetByIdAsync(id);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPost]
    public async Task<IActionResult> Create(
        [FromBody] CreateTicketRequestDto dto,
        [FromQuery] Guid customerId) // TODO: Extract from JWT claims when auth is re-enabled
    {
        var result = await ticketService.CreateAsync(dto, customerId);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [HttpPut("{id:guid}/claim")]
    public async Task<IActionResult> Claim(
        Guid id,
        [FromQuery] string staffUserId) // TODO: Extract from JWT claims when auth is re-enabled
    {
        var success = await ticketService.ClaimAsync(id, staffUserId);
        return success ? NoContent() : NotFound();
    }

    [HttpPut("{id:guid}/unclaim")]
    public async Task<IActionResult> Unclaim(Guid id)
    {
        var success = await ticketService.UnclaimAsync(id);
        return success ? NoContent() : NotFound();
    }

    [HttpPut("{id:guid}/status")]
    public async Task<IActionResult> UpdateStatus(
        Guid id,
        [FromBody] UpdateTicketStatusRequestDto dto)
    {
        var success = await ticketService.UpdateStatusAsync(id, dto);
        return success ? NoContent() : NotFound();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Cancel(Guid id)
    {
        var success = await ticketService.CancelAsync(id);
        return success ? NoContent() : NotFound();
    }

    [HttpPost("{id:guid}/escalate")]
    public async Task<IActionResult> Escalate(Guid id, [FromBody] EscalateConversationRequestDto dto)
    {
        var success = await ticketService.EscalateAsync(id, dto.BotSummary);
        if (!success) return NotFound();

        return Ok(new EscalationResponseDto
        {
            TicketId = id,
            ConversationGroupId = id.ToString(),
            Status = "Unclaimed"
        });
    }
}
