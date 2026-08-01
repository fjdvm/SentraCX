using Crm.Api.Data;
using Crm.Api.DTOs.Responses;
using Crm.Api.Interfaces.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Crm.Api.Repositories;

public class AnalyticsRepository(AppDbContext context) : IAnalyticsRepository
{
    public async Task<List<AnalyticsDailyCountDto>> GetDailyTicketCountsAsync(DateTime from, DateTime to)
    {
        var rawData = await context.Tickets
            .Where(t => t.CreatedAt >= from && t.CreatedAt <= to)
            .GroupBy(t => t.CreatedAt.Date)
            .Select(g => new { Date = g.Key, Count = g.Count() })
            .ToListAsync();

        return rawData
            .OrderBy(r => r.Date)
            .Select(r => new AnalyticsDailyCountDto
            {
                Date = r.Date.ToString("yyyy-MM-dd"),
                Count = r.Count
            })
            .ToList();
    }

    public async Task<List<AnalyticsRevenueByTypeDto>> GetRevenueByCustomerTypeAsync(DateTime from, DateTime to)
    {
        var rawRevenue = await context.OrderHistories
            .Where(o => o.OrderedAt >= from && o.OrderedAt <= to)
            .GroupBy(o => o.CustomerProfile.CustomerType)
            .Select(g => new
            {
                CustomerType = g.Key,
                TotalRevenue = g.Sum(o => o.TotalAmount),
                CustomerCount = g.Select(o => o.CustomerId).Distinct().Count()
            })
            .ToListAsync();

        return rawRevenue
            .Select(r => new AnalyticsRevenueByTypeDto
            {
                CustomerType = r.CustomerType,
                TotalRevenue = r.TotalRevenue,
                CustomerCount = r.CustomerCount
            })
            .ToList();
    }

    public async Task<AnalyticsResolutionStatsDto> GetResolutionStatsAsync(DateTime from, DateTime to)
    {
        var duration = to - from;
        var prevFrom = from - duration;
        var prevTo = from;

        var currentTickets = await context.Tickets
            .Where(t => t.Status == "Resolved" && t.UpdatedAt >= from && t.UpdatedAt <= to)
            .Select(t => new { t.CreatedAt, t.UpdatedAt })
            .ToListAsync();

        var prevTickets = await context.Tickets
            .Where(t => t.Status == "Resolved" && t.UpdatedAt >= prevFrom && t.UpdatedAt <= prevTo)
            .Select(t => new { t.CreatedAt, t.UpdatedAt })
            .ToListAsync();

        double avgCurr = 0.0;
        if (currentTickets.Count > 0)
        {
            avgCurr = currentTickets.Average(t => (t.UpdatedAt - t.CreatedAt).TotalHours);
        }

        double avgPrev = 0.0;
        if (prevTickets.Count > 0)
        {
            avgPrev = prevTickets.Average(t => (t.UpdatedAt - t.CreatedAt).TotalHours);
        }

        return new AnalyticsResolutionStatsDto
        {
            AvgResolutionHours = avgCurr,
            ResolvedCount = currentTickets.Count,
            PrevAvgResolutionHours = avgPrev,
            PrevResolvedCount = prevTickets.Count
        };
    }
}
