namespace Crm.Api.Interfaces.Services;

public interface ICampaignDispatchService
{
    Task<int> DispatchAsync(Guid campaignId);
}
