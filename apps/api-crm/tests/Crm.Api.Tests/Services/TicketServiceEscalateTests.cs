using Crm.Api.Interfaces.Repositories;
using Crm.Api.Interfaces.Clients;
using Crm.Api.Interfaces.Services;
using Crm.Api.Models;
using Crm.Api.Services;
using Moq;
using System;
using System.Threading.Tasks;
using Xunit;

namespace Crm.Api.Tests.Services;

public class TicketServiceEscalateTests
{
    private readonly Mock<ITicketRepository> _ticketRepoMock = new();
    private readonly Mock<IAiAnalyticsClient> _aiClientMock = new();
    private readonly Mock<IDashboardBroadcastService> _broadcastMock = new();
    private readonly TicketService _sut;

    public TicketServiceEscalateTests()
    {
        _sut = new TicketService(_ticketRepoMock.Object, _aiClientMock.Object, _broadcastMock.Object);
    }

    [Fact]
    public async Task EscalateAsync_ReturnsFalse_WhenTicketNotFound()
    {
        // Arrange
        var id = Guid.NewGuid();
        _ticketRepoMock.Setup(r => r.GetByIdAsync(id)).ReturnsAsync((Ticket?)null);

        // Act
        var result = await _sut.EscalateAsync(id, "some summary");

        // Assert
        Assert.False(result);
        _ticketRepoMock.Verify(r => r.UpdateAsync(It.IsAny<Ticket>()), Times.Never);
    }

    [Theory]
    [InlineData("Completed")]
    [InlineData("Canceled")]
    public async Task EscalateAsync_ReturnsFalse_WhenStatusIsCompletedOrCanceled(string status)
    {
        // Arrange
        var id = Guid.NewGuid();
        var ticket = new Ticket
        {
            Id = id,
            Status = status
        };
        _ticketRepoMock.Setup(r => r.GetByIdAsync(id)).ReturnsAsync(ticket);

        // Act
        var result = await _sut.EscalateAsync(id, "some summary");

        // Assert
        Assert.False(result);
        _ticketRepoMock.Verify(r => r.UpdateAsync(It.IsAny<Ticket>()), Times.Never);
    }

    [Fact]
    public async Task EscalateAsync_UpdatesTicketAndReturnsTrue_WhenValid()
    {
        // Arrange
        var id = Guid.NewGuid();
        var ticket = new Ticket
        {
            Id = id,
            Status = "Claimed",
            Description = "Original description",
            AssignedToId = "staff-123",
            UpdatedAt = DateTime.UtcNow.AddHours(-1)
        };
        _ticketRepoMock.Setup(r => r.GetByIdAsync(id)).ReturnsAsync(ticket);

        // Act
        var result = await _sut.EscalateAsync(id, "bot exchange summary");

        // Assert
        Assert.True(result);
        Assert.Equal("Unclaimed", ticket.Status);
        Assert.Null(ticket.AssignedToId);
        Assert.Contains("Original description", ticket.Description);
        Assert.Contains("--- Bot Context ---", ticket.Description);
        Assert.Contains("bot exchange summary", ticket.Description);
        _ticketRepoMock.Verify(r => r.UpdateAsync(ticket), Times.Once);
        _broadcastMock.Verify(b => b.BroadcastMetricsAsync(), Times.Once);
    }
}
