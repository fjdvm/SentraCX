using Crm.Api.DTOs.Requests;
using Crm.Api.Interfaces.Services;
using Microsoft.AspNetCore.SignalR;

namespace Crm.Api.Hubs;

public class ChatHub(IMessageService messageService) : Hub
{
    public async Task JoinTicket(string ticketId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, ticketId);
    }

    public async Task LeaveTicket(string ticketId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, ticketId);
    }

    public async Task JoinStaff()
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, "staff");
    }

    public async Task LeaveStaff()
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, "staff");
    }

    public async Task SendMessage(string ticketId, string senderId, string content, string senderType)
    {
        if (senderType != "customer" && senderType != "employee")
        {
            await Clients.Caller.SendAsync("Error", "Invalid sender type. Must be 'customer' or 'employee'.");
            return;
        }

        if (!Guid.TryParse(ticketId, out var ticketGuid))
        {
            await Clients.Caller.SendAsync("Error", "Invalid ticket ID.");
            return;
        }

        if (string.IsNullOrWhiteSpace(content))
        {
            await Clients.Caller.SendAsync("Error", "Message content cannot be empty.");
            return;
        }

        var message = await messageService.CreateAsync(
            ticketGuid, senderId, new CreateMessageRequestDto { Content = content });

        if (message is null)
        {
            await Clients.Caller.SendAsync("Error", "Ticket is not active or does not exist.");
            return;
        }

        await Clients.Group(ticketId).SendAsync("ReceiveMessage", message);

        if (senderType == "customer")
        {
            await Clients.Group("staff").SendAsync("NewMessageNotification", new
            {
                TicketId = ticketGuid,
                Message = message
            });
        }
    }

    public async Task MarkMessageRead(string messageId)
    {
        if (!Guid.TryParse(messageId, out var messageGuid))
        {
            await Clients.Caller.SendAsync("Error", "Invalid message ID.");
            return;
        }

        await messageService.MarkAsReadAsync(messageGuid);
    }
}
