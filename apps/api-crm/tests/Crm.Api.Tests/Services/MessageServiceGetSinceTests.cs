using Crm.Api.Interfaces.Repositories;
using Crm.Api.Interfaces.Services;
using Crm.Api.Models;
using Crm.Api.Services;
using Moq;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Xunit;

namespace Crm.Api.Tests.Services;

public class MessageServiceGetSinceTests
{
    private readonly Mock<IMessageRepository> _messageRepoMock = new();
    private readonly Mock<ITicketRepository> _ticketRepoMock = new();
    private readonly Mock<IDashboardBroadcastService> _broadcastMock = new();
    private readonly MessageService _sut;

    public MessageServiceGetSinceTests()
    {
        _sut = new MessageService(_messageRepoMock.Object, _ticketRepoMock.Object, _broadcastMock.Object);
    }

    [Fact]
    public async Task GetSinceAsync_ReturnsOnlyMessagesNewerThanSince()
    {
        // Arrange
        var ticketId = Guid.NewGuid();
        var baseTime = DateTime.UtcNow;
        var messages = new List<Message>
        {
            new Message { Id = Guid.NewGuid(), TicketId = ticketId, Content = "Old message", SentAt = baseTime.AddMinutes(-5), Sender = new User { Id = "u1", DisplayName = "User 1" } },
            new Message { Id = Guid.NewGuid(), TicketId = ticketId, Content = "New message", SentAt = baseTime.AddMinutes(5), Sender = new User { Id = "u2", DisplayName = "User 2" } }
        };

        _messageRepoMock.Setup(r => r.GetByTicketIdAsync(ticketId)).ReturnsAsync(messages);

        // Act
        var result = await _sut.GetSinceAsync(ticketId, baseTime);

        // Assert
        Assert.Single(result);
        Assert.Equal("New message", result[0].Content);
    }
}
