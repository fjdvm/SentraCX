using System.Net;
using System.Text;
using Crm.Api.Models;

namespace Crm.Api.Services;

public static class CampaignEmailBodyBuilder
{
    public static string Build(Campaign campaign, string customerName)
    {
        var campaignTypeLabel = string.Join(", ", campaign.Channels);
        if (string.IsNullOrWhiteSpace(campaignTypeLabel))
        {
            campaignTypeLabel = "Email";
        }

        var promotionsBlockHtml = RenderPromotionsBlock(campaign.CampaignPromotions.Select(cp => cp.Promotion));

        string rawHtml;
        if (campaign.Template != null && !string.IsNullOrWhiteSpace(campaign.Template.ContentHtml))
        {
            rawHtml = campaign.Template.ContentHtml;
        }
        else
        {
            rawHtml = GetDefaultTemplateHtml();
        }

        return rawHtml
            .Replace("{{CustomerName}}", WebUtility.HtmlEncode(customerName))
            .Replace("{{CampaignTitle}}", WebUtility.HtmlEncode(campaign.Title))
            .Replace("{{CampaignSubject}}", WebUtility.HtmlEncode(campaign.Subject))
            .Replace("{{CampaignDescription}}", WebUtility.HtmlEncode(campaign.Description))
            .Replace("{{CampaignType}}", WebUtility.HtmlEncode(campaignTypeLabel))
            .Replace("{{PromotionsBlock}}", promotionsBlockHtml);
    }

    private static string RenderPromotionsBlock(IEnumerable<Promotion?> promotions)
    {
        var validPromos = promotions.OfType<Promotion>().ToList();
        if (validPromos.Count == 0) return string.Empty;

        var sb = new StringBuilder();
        sb.AppendLine("<div style=\"margin-top: 20px; padding: 15px; background-color: #f8f9fa; border-radius: 8px; border: 1px solid #e9ecef;\">");
        sb.AppendLine("  <h3 style=\"margin-top: 0; color: #333;\">Special Offers Included</h3>");

        foreach (var promo in validPromos)
        {
            sb.AppendLine("  <div style=\"margin-bottom: 12px; padding: 10px; background-color: #ffffff; border-left: 4px solid #007bff; border-radius: 4px;\">");
            sb.AppendLine($"    <div style=\"font-weight: bold; font-size: 16px; color: #007bff;\">{WebUtility.HtmlEncode(promo.Title)} <span style=\"font-size: 12px; padding: 2px 6px; background-color: #e2e3e5; color: #383d41; border-radius: 4px;\">{WebUtility.HtmlEncode(promo.PromotionType)}</span></div>");

            if (!string.IsNullOrWhiteSpace(promo.Description))
            {
                sb.AppendLine($"    <p style=\"margin: 4px 0; color: #555; font-size: 14px;\">{WebUtility.HtmlEncode(promo.Description)}</p>");
            }

            if (promo.DiscountValue.HasValue)
            {
                sb.AppendLine($"    <div style=\"font-size: 14px; font-weight: 600; color: #28a745;\">Discount: {promo.DiscountValue.Value}% off</div>");
            }

            if (!string.IsNullOrWhiteSpace(promo.VoucherCode))
            {
                sb.AppendLine($"    <div style=\"margin-top: 6px;\"><span style=\"font-size: 12px; color: #6c757d;\">Voucher Code:</span> <code style=\"font-size: 14px; font-weight: bold; background-color: #fff3cd; padding: 2px 8px; border: 1px dashed #ffeeba; border-radius: 4px; color: #856404;\">{WebUtility.HtmlEncode(promo.VoucherCode)}</code></div>");
            }

            if (promo.StartDate.HasValue || promo.EndDate.HasValue)
            {
                var startStr = promo.StartDate?.ToString("yyyy-MM-dd") ?? "Now";
                var endStr = promo.EndDate?.ToString("yyyy-MM-dd") ?? "Until supplies last";
                sb.AppendLine($"    <div style=\"font-size: 12px; color: #6c757d; margin-top: 4px;\">Valid: {startStr} to {endStr}</div>");
            }

            sb.AppendLine("  </div>");
        }

        sb.AppendLine("</div>");
        return sb.ToString();
    }

    private static string GetDefaultTemplateHtml()
    {
        return @"<!DOCTYPE html>
<html>
<head>
  <meta charset=""utf-8"">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 24px; }
    .header { font-size: 20px; font-weight: bold; margin-bottom: 16px; color: #111; }
    .type-badge { font-size: 12px; background: #007bff; color: #fff; padding: 3px 8px; border-radius: 12px; display: inline-block; margin-bottom: 12px; }
    .footer { margin-top: 24px; font-size: 12px; color: #888; text-align: center; border-top: 1px solid #eee; padding-top: 12px; }
  </style>
</head>
<body>
  <div class=""container"">
    <div class=""type-badge"">{{CampaignType}}</div>
    <div class=""header"">{{CampaignSubject}}</div>
    <p>Hello {{CustomerName}},</p>
    <p>{{CampaignDescription}}</p>
    {{PromotionsBlock}}
    <div class=""footer"">
      &copy; SentraCX CRM. All rights reserved.
    </div>
  </div>
</body>
</html>";
    }
}
