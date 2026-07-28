using Crm.Api.DTOs.Requests;
using Crm.Api.DTOs.Responses;
using Crm.Api.Interfaces.Repositories;
using Crm.Api.Interfaces.Services;
using Crm.Api.Mappers;
using Crm.Api.Models;
using System.Linq;

namespace Crm.Api.Services;

public class MessageService(
    IMessageRepository messageRepo,
    ITicketRepository ticketRepo,
    IDashboardBroadcastService broadcastService) : IMessageService
{
    private static readonly HashSet<string> ActiveStatuses = ["Claimed", "Ongoing"];

    public async Task<List<MessageResponseDto>> GetByTicketIdAsync(Guid ticketId)
    {
        var messages = await messageRepo.GetByTicketIdAsync(ticketId);
        return messages.Select(MessageMapper.ToResponse).ToList();
    }

    public async Task<MessageResponseDto?> CreateAsync(
        Guid ticketId, string senderId, CreateMessageRequestDto dto)
    {
        var ticket = await ticketRepo.GetByIdAsync(ticketId);
        if (ticket is null) return null;

        if (!ActiveStatuses.Contains(ticket.Status)) return null;

        var message = new Message
        {
            TicketId = ticketId,
            SenderId = senderId,
            Content = dto.Content,
            IsRead = false,
            SentAt = DateTime.UtcNow
        };

        await messageRepo.AddAsync(message);
        await broadcastService.BroadcastMetricsAsync();

        // Reload with Sender navigation property
        var messages = await messageRepo.GetByTicketIdAsync(ticketId);
        var created = messages.LastOrDefault(m => m.Id == message.Id);
        return created is not null ? MessageMapper.ToResponse(created) : null;
    }

    public async Task<bool> MarkAsReadAsync(Guid messageId)
    {
        await messageRepo.MarkAsReadAsync(messageId);
        await broadcastService.BroadcastMetricsAsync();
        return true;
    }

    public async Task<List<MessageResponseDto>> GetSinceAsync(Guid ticketId, DateTime since)
    {
        var messages = await messageRepo.GetByTicketIdAsync(ticketId);
        return messages
            .Where(m => m.SentAt > since)
            .Select(MessageMapper.ToResponse)
            .ToList();
    }
}
