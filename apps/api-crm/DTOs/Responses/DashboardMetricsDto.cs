namespace Crm.Api.DTOs.Responses;

public class DashboardMetricsDto
{
    public int ActiveTickets { get; set; }
    public int PendingEscalations { get; set; }
    public int UnreadConversations { get; set; }
    public int OnlineAgents { get; set; }
}
