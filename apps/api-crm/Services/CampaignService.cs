using Crm.Api.DTOs.Requests;
using Crm.Api.DTOs.Responses;
using Crm.Api.Interfaces.Repositories;
using Crm.Api.Interfaces.Services;
using Crm.Api.Mappers;
using Crm.Api.Models;

namespace Crm.Api.Services;

public class CampaignService(ICampaignRepository campaignRepository) : ICampaignService
{
    public async Task<IEnumerable<CampaignListResponseDto>> GetAllAsync(string? status = null)
    {
        var campaigns = await campaignRepository.GetAllAsync(status);
        return campaigns.Select(CampaignMapper.ToListDto);
    }

    public async Task<CampaignResponseDto?> GetByIdAsync(Guid id)
    {
        var campaign = await campaignRepository.GetByIdAsync(id);
        return campaign == null ? null : CampaignMapper.ToDetailDto(campaign);
    }

    public async Task<CampaignResponseDto> CreateAsync(CreateCampaignRequestDto dto, string createdById)
    {
        var entity = CampaignMapper.ToEntity(dto, createdById);
        var created = await campaignRepository.AddAsync(entity);
        var fullEntity = await campaignRepository.GetByIdAsync(created.Id);
        return CampaignMapper.ToDetailDto(fullEntity ?? created);
    }

    public async Task<bool> UpdateAsync(Guid id, UpdateCampaignRequestDto dto)
    {
        var campaign = await campaignRepository.GetByIdAsync(id);
        if (campaign == null) return false;

        if (!string.IsNullOrWhiteSpace(dto.Title)) campaign.Title = dto.Title;
        if (!string.IsNullOrWhiteSpace(dto.Subject)) campaign.Subject = dto.Subject;
        if (!string.IsNullOrWhiteSpace(dto.Description)) campaign.Description = dto.Description;
        if (dto.Channels != null && dto.Channels.Count > 0) campaign.Channels = dto.Channels;
        if (!string.IsNullOrWhiteSpace(dto.TargetAudience)) campaign.TargetAudience = dto.TargetAudience;
        if (dto.TargetCustomerIds != null) campaign.TargetCustomerIds = dto.TargetCustomerIds;
        if (dto.TargetEmails != null) campaign.TargetEmails = dto.TargetEmails;
        if (dto.TemplateId.HasValue) campaign.TemplateId = dto.TemplateId;
        if (dto.ImageUrl != null) campaign.ImageUrl = dto.ImageUrl;
        if (!string.IsNullOrWhiteSpace(dto.Status)) campaign.Status = dto.Status;

        if (campaign.CampaignSchedule != null)
        {
            if (!string.IsNullOrWhiteSpace(dto.ScheduleType)) campaign.CampaignSchedule.ScheduleType = dto.ScheduleType;
            if (dto.RecurrenceDays != null) campaign.CampaignSchedule.RecurrenceDays = dto.RecurrenceDays;
            if (dto.StartDate.HasValue) campaign.CampaignSchedule.StartDate = dto.StartDate;
            if (dto.EndDate.HasValue) campaign.CampaignSchedule.EndDate = dto.EndDate;
        }

        await campaignRepository.UpdateAsync(campaign);
        return true;
    }

    public async Task<bool> UpdateStatusAsync(Guid id, string status)
    {
        var campaign = await campaignRepository.GetByIdAsync(id);
        if (campaign == null) return false;

        campaign.Status = status;
        await campaignRepository.UpdateAsync(campaign);
        return true;
    }

    public async Task<bool> AttachPromotionsAsync(Guid id, List<Guid> promotionIds)
    {
        var campaign = await campaignRepository.GetByIdAsync(id);
        if (campaign == null) return false;

        await campaignRepository.AttachPromotionsAsync(id, promotionIds);
        return true;
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var campaign = await campaignRepository.GetByIdAsync(id);
        if (campaign == null) return false;

        await campaignRepository.DeleteAsync(id);
        return true;
    }
}
