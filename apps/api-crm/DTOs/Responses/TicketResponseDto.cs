namespace Crm.Api.DTOs.Responses;

public class TicketResponseDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public string Status { get; set; } = string.Empty;
    public Guid CustomerId { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public string? AssignedToId { get; set; }
    public string? AssignedToName { get; set; }
    public string Category { get; set; } = "Uncategorized";
    public string Sentiment { get; set; } = "neutral";
    public bool HasStaffReplied { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
