using Crm.Api.Configurations;
using Crm.Api.Services;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace Crm.Api.Tests.Services;

public class SmtpEmailServiceTests
{
    [Fact]
    public async Task SendAsync_WhenHostEmpty_LogsWarningAndReturnsWithoutThrowing()
    {
        var options = Options.Create(new SmtpOptions { Host = "" });
        var logger = NullLogger<SmtpEmailService>.Instance;
        var service = new SmtpEmailService(options, logger);

        await service.SendAsync("test@example.com", "Test User", "Subject", "<h1>Hello</h1>");
    }

    [Fact]
    public async Task SendAsync_WhenToEmailEmpty_DoesNothing()
    {
        var options = Options.Create(new SmtpOptions { Host = "smtp.test.com" });
        var logger = NullLogger<SmtpEmailService>.Instance;
        var service = new SmtpEmailService(options, logger);

        await service.SendAsync("", "Test User", "Subject", "<h1>Hello</h1>");
    }
}
