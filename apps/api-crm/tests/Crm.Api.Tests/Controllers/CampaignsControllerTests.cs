using Crm.Api.Controllers;
using Crm.Api.DTOs.Requests;
using Crm.Api.DTOs.Responses;
using Crm.Api.Interfaces.Services;
using Microsoft.AspNetCore.Mvc;
using Moq;

namespace Crm.Api.Tests.Controllers;

public class CampaignsControllerTests
{
    private readonly Mock<ICampaignService> _campaignServiceMock = new();
    private readonly CampaignsController _sut;

    public CampaignsControllerTests()
    {
        _sut = new CampaignsController(_campaignServiceMock.Object);
    }

    [Fact]
    public async Task GetAll_ReturnsOkResultWithCampaigns()
    {
        var campaigns = new List<CampaignListResponseDto>
        {
            new() { Id = Guid.NewGuid(), Title = "Campaign 1", Status = "Active" }
        };

        _campaignServiceMock.Setup(s => s.GetAllAsync("Active")).ReturnsAsync(campaigns);

        var result = await _sut.GetAll("Active");

        var okResult = Assert.IsType<OkObjectResult>(result);
        var returned = Assert.IsAssignableFrom<IEnumerable<CampaignListResponseDto>>(okResult.Value);
        Assert.Single(returned);
    }

    [Fact]
    public async Task Create_ReturnsCreatedAtActionResult()
    {
        var dto = new CreateCampaignRequestDto { Title = "Test Campaign" };
        var response = new CampaignResponseDto { Id = Guid.NewGuid(), Title = "Test Campaign" };

        _campaignServiceMock.Setup(s => s.CreateAsync(dto, "usr-staff-default")).ReturnsAsync(response);

        var result = await _sut.Create(dto, "usr-staff-default");

        var createdResult = Assert.IsType<CreatedAtActionResult>(result);
        Assert.Equal(response, createdResult.Value);
    }

    [Fact]
    public async Task Send_WhenCampaignNotFound_ReturnsNotFound()
    {
        var id = Guid.NewGuid();
        _campaignServiceMock.Setup(s => s.GetByIdAsync(id)).ReturnsAsync((CampaignResponseDto?)null);
        var dispatchMock = new Mock<ICampaignDispatchService>();

        var result = await _sut.Send(id, dispatchMock.Object);

        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task Send_WhenNoEmailChannel_ReturnsBadRequest()
    {
        var id = Guid.NewGuid();
        var campaign = new CampaignResponseDto { Id = id, Channels = ["InApp"] };
        _campaignServiceMock.Setup(s => s.GetByIdAsync(id)).ReturnsAsync(campaign);
        var dispatchMock = new Mock<ICampaignDispatchService>();

        var result = await _sut.Send(id, dispatchMock.Object);

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task Send_WhenEmailChannelPresent_ReturnsOkWithResult()
    {
        var id = Guid.NewGuid();
        var campaign = new CampaignResponseDto { Id = id, Channels = ["Email", "InApp"] };
        _campaignServiceMock.Setup(s => s.GetByIdAsync(id)).ReturnsAsync(campaign);

        var dispatchMock = new Mock<ICampaignDispatchService>();
        var expectedResult = new CampaignDispatchResultDto
        {
            TotalRecipients = 5,
            SentCount = 5,
            FailedCount = 0,
            Message = "Campaign successfully dispatched to 5 recipient(s)."
        };
        dispatchMock.Setup(d => d.DispatchAsync(id)).ReturnsAsync(expectedResult);

        var result = await _sut.Send(id, dispatchMock.Object);

        var okResult = Assert.IsType<OkObjectResult>(result);
        var returned = Assert.IsType<CampaignDispatchResultDto>(okResult.Value);
        Assert.Equal(5, returned.SentCount);
        Assert.Equal(5, returned.TotalRecipients);
    }
}
