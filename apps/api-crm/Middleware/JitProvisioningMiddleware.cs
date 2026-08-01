using System.Security.Claims;
using Crm.Api.Data;
using Crm.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Crm.Api.Middleware;

public class JitProvisioningMiddleware(RequestDelegate next, ILogger<JitProvisioningMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context, AppDbContext dbContext)
    {
        if (context.User.Identity?.IsAuthenticated == true)
        {
            await ProvisionUserAsync(context.User, dbContext);
        }

        await next(context);
    }

    private async Task ProvisionUserAsync(ClaimsPrincipal principal, AppDbContext dbContext)
    {
        var userId = principal.FindFirstValue(ClaimTypes.NameIdentifier)
                     ?? principal.FindFirstValue("sub");

        if (string.IsNullOrEmpty(userId))
            return;

        var email = principal.FindFirstValue(ClaimTypes.Email) ?? string.Empty;
        var firstName = principal.FindFirstValue(ClaimTypes.GivenName)
                        ?? principal.FindFirstValue("firstName") ?? string.Empty;
        var lastName = principal.FindFirstValue(ClaimTypes.Surname)
                       ?? principal.FindFirstValue("lastName") ?? string.Empty;

        var employeeNumberClaim = principal.FindFirstValue("employeeNumber");
        int? employeeNumber = int.TryParse(employeeNumberClaim, out var num) ? num : null;

        try
        {
            // Lookup strictly by ID — the stable unique identifier from the auth service.
            // Do NOT fall back to email since staff and customers can share the same email.
            var user = await dbContext.Users.FirstOrDefaultAsync(u => u.Id == userId);

            if (user is null)
            {
                user = new User
                {
                    Id = userId,
                    Email = email,
                    FirstName = firstName,
                    LastName = lastName,
                    DisplayName = $"{firstName} {lastName}".Trim(),
                    EmployeeNumber = employeeNumber,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                dbContext.Users.Add(user);
            }
            else
            {
                var changed = false;
                if (!string.IsNullOrEmpty(email) && user.Email != email) { user.Email = email; changed = true; }
                if (!string.IsNullOrEmpty(firstName) && user.FirstName != firstName) { user.FirstName = firstName; changed = true; }
                if (!string.IsNullOrEmpty(lastName) && user.LastName != lastName) { user.LastName = lastName; changed = true; }
                var displayName = $"{firstName} {lastName}".Trim();
                if (!string.IsNullOrEmpty(displayName) && user.DisplayName != displayName) { user.DisplayName = displayName; changed = true; }
                if (user.EmployeeNumber != employeeNumber) { user.EmployeeNumber = employeeNumber; changed = true; }

                if (!changed) return;

                user.UpdatedAt = DateTime.UtcNow;
            }

            await dbContext.SaveChangesAsync();
        }
        catch (DbUpdateException ex)
        {
            // Concurrent insert race condition — another request provisioned the same user.
            // Log and continue; the user will be found on the next request.
            logger.LogWarning(ex,
                "JIT provisioning conflict for user {UserId}. Likely a concurrent insert.",
                userId);
            dbContext.ChangeTracker.Clear();
        }
    }
}
