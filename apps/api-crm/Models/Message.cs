namespace Crm.Api.Models;

public class Message
{
    public Guid Id { get; set; }
    public Guid TicketId { get; set; }
    public string SenderId { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public bool IsRead { get; set; }
    public DateTime SentAt { get; set; }

    // Navigation properties
    public Ticket Ticket { get; set; } = null!;
    public User? Sender { get; set; }
}
