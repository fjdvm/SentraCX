using Crm.Api.Models;

namespace Crm.Api.Interfaces.Repositories;

public interface ICampaignRepository
{
    Task<IEnumerable<Campaign>> GetAllAsync(string? status = null);
    Task<Campaign?> GetByIdAsync(Guid id);
    Task<Campaign> AddAsync(Campaign campaign);
    Task UpdateAsync(Campaign campaign);
    Task DeleteAsync(Guid id);
}
