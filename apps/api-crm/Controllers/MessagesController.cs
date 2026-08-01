using Crm.Api.DTOs.Requests;
using Crm.Api.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Crm.Api.Controllers;

[ApiController]
[Route("api/v1/tickets/{ticketId:guid}/messages")]
[Authorize]
public class MessagesController(IMessageService messageService) : ControllerBase
{
    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetByTicket(Guid ticketId)
    {
        var messages = await messageService.GetByTicketIdAsync(ticketId);
        return Ok(messages);
    }

    [HttpPost]
    [AllowAnonymous]
    public async Task<IActionResult> Create(
        Guid ticketId,
        [FromBody] CreateMessageRequestDto dto,
        [FromQuery] string senderId)
    {
        var result = await messageService.CreateAsync(ticketId, senderId, dto);
        return result is null ? BadRequest("Ticket is not active or does not exist.") : Created("", result);
    }

    [HttpPut("{messageId:guid}/read")]
    public async Task<IActionResult> MarkAsRead(Guid ticketId, Guid messageId)
    {
        await messageService.MarkAsReadAsync(messageId);
        return NoContent();
    }
}
