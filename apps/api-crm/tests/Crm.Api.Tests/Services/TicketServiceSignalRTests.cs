using System;
using System.Threading;
using System.Threading.Tasks;
using Crm.Api.DTOs.Requests;
using Crm.Api.DTOs.Responses;
using Crm.Api.Hubs;
using Crm.Api.Interfaces.Clients;
using Crm.Api.Interfaces.Repositories;
using Crm.Api.Interfaces.Services;
using Crm.Api.Models;
using Crm.Api.Services;
using Microsoft.AspNetCore.SignalR;
using Moq;
using Xunit;

namespace Crm.Api.Tests.Services;

public class TicketServiceSignalRTests
{
    private readonly Mock<ITicketRepository> _ticketRepoMock = new();
    private readonly Mock<ICustomerProfileRepository> _customerRepoMock = new();
    private readonly Mock<IAiAnalyticsClient> _aiClientMock = new();
    private readonly Mock<IDashboardBroadcastService> _broadcastMock = new();
    private readonly Mock<IHubContext<ChatHub>> _chatHubMock = new();
    private readonly Mock<IHubClients> _clientsMock = new();
    private readonly Mock<IClientProxy> _clientProxyMock = new();
    private readonly TicketService _sut;

    public TicketServiceSignalRTests()
    {
        _clientsMock.Setup(c => c.Group(It.IsAny<string>())).Returns(_clientProxyMock.Object);
        _chatHubMock.Setup(h => h.Clients).Returns(_clientsMock.Object);

        _customerRepoMock.Setup(r => r.GetByIdAsync(It.IsAny<Guid>()))
            .ReturnsAsync((Guid id) => new CustomerProfile { Id = id, UserId = id.ToString() });

        _sut = new TicketService(_ticketRepoMock.Object, _customerRepoMock.Object, _aiClientMock.Object, _broadcastMock.Object, _chatHubMock.Object);
    }

    [Fact]
    public async Task CreateAsync_BroadcastsNewTicketAvailableToStaffGroup()
    {
        // Arrange
        var customerId = Guid.NewGuid();
        var dto = new CreateTicketRequestDto { Title = "Bug", Description = "Crash" };
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

        // Act
        var result = await _sut.CreateAsync(dto, customerId);

        // Assert
        Assert.NotNull(result);
        _clientProxyMock.Verify(
            p => p.SendCoreAsync("NewTicketAvailable", It.Is<object[]>(o => o.Length == 1), default),
            Times.Once);
    }

    [Fact]
    public async Task ClaimAsync_BroadcastsTicketStatusChangedToStaffGroup()
    {
        // Arrange
        var id = Guid.NewGuid();
        var ticket = new Ticket
        {
            Id = id,
            Status = "Unclaimed",
            Description = "Issue",
            UpdatedAt = DateTime.UtcNow
        };
        _ticketRepoMock.Setup(r => r.GetByIdAsync(id)).ReturnsAsync(ticket);

        // Act
        var result = await _sut.ClaimAsync(id, "staff-456");

        // Assert
        Assert.True(result);
        _clientProxyMock.Verify(
            p => p.SendCoreAsync("TicketStatusChanged", It.Is<object[]>(o => o.Length == 1), default),
            Times.Exactly(2));
    }
}
