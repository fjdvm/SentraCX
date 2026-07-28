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
            ContentHtml = "<h1>Hi {{CustomerName}}</h1><p>{{CampaignDescription}}</p><div>{{PromotionsBlock}}</div>"
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

    [Fact]
    public void Build_RendersPromotionsBlock_WhenPromotionsAreAttached()
    {
        var promo1 = new Promotion
        {
            Id = Guid.NewGuid(),
            Title = "20% OFF Everything",
            Description = "Applies to all products",
            PromotionType = "Discount",
            DiscountValue = 20,
            VoucherCode = "SUMMER20"
        };

        var promo2 = new Promotion
        {
            Id = Guid.NewGuid(),
            Title = "Free Shipping",
            Description = "Orders over $50",
            PromotionType = "FreeShipping",
            StartDate = new DateTime(2026, 7, 1),
            EndDate = new DateTime(2026, 8, 1)
        };

        var campaign = new Campaign
        {
            Id = Guid.NewGuid(),
            Title = "Promo Festival",
            Subject = "Huge Deals",
            Description = "Check out our latest promos!",
            Channels = ["Email"],
            CampaignPromotions = new List<CampaignPromotion>
            {
                new() { Promotion = promo1 },
                new() { Promotion = promo2 }
            }
        };

        var html = CampaignEmailBodyBuilder.Build(campaign, "Alice");

        Assert.Contains("Special Offers Included", html);
        Assert.Contains("20% OFF Everything", html);
        Assert.Contains("SUMMER20", html);
        Assert.Contains("Discount: 20% off", html);
        Assert.Contains("Free Shipping", html);
        Assert.Contains("2026-07-01 to 2026-08-01", html);
    }
}
