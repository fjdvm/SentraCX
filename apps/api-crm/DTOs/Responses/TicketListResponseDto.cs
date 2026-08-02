namespace Crm.Api.DTOs.Responses;

public class TicketListResponseDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string CustomerName { get; set; } = string.Empty;
    public string? AssignedToId { get; set; }
    public string? AssignedToName { get; set; }
    public bool HasStaffReplied { get; set; }
    public int UnreadMessageCount { get; set; }
    public DateTime CreatedAt { get; set; }
}
