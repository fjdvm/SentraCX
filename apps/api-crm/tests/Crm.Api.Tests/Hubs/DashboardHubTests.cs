using Crm.Api.Hubs;
using Crm.Api.Interfaces.Repositories;
using Microsoft.AspNetCore.SignalR;
using Moq;
using StackExchange.Redis;
using Xunit;

namespace Crm.Api.Tests.Hubs;

public class DashboardHubTests
{
    private readonly Mock<IConnectionMultiplexer> _redisMock = new();
    private readonly Mock<IDatabase> _dbMock = new();
    private readonly Mock<ITicketRepository> _ticketRepoMock = new();
    private readonly Mock<IMessageRepository> _messageRepoMock = new();
    private readonly Mock<IHubCallerClients> _clientsMock = new();
    private readonly Mock<ISingleClientProxy> _clientProxyMock = new();
    private readonly Mock<IGroupManager> _groupsMock = new();
    private readonly Mock<HubCallerContext> _contextMock = new();
    private readonly DashboardHub _sut;

    public DashboardHubTests()
    {
        _redisMock.Setup(r => r.GetDatabase(It.IsAny<int>(), It.IsAny<object>())).Returns(_dbMock.Object);
        _contextMock.Setup(c => c.ConnectionId).Returns("conn-1");
        
        _clientsMock.Setup(c => c.Caller).Returns(_clientProxyMock.Object);

        _sut = new DashboardHub(_ticketRepoMock.Object, _messageRepoMock.Object, _redisMock.Object)
        {
            Clients = _clientsMock.Object,
            Groups = _groupsMock.Object,
            Context = _contextMock.Object
        };
    }

    [Fact]
    public async Task JoinDashboard_AddsConnectionToGroup()
    {
        await _sut.JoinDashboard();
        _groupsMock.Verify(g => g.AddToGroupAsync("conn-1", "dashboard", default), Times.Once);
    }

    [Fact]
    public async Task LeaveDashboard_RemovesConnectionFromGroup()
    {
        await _sut.LeaveDashboard();
        _groupsMock.Verify(g => g.RemoveFromGroupAsync("conn-1", "dashboard", default), Times.Once);
    }

    [Fact]
    public async Task OnConnectedAsync_IncrementsRedisAgentCount()
    {
        await _sut.OnConnectedAsync();
        _dbMock.Verify(d => d.StringIncrementAsync("sentracx:dashboard:online_agents", 1, CommandFlags.None), Times.Once);
    }

    [Fact]
    public async Task OnDisconnectedAsync_DecrementsRedisAgentCount()
    {
        _dbMock.Setup(d => d.StringDecrementAsync("sentracx:dashboard:online_agents", 1, CommandFlags.None)).ReturnsAsync(-1);
        await _sut.OnDisconnectedAsync(null);
        _dbMock.Verify(d => d.StringDecrementAsync("sentracx:dashboard:online_agents", 1, CommandFlags.None), Times.Once);
        _dbMock.Verify(d => d.StringSetAsync("sentracx:dashboard:online_agents", It.Is<RedisValue>(v => (int)v == 0), null, false, When.Always, CommandFlags.None), Times.Once);
    }
}
