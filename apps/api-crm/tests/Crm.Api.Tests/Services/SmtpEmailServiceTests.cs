using Crm.Api.Configurations;
using Crm.Api.Services;
using MailKit;
using MailKit.Net.Smtp;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using MimeKit;
using Moq;

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

    [Fact]
    public async Task SendAsync_UsesFromNameAndFromAddressFromOptions()
    {
        // Arrange
        var options = Options.Create(new SmtpOptions
        {
            Host = "smtp.test.com",
            Port = 587,
            From = "sender@example.com",
            FromName = "Custom Sender Name",
            Username = "user",
            Password = "pass"
        });
        var logger = NullLogger<SmtpEmailService>.Instance;
        var mockClient = new Mock<ISmtpClient>();

        MimeMessage? sentMessage = null;
        mockClient
            .Setup(c => c.SendAsync(It.IsAny<MimeMessage>(), It.IsAny<CancellationToken>(), It.IsAny<ITransferProgress>()))
            .Callback<MimeMessage, CancellationToken, ITransferProgress>((m, c, p) => sentMessage = m)
            .ReturnsAsync("250 OK");

        var service = new TestableSmtpEmailService(options, logger, mockClient.Object);

        // Act
        await service.SendAsync("recipient@example.com", "Recipient Name", "Test Subject", "Test Body");

        // Assert
        Assert.NotNull(sentMessage);
        var from = Assert.Single(sentMessage.From);
        var mailboxAddress = Assert.IsType<MailboxAddress>(from);
        Assert.Equal("Custom Sender Name", mailboxAddress.Name);
        Assert.Equal("sender@example.com", mailboxAddress.Address);
    }

    [Fact]
    public async Task SendAsync_WhenFromNameEmpty_FallsBackToSentraCX()
    {
        // Arrange
        var options = Options.Create(new SmtpOptions
        {
            Host = "smtp.test.com",
            Port = 587,
            From = "sender@example.com",
            FromName = "",
            Username = "user",
            Password = "pass"
        });
        var logger = NullLogger<SmtpEmailService>.Instance;
        var mockClient = new Mock<ISmtpClient>();

        MimeMessage? sentMessage = null;
        mockClient
            .Setup(c => c.SendAsync(It.IsAny<MimeMessage>(), It.IsAny<CancellationToken>(), It.IsAny<ITransferProgress>()))
            .Callback<MimeMessage, CancellationToken, ITransferProgress>((m, c, p) => sentMessage = m)
            .ReturnsAsync("250 OK");

        var service = new TestableSmtpEmailService(options, logger, mockClient.Object);

        // Act
        await service.SendAsync("recipient@example.com", "Recipient Name", "Test Subject", "Test Body");

        // Assert
        Assert.NotNull(sentMessage);
        var from = Assert.Single(sentMessage.From);
        var mailboxAddress = Assert.IsType<MailboxAddress>(from);
        Assert.Equal("SentraCX", mailboxAddress.Name);
        Assert.Equal("sender@example.com", mailboxAddress.Address);
    }

    private class TestableSmtpEmailService : SmtpEmailService
    {
        private readonly ISmtpClient _mockClient;

        public TestableSmtpEmailService(IOptions<SmtpOptions> options, ILogger<SmtpEmailService> logger, ISmtpClient mockClient)
            : base(options, logger)
        {
            _mockClient = mockClient;
        }

        protected override ISmtpClient CreateSmtpClient() => _mockClient;
    }
}
