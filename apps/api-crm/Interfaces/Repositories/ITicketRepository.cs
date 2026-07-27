using Crm.Api.Models;

namespace Crm.Api.Interfaces.Repositories;

public interface ITicketRepository
{
    // TODO: In dev, assignedToId is passed as null (no filter applied — shows all Claimed/Ongoing).
    //       When auth is re-enabled, this will be populated from JWT claims in the controller.
    Task<(List<Ticket> Items, int TotalCount)> GetAllAsync(
        int page, int pageSize, string? status = null, Guid? customerId = null, string? assignedToId = null);
    Task<Ticket?> GetByIdAsync(Guid id);
    Task AddAsync(Ticket ticket);
    Task UpdateAsync(Ticket ticket);
    Task<int> GetActiveCountAsync();
    Task<int> GetPendingEscalationsCountAsync();
}
