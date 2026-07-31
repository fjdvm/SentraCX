using Crm.Api.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Crm.Api.Controllers;

[ApiController]
[Route("api/v1/upload")]
[Authorize]
public class UploadController(IFileStorageService fileStorageService) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Upload(IFormFile file, [FromQuery] string folder = "general")
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest(new { message = "No file uploaded or file is empty." });
        }

        var url = await fileStorageService.UploadAsync(file, folder);
        return Ok(new { url });
    }
}
