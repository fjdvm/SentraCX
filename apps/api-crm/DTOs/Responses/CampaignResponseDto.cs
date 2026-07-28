namespace Crm.Api.DTOs.Responses;

public class CampaignResponseDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public List<string> Channels { get; set; } = [];
    public string TargetAudience { get; set; } = "All";
    public List<string>? TargetCustomerIds { get; set; }
    public List<string>? TargetEmails { get; set; }
    public string Status { get; set; } = string.Empty;
    public Guid? TemplateId { get; set; }
    public string? ImageUrl { get; set; }
    public string CreatedById { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }

    public CampaignScheduleResponseDto? Schedule { get; set; }
    public List<PromotionListResponseDto> Promotions { get; set; } = [];
}

public class CampaignScheduleResponseDto
{
    public string ScheduleType { get; set; } = string.Empty;
    public List<string>? RecurrenceDays { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
}
