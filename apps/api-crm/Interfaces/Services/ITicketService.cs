using Crm.Api.DTOs.Requests;
using Crm.Api.DTOs.Responses;

namespace Crm.Api.Interfaces.Services;

public interface ITicketService
{
    Task<PaginatedResponseDto<TicketListResponseDto>> GetAllAsync(
        int page, int pageSize, string? status = null, Guid? customerId = null, string? assignedToId = null, string? currentUserId = null, bool isSuperUser = false);
    Task<TicketResponseDto?> GetByIdAsync(Guid id);
    Task<TicketResponseDto> CreateAsync(CreateTicketRequestDto dto, Guid customerId);
    Task<bool> ClaimAsync(Guid id, string staffUserId);
    Task<bool> UnclaimAsync(Guid id);
    Task<bool> UpdateStatusAsync(Guid id, UpdateTicketStatusRequestDto dto);
    Task<bool> CancelAsync(Guid id);
    Task<bool> EscalateAsync(Guid id, string botSummary);
}
