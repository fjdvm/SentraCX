using Crm.Api.DTOs.Responses;
using Crm.Api.Interfaces.Repositories;
using Crm.Api.Interfaces.Services;
using Crm.Api.Models;

namespace Crm.Api.Services;

public class CampaignDispatchService(
    ICampaignRepository campaignRepository,
    ICustomerProfileRepository customerProfileRepository,
    IMarketingInteractionRepository marketingInteractionRepository,
    IEmailService emailService,
    ILogger<CampaignDispatchService> logger) : ICampaignDispatchService
{
    public async Task<CampaignDispatchResultDto> DispatchAsync(Guid campaignId)
    {
        var campaign = await campaignRepository.GetByIdAsync(campaignId);
        if (campaign == null)
        {
            logger.LogWarning("Dispatch attempted for non-existent campaign {CampaignId}", campaignId);
            return new CampaignDispatchResultDto
            {
                TotalRecipients = 0,
                SentCount = 0,
                FailedCount = 0,
                Message = $"Campaign {campaignId} not found."
            };
        }

        var isEmailChannel = campaign.Channels.Any(c => c.Equals("Email", StringComparison.OrdinalIgnoreCase));
        if (!isEmailChannel)
        {
            logger.LogInformation("Campaign {CampaignId} does not include Email channel. Skipping email dispatch.", campaignId);
            return new CampaignDispatchResultDto
            {
                TotalRecipients = 0,
                SentCount = 0,
                FailedCount = 0,
                Message = "Campaign does not include Email channel."
            };
        }

        var recipients = await customerProfileRepository.GetAllActiveContactsAsync(
            campaign.TargetAudience, campaign.TargetCustomerIds, campaign.TargetEmails);

        int successCount = 0;
        int failureCount = 0;
        var errors = new HashSet<string>();
        var processedEmails = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var recipient in recipients)
        {
            if (string.IsNullOrWhiteSpace(recipient.User.Email)) continue;
            processedEmails.Add(recipient.User.Email);

            var (isSuccess, errorMessage) = await TrySendEmailAsync(
                recipient.User.Email, recipient.User.DisplayName, campaign, campaignId);

            if (!isSuccess && !string.IsNullOrWhiteSpace(errorMessage))
            {
                errors.Add(errorMessage);
            }

            var interaction = new MarketingInteraction
            {
                CustomerId = recipient.Id,
                CampaignId = campaign.Id,
                InteractionSource = "Campaign",
                Title = campaign.Title,
                Description = campaign.Subject,
                Channel = "Email",
                InteractionType = "Email",
                IsSuccess = isSuccess,
                SentAt = DateTime.UtcNow
            };

            await marketingInteractionRepository.AddAsync(interaction);

            if (isSuccess) successCount++;
            else failureCount++;
        }

        if (campaign.TargetEmails != null)
        {
            foreach (var email in campaign.TargetEmails)
            {
                var cleanEmail = email.Trim();
                if (string.IsNullOrWhiteSpace(cleanEmail) || processedEmails.Contains(cleanEmail)) continue;

                var (isSuccess, errorMessage) = await TrySendEmailAsync(cleanEmail, cleanEmail, campaign, campaignId);
                processedEmails.Add(cleanEmail);

                if (!isSuccess && !string.IsNullOrWhiteSpace(errorMessage))
                {
                    errors.Add(errorMessage);
                }

                if (isSuccess) successCount++;
                else failureCount++;
            }
        }

        if (campaign.CampaignSchedule != null)
        {
            if (campaign.CampaignSchedule.ScheduleType.Equals("SendNow", StringComparison.OrdinalIgnoreCase) ||
                campaign.CampaignSchedule.ScheduleType.Equals("Scheduled", StringComparison.OrdinalIgnoreCase))
            {
                campaign.CampaignSchedule.NextRunAt = null;
            }
            else if (campaign.CampaignSchedule.ScheduleType.Equals("Recurring", StringComparison.OrdinalIgnoreCase))
            {
                campaign.CampaignSchedule.NextRunAt = CalculateNextRecurringRun(campaign.CampaignSchedule.RecurrenceDays);
            }

            await campaignRepository.UpdateAsync(campaign);
        }

        var totalRecipients = successCount + failureCount;
        var errorList = errors.ToList();

        string summaryMessage;
        if (totalRecipients == 0)
        {
            summaryMessage = "No active recipients matched the campaign target audience criteria.";
        }
        else if (failureCount == 0)
        {
            summaryMessage = $"Campaign successfully dispatched to {successCount} recipient(s).";
        }
        else if (successCount == 0)
        {
            var errorDetails = errorList.Count > 0 ? string.Join("; ", errorList) : "Unknown delivery error";
            summaryMessage = $"Failed to dispatch campaign to {totalRecipients} recipient(s). Error: {errorDetails}";
        }
        else
        {
            var errorDetails = errorList.Count > 0 ? string.Join("; ", errorList) : "Unknown delivery error";
            summaryMessage = $"Partially dispatched: {successCount} sent, {failureCount} failed. Error: {errorDetails}";
        }

        logger.LogInformation("Completed dispatch for campaign {CampaignId}: {SuccessCount} sent, {FailureCount} failed. Message: {Message}",
            campaignId, successCount, failureCount, summaryMessage);

        return new CampaignDispatchResultDto
        {
            TotalRecipients = totalRecipients,
            SentCount = successCount,
            FailedCount = failureCount,
            Errors = errorList,
            Message = summaryMessage
        };
    }

    private async Task<(bool IsSuccess, string? ErrorMessage)> TrySendEmailAsync(
        string toEmail, string toName, Campaign campaign, Guid campaignId)
    {
        try
        {
            var htmlBody = CampaignEmailBodyBuilder.Build(campaign, toName);
            await emailService.SendAsync(toEmail, toName, campaign.Subject, htmlBody);
            return (true, null);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed dispatching campaign {CampaignId} to {Email}", campaignId, toEmail);
            return (false, ex.Message);
        }
    }

    private static DateTime? CalculateNextRecurringRun(List<string>? recurrenceDays)
    {
        if (recurrenceDays == null || recurrenceDays.Count == 0) return null;

        var validDays = recurrenceDays
            .Select(d => Enum.TryParse<DayOfWeek>(d, true, out var dow) ? (DayOfWeek?)dow : null)
            .Where(d => d.HasValue)
            .Select(d => d!.Value)
            .ToHashSet();

        if (validDays.Count == 0) return null;

        var checkDate = DateTime.UtcNow.Date.AddDays(1);
        for (int i = 0; i < 7; i++)
        {
            if (validDays.Contains(checkDate.DayOfWeek))
            {
                return checkDate;
            }
            checkDate = checkDate.AddDays(1);
        }

        return null;
    }
}

