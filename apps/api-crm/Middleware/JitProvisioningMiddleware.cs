using System.Security.Claims;
using Crm.Api.Data;
using Crm.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Crm.Api.Middleware;

public class JitProvisioningMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext context, AppDbContext dbContext)
    {
        if (context.User.Identity?.IsAuthenticated == true)
        {
            await ProvisionUserAsync(context.User, dbContext);
        }

        await next(context);
    }

    private static async Task ProvisionUserAsync(ClaimsPrincipal principal, AppDbContext dbContext)
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

        // Look up by ID first, then fall back to email to avoid duplicate key violations
        var user = await dbContext.Users.FirstOrDefaultAsync(u => u.Id == userId);

        if (user is null && !string.IsNullOrEmpty(email))
        {
            user = await dbContext.Users.FirstOrDefaultAsync(u => u.Email == email);
        }

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
            if (!string.IsNullOrEmpty(email)) user.Email = email;
            if (!string.IsNullOrEmpty(firstName)) user.FirstName = firstName;
            if (!string.IsNullOrEmpty(lastName)) user.LastName = lastName;
            var displayName = $"{firstName} {lastName}".Trim();
            if (!string.IsNullOrEmpty(displayName)) user.DisplayName = displayName;
            user.EmployeeNumber = employeeNumber;
            user.UpdatedAt = DateTime.UtcNow;
        }

        await dbContext.SaveChangesAsync();
    }
}
