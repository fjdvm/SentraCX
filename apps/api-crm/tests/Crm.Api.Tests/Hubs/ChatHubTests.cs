using Crm.Api.DTOs.Requests;
using Crm.Api.DTOs.Responses;
using Crm.Api.Hubs;
using Crm.Api.Interfaces.Services;
using Microsoft.AspNetCore.SignalR;
using Moq;

namespace Crm.Api.Tests.Hubs;

public class ChatHubTests
{
    private readonly Mock<IMessageService> _messageServiceMock = new();
    private readonly Mock<IHubCallerClients> _clientsMock = new();
    private readonly Mock<IGroupManager> _groupsMock = new();
    private readonly Mock<HubCallerContext> _contextMock = new();
    private readonly Mock<ISingleClientProxy> _callerMock = new();
    private readonly Mock<IClientProxy> _groupClientMock = new();
    private readonly ChatHub _sut;

    public ChatHubTests()
    {
        _contextMock.Setup(c => c.ConnectionId).Returns("conn-1");
        _clientsMock.Setup(c => c.Caller).Returns(_callerMock.Object);
        _clientsMock.Setup(c => c.Group(It.IsAny<string>())).Returns(_groupClientMock.Object);

        _sut = new ChatHub(_messageServiceMock.Object)
        {
            Clients = _clientsMock.Object,
            Groups = _groupsMock.Object,
            Context = _contextMock.Object
        };
    }

    [Fact]
    public async Task JoinTicket_AddsConnectionToGroup()
    {
        var ticketId = Guid.NewGuid().ToString();

        await _sut.JoinTicket(ticketId);

        _groupsMock.Verify(g => g.AddToGroupAsync("conn-1", ticketId, default), Times.Once);
    }

    [Fact]
    public async Task LeaveTicket_RemovesConnectionFromGroup()
    {
        var ticketId = Guid.NewGuid().ToString();

        await _sut.LeaveTicket(ticketId);

        _groupsMock.Verify(g => g.RemoveFromGroupAsync("conn-1", ticketId, default), Times.Once);
    }

    [Fact]
    public async Task SendMessage_ValidTicket_SavesAndBroadcastsToGroup()
    {
        var ticketId = Guid.NewGuid().ToString();
        var senderId = "user-1";
        var content = "Hello!";
        var saved = new MessageResponseDto
        {
            Id = Guid.NewGuid(),
            SenderId = senderId,
            SenderName = "User One",
            Content = content,
            IsRead = false,
            SentAt = DateTime.UtcNow
        };

        _messageServiceMock
            .Setup(s => s.CreateAsync(
                Guid.Parse(ticketId),
                senderId,
                It.Is<CreateMessageRequestDto>(d => d.Content == content)))
            .ReturnsAsync(saved);

        await _sut.SendMessage(ticketId, senderId, content, "employee");

        _messageServiceMock.Verify(s => s.CreateAsync(
            Guid.Parse(ticketId), senderId,
            It.Is<CreateMessageRequestDto>(d => d.Content == content)), Times.Once);

        _groupClientMock.Verify(c =>
            c.SendCoreAsync("ReceiveMessage", It.Is<object[]>(a => a[0] == saved), default),
            Times.Once);
    }

    [Fact]
    public async Task SendMessage_CustomerSenderType_BroadcastsNewMessageNotification()
    {
        var ticketId = Guid.NewGuid().ToString();
        var senderId = "user-1";
        var content = "Hello!";
        var saved = new MessageResponseDto
        {
            Id = Guid.NewGuid(),
            SenderId = senderId,
            SenderName = "User One",
            Content = content,
            IsRead = false,
            SentAt = DateTime.UtcNow
        };

        _messageServiceMock
            .Setup(s => s.CreateAsync(
                Guid.Parse(ticketId),
                senderId,
                It.Is<CreateMessageRequestDto>(d => d.Content == content)))
            .ReturnsAsync(saved);

        await _sut.SendMessage(ticketId, senderId, content, "customer");

        _clientsMock.Verify(c => c.Group("staff"), Times.Once);
        _groupClientMock.Verify(c =>
            c.SendCoreAsync("NewMessageNotification", It.Is<object[]>(a => a[0] != null), default),
            Times.Once);
    }

    [Fact]
    public async Task SendMessage_InvalidSenderType_SendsErrorToCaller()
    {
        await _sut.SendMessage(Guid.NewGuid().ToString(), "user-1", "Hello", "invalid-type");

        _callerMock.Verify(c =>
            c.SendCoreAsync("Error", It.IsAny<object[]>(), default),
            Times.Once);
    }

    [Fact]
    public async Task SendMessage_InvalidTicketId_SendsErrorToCaller()
    {
        await _sut.SendMessage("not-a-guid", "user-1", "Hello", "employee");

        _callerMock.Verify(c =>
            c.SendCoreAsync("Error", It.IsAny<object[]>(), default),
            Times.Once);

        _messageServiceMock.Verify(s =>
            s.CreateAsync(It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<CreateMessageRequestDto>()),
            Times.Never);
    }

    [Fact]
    public async Task SendMessage_EmptyContent_SendsErrorToCaller()
    {
        var ticketId = Guid.NewGuid().ToString();

        await _sut.SendMessage(ticketId, "user-1", "   ", "employee");

        _callerMock.Verify(c =>
            c.SendCoreAsync("Error", It.IsAny<object[]>(), default),
            Times.Once);

        _messageServiceMock.Verify(s =>
            s.CreateAsync(It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<CreateMessageRequestDto>()),
            Times.Never);
    }

    [Fact]
    public async Task SendMessage_InactiveTicket_SendsErrorToCaller()
    {
        var ticketId = Guid.NewGuid().ToString();

        _messageServiceMock
            .Setup(s => s.CreateAsync(
                It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<CreateMessageRequestDto>()))
            .ReturnsAsync((MessageResponseDto?)null);

        await _sut.SendMessage(ticketId, "user-1", "Hello", "employee");

        _callerMock.Verify(c =>
            c.SendCoreAsync("Error", It.IsAny<object[]>(), default),
            Times.Once);

        _groupClientMock.Verify(c =>
            c.SendCoreAsync("ReceiveMessage", It.IsAny<object[]>(), default),
            Times.Never);
    }

    [Fact]
    public async Task JoinStaff_AddsConnectionToStaffGroup()
    {
        await _sut.JoinStaff();

        _groupsMock.Verify(g => g.AddToGroupAsync("conn-1", "staff", default), Times.Once);
    }

    [Fact]
    public async Task LeaveStaff_RemovesConnectionFromStaffGroup()
    {
        await _sut.LeaveStaff();

        _groupsMock.Verify(g => g.RemoveFromGroupAsync("conn-1", "staff", default), Times.Once);
    }

    [Fact]
    public async Task MarkMessageRead_ValidId_CallsService()
    {
        var messageId = Guid.NewGuid().ToString();

        await _sut.MarkMessageRead(messageId);

        _messageServiceMock.Verify(s => s.MarkAsReadAsync(Guid.Parse(messageId)), Times.Once);
    }

    [Fact]
    public async Task MarkMessageRead_InvalidId_SendsErrorToCaller()
    {
        await _sut.MarkMessageRead("not-a-guid");

        _callerMock.Verify(c =>
            c.SendCoreAsync("Error", It.IsAny<object[]>(), default),
            Times.Once);

        _messageServiceMock.Verify(s =>
            s.MarkAsReadAsync(It.IsAny<Guid>()), Times.Never);
    }
}
