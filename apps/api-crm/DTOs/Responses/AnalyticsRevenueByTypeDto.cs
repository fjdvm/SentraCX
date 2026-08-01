namespace Crm.Api.DTOs.Responses;

public class AnalyticsRevenueByTypeDto
{
    public string CustomerType { get; set; } = string.Empty;
    public decimal TotalRevenue { get; set; }
    public int CustomerCount { get; set; }
}
