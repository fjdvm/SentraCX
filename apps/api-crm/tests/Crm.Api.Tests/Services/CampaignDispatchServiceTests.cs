using Crm.Api.Interfaces.Repositories;
using Crm.Api.Interfaces.Services;
using Crm.Api.Models;
using Crm.Api.Services;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace Crm.Api.Tests.Services;

public class CampaignDispatchServiceTests
{
    private readonly Mock<ICampaignRepository> _campaignRepoMock = new();
    private readonly Mock<ICustomerProfileRepository> _customerRepoMock = new();
    private readonly Mock<IMarketingInteractionRepository> _interactionRepoMock = new();
    private readonly Mock<IEmailService> _emailServiceMock = new();
    private readonly CampaignDispatchService _sut;

    public CampaignDispatchServiceTests()
    {
        _sut = new CampaignDispatchService(
            _campaignRepoMock.Object,
            _customerRepoMock.Object,
            _interactionRepoMock.Object,
            _emailServiceMock.Object,
            NullLogger<CampaignDispatchService>.Instance);
    }

    [Fact]
    public async Task DispatchAsync_WhenCampaignNotFound_ReturnsZero()
    {
        _campaignRepoMock.Setup(r => r.GetByIdAsync(It.IsAny<Guid>())).ReturnsAsync((Campaign?)null);

        var count = await _sut.DispatchAsync(Guid.NewGuid());

        Assert.Equal(0, count);
    }

    [Fact]
    public async Task DispatchAsync_WhenEmailChannelNotPresent_SkipsDispatch()
    {
        var campaign = new Campaign
        {
            Id = Guid.NewGuid(),
            Channels = ["InApp", "Facebook"]
        };
        _campaignRepoMock.Setup(r => r.GetByIdAsync(campaign.Id)).ReturnsAsync(campaign);

        var count = await _sut.DispatchAsync(campaign.Id);

        Assert.Equal(0, count);
        _emailServiceMock.Verify(e => e.SendAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task DispatchAsync_WhenEmailSendSucceeds_SavesInteractionWithIsSuccessTrue()
    {
        var campaignId = Guid.NewGuid();
        var campaign = new Campaign
        {
            Id = campaignId,
            Title = "Summer Promo",
            Subject = "Hot Savings!",
            Description = "Great discounts",
            Channels = ["Email"],
            CampaignSchedule = new CampaignSchedule { ScheduleType = "SendNow" }
        };

        var recipients = new List<CustomerProfile>
        {
            new() { Id = Guid.NewGuid(), User = new User { Email = "user1@example.com", DisplayName = "User One" } },
            new() { Id = Guid.NewGuid(), User = new User { Email = "user2@example.com", DisplayName = "User Two" } }
        };

        _campaignRepoMock.Setup(r => r.GetByIdAsync(campaignId)).ReturnsAsync(campaign);
        _customerRepoMock.Setup(r => r.GetAllActiveContactsAsync(It.IsAny<string?>(), It.IsAny<List<string>?>(), It.IsAny<List<string>?>())).ReturnsAsync(recipients);

        var count = await _sut.DispatchAsync(campaignId);

        Assert.Equal(2, count);
        _emailServiceMock.Verify(e => e.SendAsync("user1@example.com", "User One", "Hot Savings!", It.IsAny<string>()), Times.Once);
        _emailServiceMock.Verify(e => e.SendAsync("user2@example.com", "User Two", "Hot Savings!", It.IsAny<string>()), Times.Once);
        _interactionRepoMock.Verify(i => i.AddAsync(It.Is<MarketingInteraction>(m => m.IsSuccess == true)), Times.Exactly(2));
        _campaignRepoMock.Verify(r => r.UpdateAsync(It.Is<Campaign>(c => c.CampaignSchedule!.NextRunAt == null)), Times.Once);
    }

    [Fact]
    public async Task DispatchAsync_WhenEmailSendFails_SavesInteractionWithIsSuccessFalse()
    {
        var campaignId = Guid.NewGuid();
        var campaign = new Campaign
        {
            Id = campaignId,
            Title = "Winter Sale",
            Subject = "Cold Deals!",
            Description = "Big discounts",
            Channels = ["Email"],
            CampaignSchedule = new CampaignSchedule { ScheduleType = "SendNow" }
        };

        var recipients = new List<CustomerProfile>
        {
            new() { Id = Guid.NewGuid(), User = new User { Email = "fail@example.com", DisplayName = "Fail User" } }
        };

        _campaignRepoMock.Setup(r => r.GetByIdAsync(campaignId)).ReturnsAsync(campaign);
        _customerRepoMock.Setup(r => r.GetAllActiveContactsAsync(It.IsAny<string?>(), It.IsAny<List<string>?>(), It.IsAny<List<string>?>())).ReturnsAsync(recipients);
        _emailServiceMock.Setup(e => e.SendAsync("fail@example.com", It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
            .ThrowsAsync(new Exception("SMTP connection failed"));

        var count = await _sut.DispatchAsync(campaignId);

        Assert.Equal(0, count);
        _interactionRepoMock.Verify(i => i.AddAsync(It.Is<MarketingInteraction>(m => m.IsSuccess == false)), Times.Once);
    }

    [Fact]
    public async Task DispatchAsync_MixedResults_TracksSuccessAndFailureCorrectly()
    {
        var campaignId = Guid.NewGuid();
        var campaign = new Campaign
        {
            Id = campaignId,
            Title = "Mixed Campaign",
            Subject = "Testing!",
            Description = "Mixed results",
            Channels = ["Email"],
            CampaignSchedule = new CampaignSchedule { ScheduleType = "SendNow" }
        };

        var recipients = new List<CustomerProfile>
        {
            new() { Id = Guid.NewGuid(), User = new User { Email = "ok@example.com", DisplayName = "OK User" } },
            new() { Id = Guid.NewGuid(), User = new User { Email = "fail@example.com", DisplayName = "Fail User" } }
        };

        _campaignRepoMock.Setup(r => r.GetByIdAsync(campaignId)).ReturnsAsync(campaign);
        _customerRepoMock.Setup(r => r.GetAllActiveContactsAsync(It.IsAny<string?>(), It.IsAny<List<string>?>(), It.IsAny<List<string>?>())).ReturnsAsync(recipients);
        _emailServiceMock.Setup(e => e.SendAsync("fail@example.com", It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
            .ThrowsAsync(new Exception("SMTP error"));

        var count = await _sut.DispatchAsync(campaignId);

        Assert.Equal(1, count);
        _interactionRepoMock.Verify(i => i.AddAsync(It.Is<MarketingInteraction>(m => m.IsSuccess == true)), Times.Once);
        _interactionRepoMock.Verify(i => i.AddAsync(It.Is<MarketingInteraction>(m => m.IsSuccess == false)), Times.Once);
    }
}
