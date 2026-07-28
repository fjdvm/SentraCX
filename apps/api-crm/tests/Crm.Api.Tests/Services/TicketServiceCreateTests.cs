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
using Microsoft.AspNetCore.SignalR;
using Crm.Api.Hubs;
using Moq;
using Xunit;

namespace Crm.Api.Tests.Services;

public class TicketServiceCreateTests
{
    private readonly Mock<ITicketRepository> _ticketRepoMock = new();
    private readonly Mock<ICustomerProfileRepository> _customerRepoMock = new();
    private readonly Mock<IAiAnalyticsClient> _aiClientMock = new();
    private readonly Mock<IDashboardBroadcastService> _broadcastMock = new();
    private readonly Mock<IHubContext<ChatHub>> _chatHubMock = new();
    private readonly Mock<IHubClients> _clientsMock = new();
    private readonly Mock<IClientProxy> _clientProxyMock = new();
    private readonly TicketService _sut;

    public TicketServiceCreateTests()
    {
        _clientsMock.Setup(c => c.Group("staff")).Returns(_clientProxyMock.Object);
        _chatHubMock.Setup(h => h.Clients).Returns(_clientsMock.Object);

        _customerRepoMock.Setup(r => r.GetByIdAsync(It.IsAny<Guid>()))
            .ReturnsAsync((Guid id) => new CustomerProfile { Id = id, UserId = id.ToString() });

        _sut = new TicketService(_ticketRepoMock.Object, _customerRepoMock.Object, _aiClientMock.Object, _broadcastMock.Object, _chatHubMock.Object);
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
