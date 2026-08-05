using Crm.Api.DTOs.Requests;
using Crm.Api.DTOs.Responses;
using Crm.Api.Models;

namespace Crm.Api.Mappers;

public static class CampaignMapper
{
    public static CampaignListResponseDto ToListDto(Campaign campaign)
    {
        return new CampaignListResponseDto
        {
            Id = campaign.Id,
            Title = campaign.Title,
            Channels = campaign.Channels,
            Status = campaign.Status,
            CreatedAt = campaign.CreatedAt
        };
    }

    public static CampaignResponseDto ToDetailDto(Campaign campaign)
    {
        return new CampaignResponseDto
        {
            Id = campaign.Id,
            Title = campaign.Title,
            Subject = campaign.Subject,
            Description = campaign.Description,
            Channels = campaign.Channels,
            TargetAudience = campaign.TargetAudience,
            TargetCustomerIds = campaign.TargetCustomerIds,
            TargetEmails = campaign.TargetEmails,
            Status = campaign.Status,
            TemplateId = campaign.TemplateId,
            ImageUrl = campaign.ImageUrl,
            CreatedById = campaign.CreatedById,
            CreatedAt = campaign.CreatedAt,
            Schedule = campaign.CampaignSchedule == null ? null : new CampaignScheduleResponseDto
            {
                ScheduleType = campaign.CampaignSchedule.ScheduleType,
                RecurrenceDays = campaign.CampaignSchedule.RecurrenceDays,
                StartDate = campaign.CampaignSchedule.StartDate,
                EndDate = campaign.CampaignSchedule.EndDate
            }
        };
    }

    public static Campaign ToEntity(CreateCampaignRequestDto dto, string createdById)
    {
        var campaign = new Campaign
        {
            Title = dto.Title,
            Subject = dto.Subject,
            Description = dto.Description,
            Channels = dto.Channels,
            TargetAudience = dto.TargetAudience,
            TargetCustomerIds = dto.TargetCustomerIds,
            TargetEmails = dto.TargetEmails,
            Status = dto.Status,
            TemplateId = dto.TemplateId,
            ImageUrl = dto.ImageUrl,
            CreatedById = createdById,
            CreatedAt = DateTime.UtcNow
        };

        campaign.CampaignSchedule = new CampaignSchedule
        {
            ScheduleType = dto.ScheduleType,
            RecurrenceDays = dto.RecurrenceDays,
            StartDate = dto.StartDate,
            EndDate = dto.EndDate
        };

        return campaign;
    }
}
