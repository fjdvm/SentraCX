using Crm.Api.DTOs.Requests;
using Crm.Api.DTOs.Responses;
using Crm.Api.Interfaces.Repositories;
using Crm.Api.Interfaces.Services;
using Crm.Api.Mappers;
using Crm.Api.Models;

namespace Crm.Api.Services;

public class CustomerService(
    ICustomerProfileRepository customerRepo,
    IUserRepository userRepo,
    ITicketRepository ticketRepo) : ICustomerService
{
    public async Task<PaginatedResponseDto<CustomerListResponseDto>> GetAllAsync(
        int page, int pageSize, string? customerType = null, string? searchTerm = null)
    {
        var (items, totalCount) = await customerRepo.GetAllAsync(page, pageSize, customerType, searchTerm);

        return new PaginatedResponseDto<CustomerListResponseDto>
        {
            Items = items.Select(CustomerMapper.ToListResponse).ToList(),
            Page = page,
            PageSize = pageSize,
            TotalCount = totalCount
        };
    }

    public async Task<CustomerResponseDto?> GetByIdAsync(Guid id)
    {
        var profile = await customerRepo.GetByIdAsync(id);
        return profile is null ? null : CustomerMapper.ToDetailResponse(profile);
    }

    public async Task<CustomerResponseDto?> GetByEmailAsync(string email)
    {
        var profile = await customerRepo.GetByEmailAsync(email);
        return profile is null ? null : CustomerMapper.ToDetailResponse(profile);
    }

    public async Task<CustomerResponseDto> CreateAsync(CreateCustomerRequestDto dto)
    {
        var existing = await customerRepo.GetByEmailAsync(dto.Email);
        if (existing is not null)
        {
            throw new InvalidOperationException("A customer with this email already exists.");
        }
        var user = new User
        {
            Id = !string.IsNullOrWhiteSpace(dto.ExternalUserId) ? dto.ExternalUserId : Guid.NewGuid().ToString(),
            Email = dto.Email,
            FirstName = dto.FirstName,
            LastName = dto.LastName,
            DisplayName = $"{dto.FirstName} {dto.LastName}".Trim(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await userRepo.AddAsync(user);

        var profile = new CustomerProfile
        {
            UserId = user.Id,
            PhoneNumber = dto.PhoneNumber,
            CustomerType = dto.CustomerType,
            Address = dto.Address,
            Status = "Active",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await customerRepo.AddAsync(profile);

        // Reload with navigation property
        var created = await customerRepo.GetByIdAsync(profile.Id);
        return CustomerMapper.ToDetailResponse(created!);
    }

    public async Task<bool> UpdateStatusAsync(Guid id, UpdateCustomerStatusRequestDto dto)
    {
        var profile = await customerRepo.GetByIdAsync(id);
        if (profile is null) return false;

        profile.Status = dto.Status;
        profile.UpdatedAt = DateTime.UtcNow;
        await customerRepo.UpdateAsync(profile);
        return true;
    }

    public async Task<bool> UpdateTypeAsync(Guid id, UpdateCustomerTypeRequestDto dto)
    {
        var profile = await customerRepo.GetByIdAsync(id);
        if (profile is null) return false;

        // Enforce that a lead's type is always fixed to "Lead" and cannot be changed
        if (profile.CustomerType.Equals("Lead", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("A lead's customer type cannot be updated.");
        }

        profile.CustomerType = dto.CustomerType;
        profile.UpdatedAt = DateTime.UtcNow;
        await customerRepo.UpdateAsync(profile);
        return true;
    }

    public async Task<bool> UpdateNotesAsync(Guid id, UpdateCustomerNotesRequestDto dto)
    {
        var profile = await customerRepo.GetByIdAsync(id);
        if (profile is null) return false;

        profile.Notes = dto.Notes;
        profile.UpdatedAt = DateTime.UtcNow;
        await customerRepo.UpdateAsync(profile);
        return true;
    }

    public async Task<bool> SoftDeleteAsync(Guid id)
    {
        var profile = await customerRepo.GetByIdAsync(id);
        if (profile is null) return false;

        profile.User.IsDeleted = true;
        profile.User.UpdatedAt = DateTime.UtcNow;
        await userRepo.UpdateAsync(profile.User);
        return true;
    }

    public async Task<(bool Success, Guid? TicketId, string Message)> ExecuteRetentionActionAsync(Guid customerId, RetentionActionRequestDto dto)
    {
        var profile = await customerRepo.GetByIdAsync(customerId);
        if (profile is null) return (false, null, "Customer not found");

        // Enforce lead constraint
        if (profile.CustomerType.Equals("Lead", StringComparison.OrdinalIgnoreCase))
        {
            return (false, null, "Cannot apply retention actions to a lead.");
        }

        // Update customer type if not already At-Risk
        if (!profile.CustomerType.Equals("At-Risk", StringComparison.OrdinalIgnoreCase))
        {
            profile.CustomerType = "At-Risk";
            profile.UpdatedAt = DateTime.UtcNow;
            await customerRepo.UpdateAsync(profile);
        }

        // Create follow-up ticket
        var ticket = new Ticket
        {
            Id = Guid.NewGuid(),
            CustomerId = customerId,
            Title = $"[Retention] {profile.User.FirstName} {profile.User.LastName}",
            Description = dto.RecommendedAction,
            Status = "Unclaimed",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        await ticketRepo.AddAsync(ticket);

        return (true, ticket.Id, "Retention action executed successfully.");
    }
}
