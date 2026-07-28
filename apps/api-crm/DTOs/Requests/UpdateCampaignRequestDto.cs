namespace Crm.Api.DTOs.Requests;

public class UpdateCampaignRequestDto
{
    public string? Title { get; set; }
    public string? Subject { get; set; }
    public string? Description { get; set; }
    public List<string>? Channels { get; set; }
    public string? TargetAudience { get; set; }
    public List<string>? TargetCustomerIds { get; set; }
    public List<string>? TargetEmails { get; set; }
    public string? ScheduleType { get; set; }
    public List<string>? RecurrenceDays { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public string? ImageUrl { get; set; }
    public Guid? TemplateId { get; set; }
    public string? Status { get; set; }
}
