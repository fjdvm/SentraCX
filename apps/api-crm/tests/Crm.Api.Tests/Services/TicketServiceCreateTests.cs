using System;
using System.Threading;
using System.Threading.Tasks;
using Crm.Api.DTOs.Requests;
using Crm.Api.DTOs.Responses;
using Crm.Api.Interfaces.Repositories;
using Crm.Api.Interfaces.Clients;
using Crm.Api.Interfaces.Services;
using Crm.Api.Models;
using Crm.Api.Services;
using Moq;
using Xunit;

namespace Crm.Api.Tests.Services;

public class TicketServiceCreateTests
{
    private readonly Mock<ITicketRepository> _ticketRepoMock = new();
    private readonly Mock<IAiAnalyticsClient> _aiClientMock = new();
    private readonly Mock<IDashboardBroadcastService> _broadcastMock = new();
    private readonly TicketService _sut;

    public TicketServiceCreateTests()
    {
        _sut = new TicketService(_ticketRepoMock.Object, _aiClientMock.Object, _broadcastMock.Object);
    }

    [Fact]
    public async Task CreateAsync_ReturnsTicketWithAISuggestions_WhenAICallSucceeds()
    {
        // Arrange
        var customerId = Guid.NewGuid();
        var dto = new CreateTicketRequestDto { Title = "Billing Issue", Description = "Charged twice" };
        var ticket = new Ticket
        {
            Id = Guid.NewGuid(),
            CustomerId = customerId,
            Title = dto.Title,
            Description = dto.Description,
            Status = "Unclaimed"
        };

        _ticketRepoMock.Setup(r => r.AddAsync(It.IsAny<Ticket>())).Returns(Task.CompletedTask);
        _ticketRepoMock.Setup(r => r.GetByIdAsync(It.IsAny<Guid>())).ReturnsAsync(ticket);

        var aiResponse = new AiTicketAnalysisResponseDto
        {
            PredictedCategory = "billing",
            Sentiment = "negative"
        };
        _aiClientMock.Setup(c => c.AnalyzeTicketAsync(
            It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<bool>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(aiResponse);

        // Act
        var result = await _sut.CreateAsync(dto, customerId);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("billing", result.Category);
        Assert.Equal("negative", result.Sentiment);
        _aiClientMock.Verify(c => c.AnalyzeTicketAsync(
            It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<bool>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task CreateAsync_ReturnsTicketWithFallback_WhenAICallThrows()
    {
        // Arrange
        var customerId = Guid.NewGuid();
        var dto = new CreateTicketRequestDto { Title = "Billing Issue", Description = "Charged twice" };
        var ticket = new Ticket
        {
            Id = Guid.NewGuid(),
            CustomerId = customerId,
            Title = dto.Title,
            Description = dto.Description,
            Status = "Unclaimed"
        };

        _ticketRepoMock.Setup(r => r.AddAsync(It.IsAny<Ticket>())).Returns(Task.CompletedTask);
        _ticketRepoMock.Setup(r => r.GetByIdAsync(It.IsAny<Guid>())).ReturnsAsync(ticket);

        _aiClientMock.Setup(c => c.AnalyzeTicketAsync(
            It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<bool>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new System.Net.Http.HttpRequestException("API down"));

        // Act
        var result = await _sut.CreateAsync(dto, customerId);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("Uncategorized", result.Category);
        Assert.Equal("neutral", result.Sentiment);
        _aiClientMock.Verify(c => c.AnalyzeTicketAsync(
            It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<bool>(), It.IsAny<CancellationToken>()), Times.Once);
    }
}
