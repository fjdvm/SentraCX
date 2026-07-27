using Crm.Api.DTOs.Responses;
using Crm.Api.Hubs;
using Crm.Api.Interfaces.Repositories;
using Crm.Api.Services;
using Microsoft.AspNetCore.SignalR;
using Moq;
using StackExchange.Redis;
using Xunit;

namespace Crm.Api.Tests.Services;

public class DashboardBroadcastServiceTests
{
    private readonly Mock<IHubContext<DashboardHub>> _hubContextMock = new();
    private readonly Mock<IHubClients> _hubClientsMock = new();
    private readonly Mock<IClientProxy> _clientProxyMock = new();
    private readonly Mock<ITicketRepository> _ticketRepositoryMock = new();
    private readonly Mock<IMessageRepository> _messageRepositoryMock = new();
    private readonly Mock<IConnectionMultiplexer> _redisMock = new();
    private readonly Mock<IDatabase> _dbMock = new();
    private readonly DashboardBroadcastService _sut;

    public DashboardBroadcastServiceTests()
    {
        _redisMock.Setup(r => r.GetDatabase(It.IsAny<int>(), It.IsAny<object>())).Returns(_dbMock.Object);
        _hubContextMock.Setup(h => h.Clients).Returns(_hubClientsMock.Object);
        _hubClientsMock.Setup(c => c.Group("dashboard")).Returns(_clientProxyMock.Object);

        _sut = new DashboardBroadcastService(
            _hubContextMock.Object,
            _ticketRepositoryMock.Object,
            _messageRepositoryMock.Object,
            _redisMock.Object
        );
    }

    [Fact]
    public async Task BroadcastMetricsAsync_FetchesMetricsAndSendsToGroup()
    {
        _ticketRepositoryMock.Setup(r => r.GetActiveCountAsync()).ReturnsAsync(10);
        _ticketRepositoryMock.Setup(r => r.GetPendingEscalationsCountAsync()).ReturnsAsync(2);
        _messageRepositoryMock.Setup(r => r.GetUnreadConversationsCountAsync()).ReturnsAsync(5);
        _dbMock.Setup(d => d.StringGetAsync("sentracx:dashboard:online_agents", CommandFlags.None)).ReturnsAsync("4");

        await _sut.BroadcastMetricsAsync();

        _ticketRepositoryMock.Verify(r => r.GetActiveCountAsync(), Times.Once);
        _ticketRepositoryMock.Verify(r => r.GetPendingEscalationsCountAsync(), Times.Once);
        _messageRepositoryMock.Verify(r => r.GetUnreadConversationsCountAsync(), Times.Once);
        _dbMock.Verify(d => d.StringGetAsync("sentracx:dashboard:online_agents", CommandFlags.None), Times.Once);

        _clientProxyMock.Verify(
            c => c.SendCoreAsync(
                "DashboardMetricsUpdated",
                It.Is<object[]>(a =>
                    a[0] is DashboardMetricsDto &&
                    ((DashboardMetricsDto)a[0]).ActiveTickets == 10 &&
                    ((DashboardMetricsDto)a[0]).PendingEscalations == 2 &&
                    ((DashboardMetricsDto)a[0]).UnreadConversations == 5 &&
                    ((DashboardMetricsDto)a[0]).OnlineAgents == 4
                ),
                default
            ),
            Times.Once
        );
    }
}
