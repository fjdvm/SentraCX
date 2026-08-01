namespace Crm.Api.DTOs.Responses;

public class AnalyticsResolutionStatsDto
{
    public double AvgResolutionHours { get; set; }
    public int ResolvedCount { get; set; }
    public double PrevAvgResolutionHours { get; set; }
    public int PrevResolvedCount { get; set; }
}
