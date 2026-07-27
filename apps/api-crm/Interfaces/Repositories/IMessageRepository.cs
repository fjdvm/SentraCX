using Crm.Api.Models;

namespace Crm.Api.Interfaces.Repositories;

public interface IMessageRepository
{
    Task<List<Message>> GetByTicketIdAsync(Guid ticketId);
    Task AddAsync(Message message);
    Task MarkAsReadAsync(Guid messageId);
    Task<int> GetUnreadConversationsCountAsync();
}
