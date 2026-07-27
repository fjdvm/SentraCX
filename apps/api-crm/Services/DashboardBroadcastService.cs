using Crm.Api.DTOs.Responses;
using Crm.Api.Hubs;
using Crm.Api.Interfaces.Repositories;
using Crm.Api.Interfaces.Services;
using Microsoft.AspNetCore.SignalR;
using StackExchange.Redis;

namespace Crm.Api.Services;

public class DashboardBroadcastService(
    IHubContext<DashboardHub> hubContext,
    ITicketRepository ticketRepository,
    IMessageRepository messageRepository,
    IConnectionMultiplexer redis) : IDashboardBroadcastService
{
    private readonly IDatabase _redisDb = redis.GetDatabase();
    private const string OnlineAgentsKey = "sentracx:dashboard:online_agents";

    public async Task BroadcastMetricsAsync()
    {
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

        await hubContext.Clients.Group("dashboard").SendAsync("DashboardMetricsUpdated", dto);
    }
}
