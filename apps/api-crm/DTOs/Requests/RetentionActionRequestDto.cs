namespace Crm.Api.DTOs.Requests;

public record RetentionActionRequestDto(
    string RiskLevel,
    string RecommendedAction,
    double ChurnScore
);
