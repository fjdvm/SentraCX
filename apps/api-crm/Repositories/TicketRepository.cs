using Crm.Api.Data;
using Crm.Api.Interfaces.Repositories;
using Crm.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Crm.Api.Repositories;

public class TicketRepository(AppDbContext context) : ITicketRepository
{
    public async Task<(List<Ticket> Items, int TotalCount)> GetAllAsync(
        int page, int pageSize, string? status = null, Guid? customerId = null, string? assignedToId = null)
    {
        var query = context.Tickets
            .Include(t => t.Customer).ThenInclude(cp => cp.User)
            .Include(t => t.AssignedTo)
            .Include(t => t.Messages)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(t => t.Status == status);

        if (customerId.HasValue)
            query = query.Where(t => t.CustomerId == customerId.Value);

        // TODO (auth): When assignedToId is null, all Claimed/Ongoing tickets are returned (dev mode).
        //              Once auth is re-enabled, assignedToId will always be set from JWT claims.
        if (!string.IsNullOrWhiteSpace(assignedToId))
            query = query.Where(t => t.AssignedToId == assignedToId);

        // TODO (perf): At large ticket volumes, replace the Messages include with a subquery or
        //              a denormalized UnreadMessageCount column to avoid N+1 load.

        query = query.OrderByDescending(t => t.CreatedAt);

        var totalCount = await query.CountAsync();
        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return (items, totalCount);
    }

    public async Task<Ticket?> GetByIdAsync(Guid id)
    {
        return await context.Tickets
            .Include(t => t.Customer).ThenInclude(cp => cp.User)
            .Include(t => t.AssignedTo)
            .Include(t => t.Messages.OrderBy(m => m.SentAt))
                .ThenInclude(m => m.Sender)
            .FirstOrDefaultAsync(t => t.Id == id);
    }

    public async Task AddAsync(Ticket ticket)
    {
        context.Tickets.Add(ticket);
        await context.SaveChangesAsync();
    }

    public async Task UpdateAsync(Ticket ticket)
    {
        context.Tickets.Update(ticket);
        await context.SaveChangesAsync();
    }

    public async Task<int> GetActiveCountAsync()
    {
        return await context.Tickets.CountAsync(t => t.Status == "Unclaimed" || t.Status == "Claimed" || t.Status == "Ongoing");
    }

    public async Task<int> GetPendingEscalationsCountAsync()
    {
        var cutoff = DateTime.UtcNow.AddHours(-24);
        return await context.Tickets.CountAsync(t => t.Status == "Unclaimed" && t.CreatedAt < cutoff);
    }
}
