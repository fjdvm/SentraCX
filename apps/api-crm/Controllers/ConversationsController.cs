using Crm.Api.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Threading.Tasks;

namespace Crm.Api.Controllers;

[ApiController]
[Route("api/v1/tickets")]
[Authorize]
public class ConversationsController(IMessageService messageService) : ControllerBase
{
    [HttpGet("{id:guid}/messages")]
    public async Task<IActionResult> GetMessagesSince(Guid id, [FromQuery] DateTime since)
    {
        var messages = await messageService.GetSinceAsync(id, since);
        return Ok(messages);
    }
}
