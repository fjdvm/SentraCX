using Crm.Api.Data;
using Crm.Api.Interfaces.Repositories;
using Crm.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Crm.Api.Repositories;

public class CustomerProfileRepository(AppDbContext context) : ICustomerProfileRepository
{
    public async Task<(List<CustomerProfile> Items, int TotalCount)> GetAllAsync(
        int page, int pageSize, string? customerType = null, string? searchTerm = null)
    {
        var query = context.CustomerProfiles
            .Include(cp => cp.User)
            .Where(cp => !cp.User.IsDeleted);

        if (!string.IsNullOrEmpty(customerType))
        {
            if (customerType.Equals("Contact", StringComparison.OrdinalIgnoreCase))
            {
                query = query.Where(cp => cp.CustomerType != "Lead");
            }
            else
            {
                query = query.Where(cp => cp.CustomerType == customerType);
            }
        }

        if (!string.IsNullOrWhiteSpace(searchTerm))
        {
            var term = searchTerm.Trim();
            if (context.Database.ProviderName == "Microsoft.EntityFrameworkCore.InMemory")
            {
                var termLower = term.ToLower();
                query = query.Where(cp =>
                    cp.User.DisplayName.ToLower().Contains(termLower) ||
                    cp.User.Email.ToLower().Contains(termLower));
            }
            else
            {
                query = query.Where(cp =>
                    EF.Functions.ILike(cp.User.DisplayName, $"%{term}%") ||
                    EF.Functions.ILike(cp.User.Email, $"%{term}%"));
            }
        }

        query = query.OrderByDescending(cp => cp.CreatedAt);

        var totalCount = await query.CountAsync();
        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return (items, totalCount);
    }

    public async Task<CustomerProfile?> GetByIdAsync(Guid id)
    {
        return await context.CustomerProfiles
            .Include(cp => cp.User)
            .FirstOrDefaultAsync(cp => cp.Id == id && !cp.User.IsDeleted);
    }

    public async Task<CustomerProfile?> GetByUserIdAsync(string userId)
    {
        return await context.CustomerProfiles
            .Include(cp => cp.User)
            .FirstOrDefaultAsync(cp => cp.UserId == userId && !cp.User.IsDeleted);
    }

    public async Task<CustomerProfile?> GetByEmailAsync(string email)
    {
        return await context.CustomerProfiles
            .Include(cp => cp.User)
            .FirstOrDefaultAsync(cp => cp.User.Email == email && !cp.User.IsDeleted);
    }

    public async Task<List<CustomerProfile>> GetAllActiveContactsAsync(
        string? targetAudience = null,
        List<string>? targetCustomerIds = null,
        List<string>? targetEmails = null)
    {
        var query = context.CustomerProfiles
            .Include(cp => cp.User)
            .Where(cp => !cp.User.IsDeleted
                      && cp.CustomerType != "Lead"
                      && cp.Status == "Active"
                      && cp.User.Email != null
                      && cp.User.Email != "");

        if (targetCustomerIds != null && targetCustomerIds.Count > 0)
        {
            var idGuids = targetCustomerIds
                .Select(id => Guid.TryParse(id, out var g) ? g : Guid.Empty)
                .Where(g => g != Guid.Empty)
                .ToList();

            if (targetEmails != null && targetEmails.Count > 0)
            {
                var normalizedEmails = targetEmails.Select(e => e.Trim().ToLower()).ToList();
                query = query.Where(cp => idGuids.Contains(cp.Id) || normalizedEmails.Contains(cp.User.Email.ToLower()));
            }
            else
            {
                query = query.Where(cp => idGuids.Contains(cp.Id));
            }
        }
        else if (targetEmails != null && targetEmails.Count > 0)
        {
            var normalizedEmails = targetEmails.Select(e => e.Trim().ToLower()).ToList();
            query = query.Where(cp => normalizedEmails.Contains(cp.User.Email.ToLower()));
        }
        else if (!string.IsNullOrWhiteSpace(targetAudience) &&
                 !targetAudience.Equals("All", StringComparison.OrdinalIgnoreCase) &&
                 !targetAudience.Equals("Specific", StringComparison.OrdinalIgnoreCase))
        {
            var typeToMatch = targetAudience.Equals("Institutional", StringComparison.OrdinalIgnoreCase)
                ? "InstitutionalBuyer" : targetAudience;
            query = query.Where(cp => cp.CustomerType.ToLower() == typeToMatch.ToLower());
        }
        else if (string.Equals(targetAudience, "Specific", StringComparison.OrdinalIgnoreCase))
        {
            // Specific audience with no customer IDs or emails yields 0 customer profile recipients
            return [];
        }

        return await query.ToListAsync();
    }

    public async Task AddAsync(CustomerProfile profile)
    {
        context.CustomerProfiles.Add(profile);
        await context.SaveChangesAsync();
    }

    public async Task UpdateAsync(CustomerProfile profile)
    {
        context.CustomerProfiles.Update(profile);
        await context.SaveChangesAsync();
    }
}
