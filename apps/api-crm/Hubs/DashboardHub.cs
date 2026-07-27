using Microsoft.AspNetCore.SignalR;
using StackExchange.Redis;

namespace Crm.Api.Hubs;

public class DashboardHub(IConnectionMultiplexer redis) : Hub
{
    private readonly IDatabase _db = redis.GetDatabase();
    private const string OnlineAgentsKey = "sentracx:dashboard:online_agents";

    public async Task JoinDashboard()
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, "dashboard");
    }

    public async Task LeaveDashboard()
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, "dashboard");
    }

    public override async Task OnConnectedAsync()
    {
        await _db.StringIncrementAsync(OnlineAgentsKey);
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var count = await _db.StringDecrementAsync(OnlineAgentsKey);
        if (count < 0)
        {
            await _db.StringSetAsync(OnlineAgentsKey, 0);
        }
        await base.OnDisconnectedAsync(exception);
    }
}
