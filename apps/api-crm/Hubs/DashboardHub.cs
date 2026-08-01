using Crm.Api.DTOs.Responses;
using Crm.Api.Interfaces.Repositories;
using Microsoft.AspNetCore.SignalR;
using StackExchange.Redis;

namespace Crm.Api.Hubs;

public class DashboardHub(
    ITicketRepository ticketRepository,
    IMessageRepository messageRepository,
    IConnectionMultiplexer redis) : Hub
{
    private readonly IDatabase _redisDb = redis.GetDatabase();
    private const string OnlineAgentsKey = "sentracx:dashboard:online_agents";

    public async Task JoinDashboard()
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, "dashboard");

        // Send initial metrics on join
        var activeTickets = await ticketRepository.GetActiveCountAsync();
        var pendingEscalations = await ticketRepository.GetPendingEscalationsCountAsync();
        var unreadConversations = await messageRepository.GetUnreadConversationsCountAsync();

        var onlineAgentsString = await _redisDb.StringGetAsync(OnlineAgentsKey);
        int onlineAgents = 0;
        if (onlineAgentsString.HasValue && int.TryParse((string?)onlineAgentsString, out var parsedCount))
        {
            onlineAgents = Math.Max(0, parsedCount);
        }

        var dto = new DashboardMetricsDto
        {
            ActiveTickets = activeTickets,
            PendingEscalations = pendingEscalations,
            UnreadConversations = unreadConversations,
            OnlineAgents = onlineAgents
        };

        await Clients.Caller.SendAsync("DashboardMetricsUpdated", dto);
    }

    public async Task LeaveDashboard()
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, "dashboard");
    }

    public override async Task OnConnectedAsync()
    {
        await _redisDb.StringIncrementAsync(OnlineAgentsKey);
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var count = await _redisDb.StringDecrementAsync(OnlineAgentsKey);
        if (count < 0)
        {
            await _redisDb.StringSetAsync(OnlineAgentsKey, 0);
        }
        await base.OnDisconnectedAsync(exception);
    }
}
