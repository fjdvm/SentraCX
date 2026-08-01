using Crm.Api.DTOs.Responses;
using Crm.Api.Interfaces.Repositories;
using Crm.Api.Interfaces.Services;

namespace Crm.Api.Services;

public class AnalyticsService(IAnalyticsRepository analyticsRepository) : IAnalyticsService
{
    public Task<List<AnalyticsDailyCountDto>> GetDailyTicketCountsAsync(DateTime from, DateTime to)
    {
        return analyticsRepository.GetDailyTicketCountsAsync(from, to);
    }

    public Task<List<AnalyticsRevenueByTypeDto>> GetRevenueByCustomerTypeAsync(DateTime from, DateTime to)
    {
        return analyticsRepository.GetRevenueByCustomerTypeAsync(from, to);
    }

    public Task<AnalyticsResolutionStatsDto> GetResolutionStatsAsync(DateTime from, DateTime to)
    {
        return analyticsRepository.GetResolutionStatsAsync(from, to);
    }
}
