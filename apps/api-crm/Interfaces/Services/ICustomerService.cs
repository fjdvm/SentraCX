using Crm.Api.DTOs.Requests;
using Crm.Api.DTOs.Responses;

namespace Crm.Api.Interfaces.Services;

public interface ICustomerService
{
    Task<PaginatedResponseDto<CustomerListResponseDto>> GetAllAsync(int page, int pageSize, string? customerType = null, string? searchTerm = null);
    Task<CustomerResponseDto?> GetByIdAsync(Guid id);
    Task<CustomerResponseDto?> GetByEmailAsync(string email);
    Task<CustomerResponseDto> CreateAsync(CreateCustomerRequestDto dto);
    Task<bool> UpdateStatusAsync(Guid id, UpdateCustomerStatusRequestDto dto);
    Task<bool> UpdateTypeAsync(Guid id, UpdateCustomerTypeRequestDto dto);
    Task<bool> UpdateNotesAsync(Guid id, UpdateCustomerNotesRequestDto dto);
    Task<bool> SoftDeleteAsync(Guid id);
    Task<(bool Success, Guid? TicketId, string Message)> ExecuteRetentionActionAsync(Guid customerId, RetentionActionRequestDto dto);
}
