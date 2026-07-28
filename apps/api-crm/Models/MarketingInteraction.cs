namespace Crm.Api.Models;

public class MarketingInteraction
{
    public Guid Id { get; set; }
    public Guid CustomerId { get; set; }
    public Guid? CampaignId { get; set; }
    public string InteractionSource { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Channel { get; set; } = string.Empty;
    public string InteractionType { get; set; } = string.Empty;
    public bool IsSuccess { get; set; } = true;
    public DateTime SentAt { get; set; }

    // Navigation properties
    public CustomerProfile CustomerProfile { get; set; } = null!;
    public Campaign? Campaign { get; set; }
}
