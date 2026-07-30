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

public class TicketServiceUnclaimTests
{
    private readonly Mock<ITicketRepository> _ticketRepoMock = new();
    private readonly Mock<ICustomerProfileRepository> _customerRepoMock = new();
    private readonly Mock<IAiAnalyticsClient> _aiClientMock = new();
    private readonly Mock<IDashboardBroadcastService> _broadcastMock = new();
    private readonly Mock<IHubContext<ChatHub>> _chatHubMock = new();
    private readonly Mock<IHubClients> _clientsMock = new();
    private readonly Mock<IClientProxy> _clientProxyMock = new();
    private readonly TicketService _sut;

    public TicketServiceUnclaimTests()
    {
        _clientsMock.Setup(c => c.Group(It.IsAny<string>())).Returns(_clientProxyMock.Object);
        _chatHubMock.Setup(h => h.Clients).Returns(_clientsMock.Object);

        _sut = new TicketService(_ticketRepoMock.Object, _customerRepoMock.Object, _aiClientMock.Object, _broadcastMock.Object, _chatHubMock.Object);
    }

    [Fact]
    public async Task UnclaimAsync_ReturnsFalse_WhenTicketNotFound()
    {
        // Arrange
        var id = Guid.NewGuid();
        _ticketRepoMock.Setup(r => r.GetByIdAsync(id)).ReturnsAsync((Ticket?)null);

        // Act
        var result = await _sut.UnclaimAsync(id);

        // Assert
        Assert.False(result);
        _ticketRepoMock.Verify(r => r.UpdateAsync(It.IsAny<Ticket>()), Times.Never);
    }

    [Theory]
    [InlineData("Unclaimed")]
    [InlineData("Completed")]
    [InlineData("Canceled")]
    public async Task UnclaimAsync_ReturnsFalse_WhenStatusIsNotClaimedOrOngoing(string status)
    {
        // Arrange
        var id = Guid.NewGuid();
        var ticket = new Ticket
        {
            Id = id,
            Status = status,
            AssignedToId = "staff-123"
        };
        _ticketRepoMock.Setup(r => r.GetByIdAsync(id)).ReturnsAsync(ticket);

        // Act
        var result = await _sut.UnclaimAsync(id);

        // Assert
        Assert.False(result);
        _ticketRepoMock.Verify(r => r.UpdateAsync(It.IsAny<Ticket>()), Times.Never);
    }

    [Theory]
    [InlineData("Claimed")]
    [InlineData("Ongoing")]
    public async Task UnclaimAsync_UpdatesTicketAndReturnsTrue_WhenStatusIsClaimedOrOngoing(string initialStatus)
    {
        // Arrange
        var id = Guid.NewGuid();
        var ticket = new Ticket
        {
            Id = id,
            Status = initialStatus,
            AssignedToId = "staff-123",
            UpdatedAt = DateTime.UtcNow.AddHours(-1)
        };
        _ticketRepoMock.Setup(r => r.GetByIdAsync(id)).ReturnsAsync(ticket);

        // Act
        var result = await _sut.UnclaimAsync(id);

        // Assert
        Assert.True(result);
        Assert.Equal("Unclaimed", ticket.Status);
        Assert.Null(ticket.AssignedToId);
        _ticketRepoMock.Verify(r => r.UpdateAsync(ticket), Times.Once);
    }
}
