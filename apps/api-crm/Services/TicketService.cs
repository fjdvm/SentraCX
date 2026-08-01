using Crm.Api.DTOs.Requests;
using Crm.Api.DTOs.Responses;
using Crm.Api.Interfaces.Repositories;
using Crm.Api.Interfaces.Services;
using Crm.Api.Interfaces.Clients;
using Crm.Api.Mappers;
using Crm.Api.Models;

using Microsoft.AspNetCore.SignalR;
using Crm.Api.Hubs;

namespace Crm.Api.Services;

public class TicketService(
    ITicketRepository ticketRepo,
    ICustomerProfileRepository customerRepo,
    IAiAnalyticsClient aiClient,
    IDashboardBroadcastService broadcastService,
    IHubContext<ChatHub> chatHubContext) : ITicketService
{
    private static readonly Dictionary<string, HashSet<string>> ValidTransitions = new()
    {
        ["Claimed"] = ["Ongoing", "Completed"],
        ["Ongoing"] = ["Completed"]
    };

    public async Task<PaginatedResponseDto<TicketListResponseDto>> GetAllAsync(
        int page, int pageSize, string? status = null, Guid? customerId = null, string? assignedToId = null)
    {
        // The customerId may be a CustomerProfile.Id (from CRM frontend)
        // or an external User ID (from web-shop). Resolve to CustomerProfile.Id.
        var resolvedCustomerId = customerId;
        if (customerId.HasValue)
        {
            var customer = await customerRepo.GetByIdAsync(customerId.Value);
            if (customer is null)
            {
                customer = await customerRepo.GetByUserIdAsync(customerId.Value.ToString());
            }
            resolvedCustomerId = customer?.Id;
        }

        var (items, totalCount) = await ticketRepo.GetAllAsync(page, pageSize, status, resolvedCustomerId, assignedToId);

        return new PaginatedResponseDto<TicketListResponseDto>
        {
            Items = items.Select(TicketMapper.ToListResponse).ToList(),
            Page = page,
            PageSize = pageSize,
            TotalCount = totalCount
        };
    }

    public async Task<TicketResponseDto?> GetByIdAsync(Guid id)
    {
        var ticket = await ticketRepo.GetByIdAsync(id);
        return ticket is null ? null : TicketMapper.ToDetailResponse(ticket);
    }

    public async Task<TicketResponseDto> CreateAsync(CreateTicketRequestDto dto, Guid customerId)
    {
        // Resolve the actual CustomerProfile ID.
        // The customerId may be a CustomerProfile.Id (from CRM frontend)
        // or an external User ID (from web-shop). Try both.
        var customer = await customerRepo.GetByIdAsync(customerId);
        if (customer is null)
        {
            customer = await customerRepo.GetByUserIdAsync(customerId.ToString());
        }

        if (customer is null)
        {
            throw new InvalidOperationException(
                $"No customer profile found for ID '{customerId}'. Ensure the customer is registered in the CRM.");
        }

        var ticket = new Ticket
        {
            CustomerId = customer.Id,
            Title = dto.Title,
            Description = dto.Description,
            ImageUrl = dto.ImageUrl,
            Status = "Unclaimed",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await ticketRepo.AddAsync(ticket);
        await broadcastService.BroadcastMetricsAsync();

        var created = await ticketRepo.GetByIdAsync(ticket.Id);

        string category = "Uncategorized";
        string sentiment = "neutral";

        try
        {
            // Call AI analytics client to categorize/sentiment analyze ticket
            var analysis = await aiClient.AnalyzeTicketAsync(created!.Id, includeMessages: false);
            if (analysis != null)
            {
                category = analysis.PredictedCategory;
                sentiment = analysis.Sentiment;
            }
        }
        catch (Exception)
        {
            // Gracefully degrade: use default values without failing the request.
        }

        var response = TicketMapper.ToDetailResponse(created!);
        response.Category = category;
        response.Sentiment = sentiment;

        await chatHubContext.Clients.Group("staff").SendAsync("NewTicketAvailable", response);

        return response;
    }

    public async Task<bool> ClaimAsync(Guid id, string staffUserId)
    {
        var ticket = await ticketRepo.GetByIdAsync(id);
        if (ticket is null) return false;

        // Allow claiming tickets that are Unclaimed, or Ongoing with no current assignee
        // (escalated tickets that need a human agent to pick them up).
        if (ticket.Status != "Unclaimed" && !(ticket.Status == "Ongoing" && ticket.AssignedToId == null))
            return false;

        ticket.Status = "Claimed";
        ticket.AssignedToId = staffUserId;
        ticket.UpdatedAt = DateTime.UtcNow;
        await ticketRepo.UpdateAsync(ticket);
        await broadcastService.BroadcastMetricsAsync();
        var statusPayload = new
        {
            TicketId = id,
            Status = ticket.Status,
            AssignedToId = ticket.AssignedToId
        };
        await chatHubContext.Clients.Group("staff").SendAsync("TicketStatusChanged", statusPayload);
        await chatHubContext.Clients.Group(id.ToString()).SendAsync("TicketStatusChanged", statusPayload);
        return true;
    }

    public async Task<bool> UnclaimAsync(Guid id)
    {
        var ticket = await ticketRepo.GetByIdAsync(id);
        if (ticket is null) return false;

        if (ticket.Status != "Claimed" && ticket.Status != "Ongoing") return false;

        ticket.Status = "Unclaimed";
        ticket.AssignedToId = null;
        ticket.UpdatedAt = DateTime.UtcNow;
        await ticketRepo.UpdateAsync(ticket);
        await broadcastService.BroadcastMetricsAsync();
        var statusPayload = new
        {
            TicketId = id,
            Status = ticket.Status,
            AssignedToId = ticket.AssignedToId
        };
        await chatHubContext.Clients.Group("staff").SendAsync("TicketStatusChanged", statusPayload);
        await chatHubContext.Clients.Group(id.ToString()).SendAsync("TicketStatusChanged", statusPayload);
        return true;
    }

    public async Task<bool> UpdateStatusAsync(Guid id, UpdateTicketStatusRequestDto dto)
    {
        var ticket = await ticketRepo.GetByIdAsync(id);
        if (ticket is null) return false;

        if (!IsValidTransition(ticket.Status, dto.Status)) return false;

        ticket.Status = dto.Status;
        ticket.UpdatedAt = DateTime.UtcNow;
        await ticketRepo.UpdateAsync(ticket);
        await broadcastService.BroadcastMetricsAsync();
        var statusPayload = new
        {
            TicketId = id,
            Status = ticket.Status,
            AssignedToId = ticket.AssignedToId
        };
        await chatHubContext.Clients.Group("staff").SendAsync("TicketStatusChanged", statusPayload);
        await chatHubContext.Clients.Group(id.ToString()).SendAsync("TicketStatusChanged", statusPayload);
        return true;
    }

    public async Task<bool> CancelAsync(Guid id)
    {
        var ticket = await ticketRepo.GetByIdAsync(id);
        if (ticket is null) return false;

        if (ticket.Status is "Completed" or "Canceled") return false;

        ticket.Status = "Canceled";
        ticket.UpdatedAt = DateTime.UtcNow;
        await ticketRepo.UpdateAsync(ticket);
        await broadcastService.BroadcastMetricsAsync();
        var statusPayload = new
        {
            TicketId = id,
            Status = ticket.Status,
            AssignedToId = ticket.AssignedToId
        };
        await chatHubContext.Clients.Group("staff").SendAsync("TicketStatusChanged", statusPayload);
        await chatHubContext.Clients.Group(id.ToString()).SendAsync("TicketStatusChanged", statusPayload);
        return true;
    }

    public async Task<bool> EscalateAsync(Guid id, string botSummary)
    {
        var ticket = await ticketRepo.GetByIdAsync(id);
        if (ticket is null) return false;

        if (ticket.Status is "Completed" or "Canceled") return false;

        if (!string.IsNullOrWhiteSpace(botSummary))
        {
            ticket.Description = $"{ticket.Description}\n\n--- Bot Context ---\n{botSummary}";
        }

        ticket.Status = "Unclaimed";
        ticket.AssignedToId = null;
        ticket.UpdatedAt = DateTime.UtcNow;

        await ticketRepo.UpdateAsync(ticket);
        await broadcastService.BroadcastMetricsAsync();
        var statusPayload = new
        {
            TicketId = id,
            Status = ticket.Status,
            AssignedToId = ticket.AssignedToId
        };
        await chatHubContext.Clients.Group("staff").SendAsync("TicketStatusChanged", statusPayload);
        await chatHubContext.Clients.Group(id.ToString()).SendAsync("TicketStatusChanged", statusPayload);
        return true;
    }

    private static bool IsValidTransition(string currentStatus, string newStatus)
    {
        if (!ValidTransitions.TryGetValue(currentStatus, out var allowed))
            return false;

        return allowed.Contains(newStatus);
    }
}
