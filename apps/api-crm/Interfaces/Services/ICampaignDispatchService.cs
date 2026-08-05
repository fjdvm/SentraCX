using Crm.Api.DTOs.Responses;

namespace Crm.Api.Interfaces.Services;

public interface ICampaignDispatchService
{
    Task<CampaignDispatchResultDto> DispatchAsync(Guid campaignId);
}
