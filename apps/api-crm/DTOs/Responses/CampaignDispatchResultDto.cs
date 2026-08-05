namespace Crm.Api.DTOs.Responses;

public class CampaignDispatchResultDto
{
    public int TotalRecipients { get; set; }
    public int SentCount { get; set; }
    public int FailedCount { get; set; }
    public List<string> Errors { get; set; } = [];
    public string Message { get; set; } = string.Empty;
}
