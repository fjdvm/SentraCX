using Crm.Api.Models;
using Crm.Api.Services;

namespace Crm.Api.Tests.Services;

public class CampaignEmailBodyBuilderTests
{
    [Fact]
    public void Build_ReplacesAllTokensCorrectly_WithDefaultTemplate()
    {
        var campaign = new Campaign
        {
            Id = Guid.NewGuid(),
            Title = "Summer Sale 2026",
            Subject = "Unbeatable Summer Savings!",
            Description = "Get up to 50% off selected items this week.",
            Channels = ["Email", "InApp"]
        };

        var html = CampaignEmailBodyBuilder.Build(campaign, "John Doe");

        Assert.Contains("Hello John Doe", html);
        Assert.Contains("Unbeatable Summer Savings!", html);
        Assert.Contains("Get up to 50% off selected items this week.", html);
        Assert.Contains("Email, InApp", html);
        Assert.DoesNotContain("Special Offers Included", html);
    }

    [Fact]
    public void Build_WithCustomTemplate_ReplacesTokens()
    {
        var template = new Template
        {
            Id = Guid.NewGuid(),
            Name = "Promo Template",
            Channel = "Email",
            ContentHtml = "<h1>Hi {{CustomerName}}</h1><p>{{CampaignDescription}}</p>"
        };

        var campaign = new Campaign
        {
            Id = Guid.NewGuid(),
            Title = "Flash Sale",
            Subject = "Flash Sale Subject",
            Description = "Limited time offer",
            Channels = ["Email"],
            Template = template
        };

        var html = CampaignEmailBodyBuilder.Build(campaign, "Jane Smith");

        Assert.Contains("<h1>Hi Jane Smith</h1>", html);
        Assert.Contains("<p>Limited time offer</p>", html);
    }
}
