using Crm.Api.Data;
using Crm.Api.Interfaces.Repositories;
using Crm.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Crm.Api.Repositories;

public class MessageRepository(AppDbContext context) : IMessageRepository
{
    public async Task<List<Message>> GetByTicketIdAsync(Guid ticketId)
    {
        return await context.Messages
            .Include(m => m.Sender)
            .Where(m => m.TicketId == ticketId)
            .OrderBy(m => m.SentAt)
            .ToListAsync();
    }

    public async Task AddAsync(Message message)
    {
        context.Messages.Add(message);
        await context.SaveChangesAsync();
    }

    public async Task MarkAsReadAsync(Guid messageId)
    {
        var message = await context.Messages.FindAsync(messageId);
        if (message is not null)
        {
            message.IsRead = true;
            await context.SaveChangesAsync();
        }
    }

    public async Task<int> GetUnreadConversationsCountAsync()
    {
        return await context.Messages
            .CountAsync(m => !m.IsRead && (m.Ticket.Status == "Claimed" || m.Ticket.Status == "Ongoing") && m.SenderId != m.Ticket.AssignedToId);
    }
}
