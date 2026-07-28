using System;

namespace Crm.Api.DTOs.Responses;

public class EscalationResponseDto
{
    public Guid TicketId { get; set; }
    public string ConversationGroupId { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
}
