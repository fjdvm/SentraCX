using Crm.Api.DTOs.Requests;
using Crm.Api.DTOs.Responses;

namespace Crm.Api.Interfaces.Services;

public interface IMessageService
{
    Task<List<MessageResponseDto>> GetByTicketIdAsync(Guid ticketId);
    Task<MessageResponseDto?> CreateAsync(Guid ticketId, string senderId, CreateMessageRequestDto dto);
    Task<bool> MarkAsReadAsync(Guid messageId);
    Task<List<MessageResponseDto>> GetSinceAsync(Guid ticketId, DateTime since);
}
