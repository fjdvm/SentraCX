namespace Crm.Api.DTOs.Requests;

public class CustomerWebhookRequestDto
{
    public string Email { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }
    public string? Address { get; set; }
    public string? ExternalUserId { get; set; }
}
