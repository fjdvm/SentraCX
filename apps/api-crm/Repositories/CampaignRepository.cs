using Crm.Api.Data;
using Crm.Api.Interfaces.Repositories;
using Crm.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Crm.Api.Repositories;

public class CampaignRepository(AppDbContext dbContext) : ICampaignRepository
{
    public async Task<IEnumerable<Campaign>> GetAllAsync(string? status = null)
    {
        var query = dbContext.Campaigns
            .Include(c => c.CampaignSchedule)
            .AsNoTracking();

        if (!string.IsNullOrWhiteSpace(status))
        {
            query = query.Where(c => c.Status.ToLower() == status.ToLower());
        }

        return await query.OrderByDescending(c => c.CreatedAt).ToListAsync();
    }

    public async Task<Campaign?> GetByIdAsync(Guid id)
    {
        return await dbContext.Campaigns
            .Include(c => c.CampaignSchedule)
            .Include(c => c.Template)
            .FirstOrDefaultAsync(c => c.Id == id);
    }

    public async Task<Campaign> AddAsync(Campaign campaign)
    {
        if (!await dbContext.Users.AnyAsync(u => u.Id == campaign.CreatedById))
        {
            var fallbackUser = await dbContext.Users.FirstOrDefaultAsync();
            if (fallbackUser != null)
            {
                campaign.CreatedById = fallbackUser.Id;
            }
        }

        dbContext.Campaigns.Add(campaign);
        await dbContext.SaveChangesAsync();
        return campaign;
    }

    public async Task UpdateAsync(Campaign campaign)
    {
        dbContext.Campaigns.Update(campaign);
        await dbContext.SaveChangesAsync();
    }

    public async Task DeleteAsync(Guid id)
    {
        var campaign = await dbContext.Campaigns.FindAsync(id);
        if (campaign != null)
        {
            campaign.Status = "Ended";
            dbContext.Campaigns.Update(campaign);
            await dbContext.SaveChangesAsync();
        }
    }
}
