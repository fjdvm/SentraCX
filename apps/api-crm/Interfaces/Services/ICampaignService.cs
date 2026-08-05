using Crm.Api.DTOs.Requests;
using Crm.Api.DTOs.Responses;

namespace Crm.Api.Interfaces.Services;

public interface ICampaignService
{
    Task<IEnumerable<CampaignListResponseDto>> GetAllAsync(string? status = null);
    Task<CampaignResponseDto?> GetByIdAsync(Guid id);
    Task<CampaignResponseDto> CreateAsync(CreateCampaignRequestDto dto, string createdById);
    Task<bool> UpdateAsync(Guid id, UpdateCampaignRequestDto dto);
    Task<bool> UpdateStatusAsync(Guid id, string status);
    Task<bool> DeleteAsync(Guid id);
}
