using Crm.Api.DTOs.Requests;
using Crm.Api.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Crm.Api.Controllers;

[ApiController]
[Route("api/v1/campaigns")]
[Authorize]
public class CampaignsController(ICampaignService campaignService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? status = null)
    {
        var result = await campaignService.GetAllAsync(status);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var result = await campaignService.GetByIdAsync(id);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPost]
    public async Task<IActionResult> Create(
        [FromBody] CreateCampaignRequestDto dto,
        [FromQuery] string createdById = "user-001")
    {
        var result = await campaignService.CreateAsync(dto, createdById);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateCampaignRequestDto dto)
    {
        var success = await campaignService.UpdateAsync(id, dto);
        return success ? NoContent() : NotFound();
    }

    [HttpPut("{id:guid}/status")]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromQuery] string status)
    {
        var success = await campaignService.UpdateStatusAsync(id, status);
        return success ? NoContent() : NotFound();
    }

    [HttpPost("{id:guid}/promotions")]
    public async Task<IActionResult> AttachPromotions(
        Guid id,
        [FromBody] AttachPromotionsToCampaignRequestDto dto)
    {
        var success = await campaignService.AttachPromotionsAsync(id, dto.PromotionIds);
        return success ? NoContent() : NotFound();
    }

    [HttpPost("{id:guid}/send")]
    public async Task<IActionResult> Send(
        Guid id,
        [FromServices] ICampaignDispatchService dispatchService)
    {
        var campaign = await campaignService.GetByIdAsync(id);
        if (campaign is null) return NotFound();

        if (!campaign.Channels.Any(c => c.Equals("Email", StringComparison.OrdinalIgnoreCase)))
        {
            return BadRequest(new { message = "Campaign does not include Email channel." });
        }

        var sentCount = await dispatchService.DispatchAsync(id);
        return Ok(new { message = $"Campaign dispatched to {sentCount} recipients.", sentCount });
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var success = await campaignService.DeleteAsync(id);
        return success ? NoContent() : NotFound();
    }
}
