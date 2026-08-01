using Crm.Api.DTOs.Responses;

namespace Crm.Api.Interfaces.Repositories;

public interface IAnalyticsRepository
{
    Task<List<AnalyticsDailyCountDto>> GetDailyTicketCountsAsync(DateTime from, DateTime to);
    Task<List<AnalyticsRevenueByTypeDto>> GetRevenueByCustomerTypeAsync(DateTime from, DateTime to);
    Task<AnalyticsResolutionStatsDto> GetResolutionStatsAsync(DateTime from, DateTime to);
}
