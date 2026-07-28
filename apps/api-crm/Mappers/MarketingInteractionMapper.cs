using Crm.Api.DTOs.Responses;
using Crm.Api.Models;

namespace Crm.Api.Mappers;

public static class MarketingInteractionMapper
{
    public static MarketingInteractionResponseDto ToDto(this MarketingInteraction model)
    {
        return new MarketingInteractionResponseDto
        {
            Id = model.Id,
            CustomerId = model.CustomerId,
            CampaignId = model.CampaignId,
            InteractionSource = model.InteractionSource,
            Title = model.Title,
            Description = model.Description,
            Channel = model.Channel,
            InteractionType = model.InteractionType,
            IsSuccess = model.IsSuccess,
            SentAt = model.SentAt,
        };
    }
}
