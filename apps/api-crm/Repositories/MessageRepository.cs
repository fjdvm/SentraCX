using Crm.Api.Data;
using Crm.Api.Interfaces.Repositories;
using Crm.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Crm.Api.Repositories;

public class MessageRepository(AppDbContext context, ILogger<MessageRepository> logger) : IMessageRepository
{
    public async Task<List<Message>> GetByTicketIdAsync(Guid ticketId)
    {
        try
        {
            return await context.Messages
                .Include(m => m.Sender)
                .Where(m => m.TicketId == ticketId)
                .OrderBy(m => m.SentAt)
                .ToListAsync();
        }
        catch (Exception ex)
        {
            // Fallback: if Include(Sender) fails (e.g., FK constraint issue with orphaned SenderId),
            // load messages without the Sender navigation property.
            logger.LogWarning(ex, "Failed to load messages with Sender include for ticket {TicketId}. Falling back to query without Include.", ticketId);

            return await context.Messages
                .Where(m => m.TicketId == ticketId)
                .OrderBy(m => m.SentAt)
                .ToListAsync();
        }
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
