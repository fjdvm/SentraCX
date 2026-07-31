using System.Net;
using System.Net.Http.Json;
using Crm.Api.Data;
using Crm.Api.DTOs.Requests;
using Crm.Api.DTOs.Responses;
using Crm.Api.Models;
using Crm.Api.Tests.Helpers;
using Microsoft.Extensions.DependencyInjection;

namespace Crm.Api.Tests.Controllers;

public class CustomersControllerTests(TestWebApplicationFactory factory)
    : IClassFixture<TestWebApplicationFactory>
{
    private readonly HttpClient _client = factory.CreateClient();

    [Fact]
    public async Task GetAll_ReturnsOkWithPaginatedResults()
    {
        await SeedCustomerAsync();

        var response = await _client.GetAsync("/api/v1/customers");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content
            .ReadFromJsonAsync<PaginatedResponseDto<CustomerListResponseDto>>();
        Assert.NotNull(result);
        Assert.True(result.Items.Count >= 1);
    }

    [Fact]
    public async Task GetById_WhenExists_ReturnsOk()
    {
        var customerId = await SeedCustomerAsync();

        var response = await _client.GetAsync($"/api/v1/customers/{customerId}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<CustomerResponseDto>();
        Assert.NotNull(result);
        Assert.Equal(customerId, result.Id);
    }

    [Fact]
    public async Task GetById_WhenNotFound_Returns404()
    {
        var response = await _client.GetAsync($"/api/v1/customers/{Guid.NewGuid()}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Create_ReturnsCreatedWithCustomer()
    {
        var dto = new CreateCustomerRequestDto
        {
            Email = $"new-{Guid.NewGuid():N}@example.com",
            FirstName = "New",
            LastName = "Customer",
            PhoneNumber = "555-0199",
            CustomerType = "Regular"
        };

        var response = await _client.PostAsJsonAsync("/api/v1/customers", dto);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<CustomerResponseDto>();
        Assert.NotNull(result);
        Assert.Equal("New", result.FirstName);
        Assert.Equal("Active", result.Status);
    }

    [Fact]
    public async Task UpdateStatus_WhenExists_ReturnsNoContent()
    {
        var customerId = await SeedCustomerAsync();
        var dto = new UpdateCustomerStatusRequestDto { Status = "Suspended" };

        var response = await _client.PutAsJsonAsync(
            $"/api/v1/customers/{customerId}/status", dto);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Fact]
    public async Task UpdateStatus_WhenNotFound_Returns404()
    {
        var dto = new UpdateCustomerStatusRequestDto { Status = "Active" };

        var response = await _client.PutAsJsonAsync(
            $"/api/v1/customers/{Guid.NewGuid()}/status", dto);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task GetAll_WithFilter_ReturnsFilteredResults()
    {
        await SeedCustomerAsync("Lead");
        await SeedCustomerAsync("Regular");

        var response = await _client.GetAsync("/api/v1/customers?customerType=Lead");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content
            .ReadFromJsonAsync<PaginatedResponseDto<CustomerListResponseDto>>();
        Assert.NotNull(result);
        Assert.True(result.Items.All(i => i.CustomerType == "Lead"));
    }

    [Fact]
    public async Task GetAll_WithSearchTerm_ReturnsMatchingResults()
    {
        using var scope = factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var userId = Guid.NewGuid().ToString();
        var user = new User
        {
            Id = userId,
            Email = $"search-{Guid.NewGuid():N}@example.com",
            FirstName = "UniqueSearchName",
            LastName = "Customer",
            DisplayName = "UniqueSearchName Customer",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        dbContext.Users.Add(user);

        var profile = new CustomerProfile
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            CustomerType = "Regular",
            Status = "Active",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        dbContext.CustomerProfiles.Add(profile);
        await dbContext.SaveChangesAsync();

        var response = await _client.GetAsync("/api/v1/customers?searchTerm=UniqueSearchName");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content
            .ReadFromJsonAsync<PaginatedResponseDto<CustomerListResponseDto>>();
        Assert.NotNull(result);
        Assert.Single(result.Items);
        Assert.Equal("UniqueSearchName Customer", result.Items[0].DisplayName);
    }

    [Fact]
    public async Task UpdateType_WhenLead_ReturnsBadRequest()
    {
        var customerId = await SeedCustomerAsync("Lead");
        var dto = new UpdateCustomerTypeRequestDto { CustomerType = "Regular" };

        var response = await _client.PutAsJsonAsync(
            $"/api/v1/customers/{customerId}/type", dto);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Delete_WhenExists_ReturnsNoContent()
    {
        var customerId = await SeedCustomerAsync();

        var response = await _client.DeleteAsync($"/api/v1/customers/{customerId}");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    private async Task<Guid> SeedCustomerAsync(string type = "Regular")
    {
        using var scope = factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var userId = Guid.NewGuid().ToString();
        var user = new User
        {
            Id = userId,
            Email = $"seed-{Guid.NewGuid():N}@example.com",
            FirstName = "Seed",
            LastName = "Customer",
            DisplayName = "Seed Customer",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        dbContext.Users.Add(user);

        var profile = new CustomerProfile
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            CustomerType = type,
            Status = "Active",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        dbContext.CustomerProfiles.Add(profile);
        await dbContext.SaveChangesAsync();

        return profile.Id;
    }
}
