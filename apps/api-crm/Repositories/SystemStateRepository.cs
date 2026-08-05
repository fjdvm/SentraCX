using System.Threading.Tasks;
using System.Linq;
using Microsoft.EntityFrameworkCore;
using Crm.Api.Interfaces.Repositories;
using Crm.Api.Data;

namespace Crm.Api.Repositories;

public class SystemStateRepository : ISystemStateRepository
{
    private readonly AppDbContext _dbContext;

    public SystemStateRepository(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<object> GetGlobalSnapshotAsync()
    {
        var recentTickets = await _dbContext.Tickets
            .Include(t => t.Customer)
                .ThenInclude(c => c.User)
            .OrderByDescending(t => t.CreatedAt)
            .Take(50)
            .Select(t => new
            {
                t.Id,
                t.Title,
                t.Status,
                CustomerName = t.Customer != null && t.Customer.User != null ? t.Customer.User.FirstName + " " + t.Customer.User.LastName : "Unknown",
                CustomerEmail = t.Customer != null && t.Customer.User != null ? t.Customer.User.Email : "",
                t.AssignedToId,
                t.CreatedAt
            })
            .ToListAsync();

        var recentOrders = await _dbContext.OrderHistories
            .Include(o => o.CustomerProfile)
                .ThenInclude(c => c.User)
            .OrderByDescending(o => o.OrderedAt)
            .Take(50)
            .Select(o => new
            {
                o.Id,
                o.TotalAmount,
                o.Status,
                CustomerName = o.CustomerProfile != null && o.CustomerProfile.User != null ? o.CustomerProfile.User.FirstName + " " + o.CustomerProfile.User.LastName : "Unknown",
                o.OrderedAt
            })
            .ToListAsync();

        var activeCampaigns = await _dbContext.Campaigns
            .Where(c => c.Status == "Active")
            .Select(c => new
            {
                c.Id,
                c.Title,
                c.CreatedAt,
                c.TargetAudience
            })
            .ToListAsync();

        return new
        {
            RecentTickets = recentTickets,
            RecentOrders = recentOrders,
            ActiveCampaigns = activeCampaigns,
            Timestamp = System.DateTime.UtcNow
        };
    }
}
