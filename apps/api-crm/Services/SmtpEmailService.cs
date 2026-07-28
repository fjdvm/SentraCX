using Crm.Api.Configurations;
using Crm.Api.Interfaces.Services;
using MailKit.Net.Smtp;
using Microsoft.Extensions.Options;
using MimeKit;

namespace Crm.Api.Services;

public class SmtpEmailService(IOptions<SmtpOptions> options, ILogger<SmtpEmailService> logger) : IEmailService
{
    private readonly SmtpOptions _options = options.Value;

    public async Task SendAsync(string toEmail, string toName, string subject, string htmlBody)
    {
        if (string.IsNullOrWhiteSpace(toEmail)) return;

        var message = new MimeMessage();
        var fromAddress = string.IsNullOrWhiteSpace(_options.From) ? "noreply@sentracx.com" : _options.From;
        message.From.Add(new MailboxAddress("SentraCX", fromAddress));
        message.To.Add(new MailboxAddress(toName, toEmail));
        message.Subject = subject;

        var bodyBuilder = new BodyBuilder
        {
            HtmlBody = htmlBody
        };
        message.Body = bodyBuilder.ToMessageBody();

        if (string.IsNullOrWhiteSpace(_options.Host))
        {
            logger.LogWarning("SMTP Host is not configured. Email to {ToEmail} skipped (logged only).", toEmail);
            return;
        }

        try
        {
            using var client = CreateSmtpClient();
            var socketOptions = _options.Port == 465
                ? MailKit.Security.SecureSocketOptions.SslOnConnect
                : MailKit.Security.SecureSocketOptions.StartTls;
            await client.ConnectAsync(_options.Host, _options.Port, socketOptions);
            if (!string.IsNullOrWhiteSpace(_options.Username))
            {
                await client.AuthenticateAsync(_options.Username, _options.Password);
            }
            await client.SendAsync(message);
            await client.DisconnectAsync(true);
            logger.LogInformation("Email successfully sent to {ToEmail} via SMTP.", toEmail);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to send email to {ToEmail} via SMTP.", toEmail);
            throw;
        }
    }

    protected virtual ISmtpClient CreateSmtpClient() => new SmtpClient();
}
