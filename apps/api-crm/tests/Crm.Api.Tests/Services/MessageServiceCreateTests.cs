using Crm.Api.DTOs.Requests;
using Crm.Api.Interfaces.Repositories;
using Crm.Api.Interfaces.Services;
using Crm.Api.Mappers;
using Crm.Api.Models;
using Crm.Api.Services;
using Moq;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Xunit;

namespace Crm.Api.Tests.Services;

public class MessageServiceCreateTests
{
    private readonly Mock<IMessageRepository> _messageRepoMock = new();
    private readonly Mock<ITicketRepository> _ticketRepoMock = new();
    private readonly Mock<IDashboardBroadcastService> _broadcastMock = new();
    private readonly MessageService _sut;

    public MessageServiceCreateTests()
    {
        _sut = new MessageService(_messageRepoMock.Object, _ticketRepoMock.Object, _broadcastMock.Object);
    }

    [Fact]
    public async Task CreateAsync_UpdatesTicketTimestamp_WhenMessageCreated()
    {
        // Arrange
        var ticketId = Guid.NewGuid();
        var ticket = new Ticket
        {
            Id = ticketId,
            Title = "Need Help",
            Status = "Claimed",
            CreatedAt = DateTime.UtcNow.AddHours(-2),
            UpdatedAt = DateTime.UtcNow.AddHours(-2)
        };
        var createdMessage = new Message
        {
            Id = Guid.NewGuid(),
            TicketId = ticketId,
            SenderId = "staff-1",
            Content = "Hello from support",
            SentAt = DateTime.UtcNow,
            Sender = new User { Id = "staff-1", DisplayName = "Staff User" }
        };

        _ticketRepoMock.Setup(r => r.GetByIdAsync(ticketId)).ReturnsAsync(ticket);
        _messageRepoMock.Setup(r => r.AddAsync(It.IsAny<Message>()))
            .Callback<Message>(m => m.Id = createdMessage.Id)
            .Returns(Task.CompletedTask);
        _ticketRepoMock.Setup(r => r.UpdateAsync(It.IsAny<Ticket>())).Returns(Task.CompletedTask);
        _broadcastMock.Setup(b => b.BroadcastMetricsAsync()).Returns(Task.CompletedTask);
        _messageRepoMock.Setup(r => r.GetByTicketIdAsync(ticketId))
            .ReturnsAsync(new List<Message> { createdMessage });

        // Act
        var result = await _sut.CreateAsync(ticketId, "staff-1", new CreateMessageRequestDto { Content = "Hello from support" });

        // Assert
        Assert.NotNull(result);
        Assert.Equal("Hello from support", result.Content);
        _ticketRepoMock.Verify(r => r.UpdateAsync(It.Is<Ticket>(t => t.Id == ticketId && t.UpdatedAt >= ticket.CreatedAt)), Times.Once);
    }

    [Fact]
    public async Task TicketMapper_ToListResponse_MapsLastMessageDetails()
    {
        // Arrange
        var ticketId = Guid.NewGuid();
        var sentTime = DateTime.UtcNow;
        var ticket = new Ticket
        {
            Id = ticketId,
            Title = "Payment Issue",
            Status = "Ongoing",
            CreatedAt = sentTime.AddHours(-1),
            UpdatedAt = sentTime,
            Messages = new List<Message>
            {
                new Message
                {
                    Id = Guid.NewGuid(),
                    TicketId = ticketId,
                    Content = "First message",
                    SentAt = sentTime.AddMinutes(-30),
                    IsRead = true
                },
                new Message
                {
                    Id = Guid.NewGuid(),
                    TicketId = ticketId,
                    Content = "Latest message preview",
                    SentAt = sentTime,
                    IsRead = false
                }
            }
        };

        // Act
        var response = TicketMapper.ToListResponse(ticket);

        // Assert
        Assert.Equal("Payment Issue", response.Title);
        Assert.Equal("Latest message preview", response.LastMessageContent);
        Assert.Equal(sentTime, response.LastMessageAt);
        Assert.Equal(1, response.UnreadMessageCount);
    }
}
