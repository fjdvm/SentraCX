using Crm.Api.BackgroundJobs;
using Crm.Api.Configurations;
using Crm.Api.Data;
using Crm.Api.Helpers;
using Crm.Api.Hubs;
using Crm.Api.Interfaces;
using Crm.Api.Interfaces.Repositories;
using Crm.Api.Interfaces.Services;
using Crm.Api.Middleware;
using Crm.Api.Repositories;
using Crm.Api.Services;
using Crm.Api.Extensions;
using FluentValidation;
using StackExchange.Redis;
using FluentValidation.AspNetCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Scalar.AspNetCore;

EnvLoader.Load();

var builder = WebApplication.CreateBuilder(args);

var dbHost = Environment.GetEnvironmentVariable("DATABASE_HOST") ?? "localhost";
var dbPort = Environment.GetEnvironmentVariable("DATABASE_PORT") ?? "5432";
var dbName = Environment.GetEnvironmentVariable("DATABASE_NAME") ?? "sentracx_crm";
var dbUser = Environment.GetEnvironmentVariable("DATABASE_USER") ?? "postgres";
var dbPassword = Environment.GetEnvironmentVariable("DATABASE_PASSWORD") ?? "postgres";
var connectionString =
    $"Host={dbHost};Port={dbPort};Database={dbName};Username={dbUser};Password={dbPassword}";

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString));

var jwtAuthority = Environment.GetEnvironmentVariable("JWT_AUTHORITY") ?? "https://localhost:5001";
var jwtAudience  = Environment.GetEnvironmentVariable("JWT_AUDIENCE")  ?? "sentracx-crm-api";

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.Authority = jwtAuthority;
        options.Audience  = jwtAudience;
        options.RequireHttpsMetadata = !builder.Environment.IsDevelopment();
        options.TokenValidationParameters.ValidateAudience = false;
    });

builder.Services.AddAuthorization();

// SignalR + Redis backplane
var redisHost = Environment.GetEnvironmentVariable("REDIS_HOST") ?? "localhost";
var redisPort = Environment.GetEnvironmentVariable("REDIS_PORT") ?? "6379";

var redisConnection = ConnectionMultiplexer.Connect($"{redisHost}:{redisPort}");
builder.Services.AddSingleton<IConnectionMultiplexer>(redisConnection);

builder.Services.AddSignalR()
    .AddStackExchangeRedis($"{redisHost}:{redisPort}");

// File storage provider
var storageProvider = Environment.GetEnvironmentVariable("FILE_STORAGE_PROVIDER") ?? "Local";
if (storageProvider.Equals("S3", StringComparison.OrdinalIgnoreCase))
{
    builder.Services.AddScoped<IFileStorageService, AwsS3FileStorageService>();
}
else
{
    builder.Services.AddScoped<IFileStorageService, LocalFileStorageService>();
}

// Repositories
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<ICustomerProfileRepository, CustomerProfileRepository>();
builder.Services.AddScoped<IOrderHistoryRepository, OrderHistoryRepository>();
builder.Services.AddScoped<IMarketingInteractionRepository, MarketingInteractionRepository>();
builder.Services.AddScoped<ITicketRepository, TicketRepository>();
builder.Services.AddScoped<IMessageRepository, MessageRepository>();
builder.Services.AddScoped<ICampaignRepository, CampaignRepository>();
builder.Services.AddScoped<ITemplateRepository, TemplateRepository>();
builder.Services.AddScoped<IPromotionRepository, PromotionRepository>();
builder.Services.AddScoped<IAnalyticsRepository, AnalyticsRepository>();

// Services
builder.Services.AddScoped<ICustomerService, CustomerService>();
builder.Services.AddScoped<IOrderService, OrderService>();
builder.Services.AddScoped<IMarketingInteractionService, MarketingInteractionService>();
builder.Services.AddScoped<ITicketService, TicketService>();
builder.Services.AddScoped<IMessageService, MessageService>();
builder.Services.AddScoped<ICampaignService, CampaignService>();
builder.Services.AddScoped<ITemplateService, TemplateService>();
builder.Services.AddScoped<IPromotionService, PromotionService>();
builder.Services.AddScoped<IDashboardBroadcastService, DashboardBroadcastService>();
builder.Services.AddScoped<IAnalyticsService, AnalyticsService>();

// Email & Campaign Dispatch Services
builder.Services.Configure<SmtpOptions>(opts =>
{
    opts.Host = Environment.GetEnvironmentVariable("SMTP_HOST") ?? "";
    opts.Port = int.TryParse(Environment.GetEnvironmentVariable("SMTP_PORT"), out var p) ? p : 587;
    opts.Username = Environment.GetEnvironmentVariable("SMTP_USERNAME") ?? "";
    opts.Password = Environment.GetEnvironmentVariable("SMTP_PASSWORD") ?? "";
    opts.From = Environment.GetEnvironmentVariable("SMTP_FROM") ?? "";
});
builder.Services.AddScoped<IEmailService, SmtpEmailService>();
builder.Services.AddScoped<ICampaignDispatchService, CampaignDispatchService>();

// AI Analytics Client
var aiAnalyticsUrl = Environment.GetEnvironmentVariable("AI_ANALYTICS_API_URL") ?? "http://localhost:4005";
builder.Services.AddAiAnalyticsClient(aiAnalyticsUrl);

// Background Jobs
builder.Services.AddHostedService<CampaignStatusJob>();
builder.Services.AddHostedService<PromotionStatusJob>();

builder.Services.AddFluentValidationAutoValidation();
builder.Services.AddValidatorsFromAssemblyContaining<Program>();

var corsOrigins = (Environment.GetEnvironmentVariable("CORS_ORIGINS") ?? "https://localhost:3005,https://localhost:3012")
    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(corsOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

builder.Services.AddControllers();
builder.Services.AddOpenApi();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    using var scope = app.Services.CreateScope();
    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    dbContext.Database.Migrate();
}

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference("/docs", options =>
    {
        options
            .WithTitle("SentraCX - CRM API")
            .WithTheme(ScalarTheme.BluePlanet)
            .WithDefaultHttpClient(ScalarTarget.JavaScript, ScalarClient.Fetch);
    });
}

app.UseCors();

// Global exception handling middleware — runs inside the CORS pipeline so
// error responses still carry Access-Control-Allow-Origin headers.
app.Use(async (context, next) =>
{
    try
    {
        await next(context);
    }
    catch (Exception ex)
    {
        if (!context.Response.HasStarted)
        {
            context.Response.StatusCode = 500;
            context.Response.ContentType = "application/json";
            var message = app.Environment.IsDevelopment()
                ? ex.ToString().Replace("\"", "'")
                : "An unexpected error occurred.";
            await context.Response.WriteAsync($"{{\"error\":\"{message}\"}}");
        }
    }
});

app.UseHttpsRedirection();
app.UseStaticFiles();
app.UseAuthentication();
app.UseMiddleware<JitProvisioningMiddleware>();
app.UseAuthorization();
app.MapControllers();
app.MapHub<ChatHub>("/hubs/chat");
app.MapHub<DashboardHub>("/hubs/dashboard");

app.Run();

public partial class Program { }
