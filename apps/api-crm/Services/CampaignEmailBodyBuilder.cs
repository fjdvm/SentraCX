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
            .Replace("{{CampaignType}}", WebUtility.HtmlEncode(campaignTypeLabel));
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
    <div class=""footer"">
      &copy; SentraCX CRM. All rights reserved.
    </div>
  </div>
</body>
</html>";
    }
}
