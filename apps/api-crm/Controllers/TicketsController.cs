using Crm.Api.DTOs.Requests;
using Crm.Api.DTOs.Responses;
using Crm.Api.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Crm.Api.Controllers;

[ApiController]
[Route("api/v1/tickets")]
[Authorize]
public class TicketsController(ITicketService ticketService) : ControllerBase
{
    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? status = null,
        [FromQuery] Guid? customerId = null,
        [FromQuery] string? assignedToId = null)
    {
        string? currentUserId = null;
        bool isSuperUser = false;

        if (User.Identity?.IsAuthenticated == true)
        {
            currentUserId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                            ?? User.FindFirst("sub")?.Value;
            
            var superUserClaim = User.FindFirst("isSuperUser")?.Value;
            isSuperUser = !string.IsNullOrEmpty(superUserClaim) && (superUserClaim.ToLower() == "true");

            // If the client explicitly requested a specific assignedToId, we still pass it down,
            // but the repository will enforce the visibility rules based on currentUserId.
        }

        var result = await ticketService.GetAllAsync(page, pageSize, status, customerId, assignedToId, currentUserId, isSuperUser);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetById(Guid id)
    {
        var result = await ticketService.GetByIdAsync(id);
        if (result is null) return NotFound();

        // Enforce visibility rules: an authenticated CRM user can only view
        // Unclaimed tickets or tickets assigned to them.
        if (User.Identity?.IsAuthenticated == true)
        {
            var currentUserId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                                ?? User.FindFirst("sub")?.Value;

            if (!string.IsNullOrEmpty(currentUserId) && 
                result.Status != "Unclaimed" && 
                result.AssignedToId != currentUserId)
            {
                // This covers all users including superadmins
                return Forbid();
            }
        }

        return Ok(result);
    }

    [HttpPost]
    [AllowAnonymous]
    public async Task<IActionResult> Create(
        [FromBody] CreateTicketRequestDto dto,
        [FromQuery] Guid customerId)
    {
        try
        {
            var result = await ticketService.CreateAsync(dto, customerId);
            return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
        }
        catch (InvalidOperationException ex)
        {
            return UnprocessableEntity(new { error = ex.Message });
        }
    }

    [HttpPut("{id:guid}/claim")]
    public async Task<IActionResult> Claim(
        Guid id,
        [FromQuery] string? staffUserId = null)
    {
        // Prefer the authenticated user's ID from the JWT token over the query parameter.
        var resolvedUserId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                             ?? User.FindFirst("sub")?.Value
                             ?? staffUserId;
        if (string.IsNullOrEmpty(resolvedUserId))
            return BadRequest(new { error = "Unable to determine staff user ID." });

        var success = await ticketService.ClaimAsync(id, resolvedUserId);
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
    [AllowAnonymous]
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
