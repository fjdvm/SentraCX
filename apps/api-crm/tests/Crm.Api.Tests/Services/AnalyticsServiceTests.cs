using Crm.Api.DTOs.Responses;
using Crm.Api.Interfaces.Repositories;
using Crm.Api.Services;
using Moq;

namespace Crm.Api.Tests.Services;

public class AnalyticsServiceTests
{
    private readonly Mock<IAnalyticsRepository> _analyticsRepoMock = new();
    private readonly AnalyticsService _sut;

    public AnalyticsServiceTests()
    {
        _sut = new AnalyticsService(_analyticsRepoMock.Object);
    }

    [Fact]
    public async Task GetDailyTicketCountsAsync_ReturnsCounts()
    {
        var from = DateTime.UtcNow.AddDays(-5);
        var to = DateTime.UtcNow;
        var expected = new List<AnalyticsDailyCountDto>
        {
            new() { Date = "2026-08-01", Count = 5 }
        };

        _analyticsRepoMock
            .Setup(r => r.GetDailyTicketCountsAsync(from, to))
            .ReturnsAsync(expected);

        var result = await _sut.GetDailyTicketCountsAsync(from, to);

        Assert.Single(result);
        Assert.Equal("2026-08-01", result[0].Date);
        Assert.Equal(5, result[0].Count);
    }

    [Fact]
    public async Task GetRevenueByCustomerTypeAsync_ReturnsRevenue()
    {
        var from = DateTime.UtcNow.AddDays(-5);
        var to = DateTime.UtcNow;
        var expected = new List<AnalyticsRevenueByTypeDto>
        {
            new() { CustomerType = "Regular", TotalRevenue = 150.00m, CustomerCount = 3 }
        };

        _analyticsRepoMock
            .Setup(r => r.GetRevenueByCustomerTypeAsync(from, to))
            .ReturnsAsync(expected);

        var result = await _sut.GetRevenueByCustomerTypeAsync(from, to);

        Assert.Single(result);
        Assert.Equal("Regular", result[0].CustomerType);
        Assert.Equal(150.00m, result[0].TotalRevenue);
        Assert.Equal(3, result[0].CustomerCount);
    }
}
