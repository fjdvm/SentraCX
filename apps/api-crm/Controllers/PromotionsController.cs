using Crm.Api.DTOs.Requests;
using Crm.Api.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Crm.Api.Controllers;

[ApiController]
[Route("api/v1/promotions")]
[Authorize]
public class PromotionsController(IPromotionService promotionService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? status = null)
    {
        var result = await promotionService.GetAllAsync(status);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var result = await promotionService.GetByIdAsync(id);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreatePromotionRequestDto dto)
    {
        var result = await promotionService.CreateAsync(dto);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdatePromotionRequestDto dto)
    {
        var success = await promotionService.UpdateAsync(id, dto);
        return success ? NoContent() : BadRequest(new { message = "Cannot edit promotion or promotion not found." });
    }

    [HttpPut("{id:guid}/status")]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] UpdatePromotionStatusRequestDto dto)
    {
        var success = await promotionService.UpdateStatusAsync(id, dto.Status);
        return success ? NoContent() : NotFound();
    }

    [HttpDelete("{id:guid}/cancel")]
    public async Task<IActionResult> Cancel(Guid id)
    {
        var success = await promotionService.CancelAsync(id);
        return success ? NoContent() : NotFound();
    }
}
