using Crm.Api.DTOs.Requests;
using Crm.Api.Interfaces.Repositories;
using Crm.Api.Models;
using Crm.Api.Services;
using Moq;

namespace Crm.Api.Tests.Services;

public class CustomerServiceTests
{
    private readonly Mock<ICustomerProfileRepository> _customerRepoMock = new();
    private readonly Mock<IUserRepository> _userRepoMock = new();
    private readonly Mock<ITicketRepository> _ticketRepoMock = new();
    private readonly CustomerService _sut;

    public CustomerServiceTests()
    {
        _sut = new CustomerService(_customerRepoMock.Object, _userRepoMock.Object, _ticketRepoMock.Object);
    }

    [Fact]
    public async Task GetAllAsync_ReturnsPaginatedResults()
    {
        var profiles = new List<CustomerProfile>
        {
            CreateTestProfile("user-1", "John", "Doe"),
            CreateTestProfile("user-2", "Jane", "Smith")
        };

        _customerRepoMock
            .Setup(r => r.GetAllAsync(1, 10, null, null))
            .ReturnsAsync((profiles, 2));

        var result = await _sut.GetAllAsync(1, 10);

        Assert.Equal(2, result.Items.Count);
        Assert.Equal(1, result.Page);
        Assert.Equal(10, result.PageSize);
        Assert.Equal(2, result.TotalCount);
    }

    [Fact]
    public async Task GetByIdAsync_WhenExists_ReturnsCustomer()
    {
        var id = Guid.NewGuid();
        var profile = CreateTestProfile("user-1", "John", "Doe");
        profile.Id = id;

        _customerRepoMock
            .Setup(r => r.GetByIdAsync(id))
            .ReturnsAsync(profile);

        var result = await _sut.GetByIdAsync(id);

        Assert.NotNull(result);
        Assert.Equal(id, result.Id);
        Assert.Equal("John", result.FirstName);
    }

    [Fact]
    public async Task GetByIdAsync_WhenNotFound_ReturnsNull()
    {
        var id = Guid.NewGuid();
        _customerRepoMock
            .Setup(r => r.GetByIdAsync(id))
            .ReturnsAsync((CustomerProfile?)null);

        var result = await _sut.GetByIdAsync(id);

        Assert.Null(result);
    }

    [Fact]
    public async Task CreateAsync_CreatesUserAndProfile()
    {
        var dto = new CreateCustomerRequestDto
        {
            Email = "test@example.com",
            FirstName = "Test",
            LastName = "User",
            PhoneNumber = "1234567890",
            CustomerType = "Regular"
        };

        _customerRepoMock
            .Setup(r => r.GetByIdAsync(It.IsAny<Guid>()))
            .ReturnsAsync((Guid id) => CreateTestProfile("any-id", "Test", "User"));

        var result = await _sut.CreateAsync(dto);

        _userRepoMock.Verify(r => r.AddAsync(It.Is<User>(u =>
            u.Email == "test@example.com" &&
            u.FirstName == "Test" &&
            u.LastName == "User"
        )), Times.Once);

        _customerRepoMock.Verify(r => r.AddAsync(It.Is<CustomerProfile>(p =>
            p.CustomerType == "Regular" &&
            p.Status == "Active" &&
            p.PhoneNumber == "1234567890"
        )), Times.Once);
    }

    [Fact]
    public async Task CreateAsync_WhenEmailExists_ThrowsInvalidOperationException()
    {
        var dto = new CreateCustomerRequestDto
        {
            Email = "test@example.com",
            FirstName = "Test",
            LastName = "User",
            CustomerType = "Regular"
        };

        var existingProfile = CreateTestProfile("any-id", "Test", "User");
        _customerRepoMock
            .Setup(r => r.GetByEmailAsync("test@example.com"))
            .ReturnsAsync(existingProfile);

        await Assert.ThrowsAsync<InvalidOperationException>(() => _sut.CreateAsync(dto));
    }

    [Fact]
    public async Task UpdateStatusAsync_WhenExists_UpdatesAndReturnsTrue()
    {
        var id = Guid.NewGuid();
        var profile = CreateTestProfile("user-1", "John", "Doe");
        profile.Id = id;

        _customerRepoMock.Setup(r => r.GetByIdAsync(id)).ReturnsAsync(profile);

        var result = await _sut.UpdateStatusAsync(id,
            new UpdateCustomerStatusRequestDto { Status = "Suspended" });

        Assert.True(result);
        Assert.Equal("Suspended", profile.Status);
        _customerRepoMock.Verify(r => r.UpdateAsync(profile), Times.Once);
    }

    [Fact]
    public async Task UpdateStatusAsync_WhenNotFound_ReturnsFalse()
    {
        var id = Guid.NewGuid();
        _customerRepoMock.Setup(r => r.GetByIdAsync(id))
            .ReturnsAsync((CustomerProfile?)null);

        var result = await _sut.UpdateStatusAsync(id,
            new UpdateCustomerStatusRequestDto { Status = "Active" });

        Assert.False(result);
    }

    [Fact]
    public async Task UpdateTypeAsync_WhenExists_UpdatesAndReturnsTrue()
    {
        var id = Guid.NewGuid();
        var profile = CreateTestProfile("user-1", "John", "Doe");
        profile.Id = id;

        _customerRepoMock.Setup(r => r.GetByIdAsync(id)).ReturnsAsync(profile);

        var result = await _sut.UpdateTypeAsync(id,
            new UpdateCustomerTypeRequestDto { CustomerType = "InstitutionalBuyer" });

        Assert.True(result);
        Assert.Equal("InstitutionalBuyer", profile.CustomerType);
    }

    [Fact]
    public async Task UpdateTypeAsync_WhenLead_ThrowsInvalidOperationException()
    {
        var id = Guid.NewGuid();
        var profile = CreateTestProfile("user-1", "John", "Doe");
        profile.Id = id;
        profile.CustomerType = "Lead";

        _customerRepoMock.Setup(r => r.GetByIdAsync(id)).ReturnsAsync(profile);

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _sut.UpdateTypeAsync(id, new UpdateCustomerTypeRequestDto { CustomerType = "Regular" }));

        Assert.Equal("Lead", profile.CustomerType);
    }

    [Fact]
    public async Task UpdateNotesAsync_WhenExists_UpdatesAndReturnsTrue()
    {
        var id = Guid.NewGuid();
        var profile = CreateTestProfile("user-1", "John", "Doe");
        profile.Id = id;

        _customerRepoMock.Setup(r => r.GetByIdAsync(id)).ReturnsAsync(profile);

        var result = await _sut.UpdateNotesAsync(id,
            new UpdateCustomerNotesRequestDto { Notes = "VIP customer" });

        Assert.True(result);
        Assert.Equal("VIP customer", profile.Notes);
    }

    [Fact]
    public async Task SoftDeleteAsync_WhenExists_SetsIsDeletedAndReturnsTrue()
    {
        var id = Guid.NewGuid();
        var profile = CreateTestProfile("user-1", "John", "Doe");
        profile.Id = id;

        _customerRepoMock.Setup(r => r.GetByIdAsync(id)).ReturnsAsync(profile);

        var result = await _sut.SoftDeleteAsync(id);

        Assert.True(result);
        Assert.True(profile.User.IsDeleted);
        _userRepoMock.Verify(r => r.UpdateAsync(profile.User), Times.Once);
    }

    [Fact]
    public async Task SoftDeleteAsync_WhenNotFound_ReturnsFalse()
    {
        var id = Guid.NewGuid();
        _customerRepoMock.Setup(r => r.GetByIdAsync(id))
            .ReturnsAsync((CustomerProfile?)null);

        var result = await _sut.SoftDeleteAsync(id);

        Assert.False(result);
    }

    [Fact]
    public async Task ExecuteRetentionActionAsync_WhenExistsAndNotLead_UpdatesTypeAndCreatesTicket()
    {
        var id = Guid.NewGuid();
        var profile = CreateTestProfile("user-1", "John", "Doe");
        profile.Id = id;

        _customerRepoMock.Setup(r => r.GetByIdAsync(id)).ReturnsAsync(profile);

        var dto = new RetentionActionRequestDto("High", "Follow up call", 0.7);
        var result = await _sut.ExecuteRetentionActionAsync(id, dto);

        Assert.True(result.Success);
        Assert.NotNull(result.TicketId);
        Assert.Equal("At-Risk", profile.CustomerType);
        
        _customerRepoMock.Verify(r => r.UpdateAsync(profile), Times.Once);
        _ticketRepoMock.Verify(r => r.AddAsync(It.Is<Ticket>(t => 
            t.CustomerId == id && 
            t.Title == "[Retention] John Doe" && 
            t.Description == "Follow up call"
        )), Times.Once);
    }

    private static CustomerProfile CreateTestProfile(
        string userId, string firstName, string lastName)
    {
        return new CustomerProfile
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            PhoneNumber = "555-0100",
            CustomerType = "Regular",
            Status = "Active",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            User = new User
            {
                Id = userId,
                Email = $"{firstName.ToLower()}@example.com",
                FirstName = firstName,
                LastName = lastName,
                DisplayName = $"{firstName} {lastName}",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            }
        };
    }
}
