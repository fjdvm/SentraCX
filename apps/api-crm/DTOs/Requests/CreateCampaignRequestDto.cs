namespace Crm.Api.DTOs.Requests;

public class CreateCampaignRequestDto
{
    public string Title { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public List<string> Channels { get; set; } = []; // Email, InApp, Facebook, Twitter, Instagram
    public string TargetAudience { get; set; } = "All"; // All, Regular, InstitutionalBuyer, Specific
    public List<string>? TargetCustomerIds { get; set; }
    public List<string>? TargetEmails { get; set; }
    public string ScheduleType { get; set; } = "SendNow"; // SendNow, Scheduled, Recurring
    public List<string>? RecurrenceDays { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public string? ImageUrl { get; set; }
    public Guid? TemplateId { get; set; }
    public string Status { get; set; } = "Draft"; // Draft, Active
}
