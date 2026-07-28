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
    public async Task<int> DispatchAsync(Guid campaignId)
    {
        var campaign = await campaignRepository.GetByIdAsync(campaignId);
        if (campaign == null)
        {
            logger.LogWarning("Dispatch attempted for non-existent campaign {CampaignId}", campaignId);
            return 0;
        }

        var isEmailChannel = campaign.Channels.Any(c => c.Equals("Email", StringComparison.OrdinalIgnoreCase));
        if (!isEmailChannel)
        {
            logger.LogInformation("Campaign {CampaignId} does not include Email channel. Skipping email dispatch.", campaignId);
            return 0;
        }

        var recipients = await customerProfileRepository.GetAllActiveContactsAsync(
            campaign.TargetAudience, campaign.TargetCustomerIds, campaign.TargetEmails);

        int successCount = 0;
        int failureCount = 0;
        var processedEmails = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var recipient in recipients)
        {
            if (string.IsNullOrWhiteSpace(recipient.User.Email)) continue;
            processedEmails.Add(recipient.User.Email);

            var isSuccess = await TrySendEmailAsync(
                recipient.User.Email, recipient.User.DisplayName, campaign, campaignId);

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

                var isSuccess = await TrySendEmailAsync(cleanEmail, cleanEmail, campaign, campaignId);
                processedEmails.Add(cleanEmail);

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

        logger.LogInformation("Completed dispatch for campaign {CampaignId}: {SuccessCount} sent, {FailureCount} failed.",
            campaignId, successCount, failureCount);

        return successCount;
    }

    private async Task<bool> TrySendEmailAsync(string toEmail, string toName, Campaign campaign, Guid campaignId)
    {
        try
        {
            var htmlBody = CampaignEmailBodyBuilder.Build(campaign, toName);
            await emailService.SendAsync(toEmail, toName, campaign.Subject, htmlBody);
            return true;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed dispatching campaign {CampaignId} to {Email}", campaignId, toEmail);
            return false;
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
