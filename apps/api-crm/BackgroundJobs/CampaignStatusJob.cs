using Crm.Api.Interfaces.Repositories;
using Crm.Api.Interfaces.Services;

namespace Crm.Api.BackgroundJobs;

public class CampaignStatusJob(IServiceScopeFactory scopeFactory, ILogger<CampaignStatusJob> logger) : BackgroundService
{
    private readonly TimeSpan _checkInterval = TimeSpan.FromMinutes(5);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation("CampaignStatusJob background service started.");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = scopeFactory.CreateScope();
                var campaignRepository = scope.ServiceProvider.GetRequiredService<ICampaignRepository>();
                var campaignDispatchService = scope.ServiceProvider.GetRequiredService<ICampaignDispatchService>();

                var activeCampaigns = await campaignRepository.GetAllAsync("Active");
                var now = DateTime.UtcNow;

                foreach (var campaign in activeCampaigns)
                {
                    var sched = campaign.CampaignSchedule;

                    // 1. Auto-end expired campaigns
                    if (sched?.EndDate.HasValue == true && sched.EndDate.Value <= now)
                    {
                        campaign.Status = "Ended";
                        await campaignRepository.UpdateAsync(campaign);
                        logger.LogInformation("Campaign {CampaignId} status updated to Ended.", campaign.Id);
                        continue;
                    }

                    // 2. Dispatch due campaigns
                    if (sched != null)
                    {
                        var isScheduledDue = sched.ScheduleType.Equals("Scheduled", StringComparison.OrdinalIgnoreCase) &&
                                             sched.StartDate.HasValue && sched.StartDate.Value <= now &&
                                             (!sched.NextRunAt.HasValue || sched.NextRunAt.Value <= now);

                        var isRecurringDue = sched.ScheduleType.Equals("Recurring", StringComparison.OrdinalIgnoreCase) &&
                                             sched.NextRunAt.HasValue && sched.NextRunAt.Value <= now;

                        if (isScheduledDue || isRecurringDue)
                        {
                            logger.LogInformation("Triggering dispatch for scheduled/recurring campaign {CampaignId}", campaign.Id);
                            await campaignDispatchService.DispatchAsync(campaign.Id);
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error occurred while executing CampaignStatusJob.");
            }

            await Task.Delay(_checkInterval, stoppingToken);
        }
    }
}
