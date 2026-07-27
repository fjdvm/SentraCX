# C4 Level 3: Component Diagram - CRM Core Service (`apps/api-crm`)

This diagram details the internal software architecture of **CRM Core Service** (`apps/api-crm`), illustrating Controller → Service → Repository layering rules in .NET 10.

```mermaid
graph TB
    subgraph ExternalRequests ["Incoming Requests"]
        WebCRM["Web CRM / Shop Webhooks<br/><i>[HTTP / REST]</i>"]
        SignalRClient["Browser / Shop Chat Client<br/><i>[WebSockets / SignalR]</i>"]
        AIAnalytics["AI-Analytics Service<br/><i>[HTTP REST Queries]</i>"]
    end

    subgraph APICRM ["apps/api-crm (.NET 10)"]
        subgraph MiddlewareLayer ["Security & Routing"]
            AuthMiddleware["OIDC JWT Bearer Authentication<br/><i>[ASP.NET Core Middleware]</i>"]
            CorsPolicy["CORS Policy<br/><i>[Middleware]</i>"]
        end

        subgraph HubLayer ["Real-Time Communication"]
            ChatHub["ChatHub<br/><i>[SignalR Hub]</i><br/>Manages active support chat connections, message broadcasts, agent assignment."]
        end

        subgraph ControllerLayer ["API Controllers"]
            CustomerCtrl["CustomersController<br/><i>[REST Controller]</i>"]
            TicketCtrl["TicketsController<br/><i>[REST Controller]</i>"]
            CampaignCtrl["CampaignsController<br/><i>[REST Controller]</i>"]
            WebhookCtrl["WebhooksController<br/><i>[REST Controller]</i>"]
        end

        subgraph ServiceLayer ["Business Logic Services"]
            CustomerSvc["CustomerService<br/><i>[Service]</i>"]
            TicketSvc["TicketService<br/><i>[Service]</i>"]
            CampaignSvc["CampaignService<br/><i>[Service]</i>"]
            WebhookSvc["WebhookProcessingService<br/><i>[Service]</i>"]
            ChatSvc["ChatManagementService<br/><i>[Service]</i>"]
        end

        subgraph RepositoryLayer ["Data Access Repositories"]
            CustomerRepo["CustomerRepository<br/><i>[Repository]</i>"]
            TicketRepo["TicketRepository<br/><i>[Repository]</i>"]
            CampaignRepo["CampaignRepository<br/><i>[Repository]</i>"]
            DbContext["ApplicationDbContext<br/><i>[EF Core DbContext]</i>"]
        end
    end

    subgraph Datastores ["Database"]
        Postgres[("PostgreSQL Database<br/><i>[Tables: Customers, Tickets, Messages, Campaigns, WebhooksLog]</i>")]
    end

    %% Requests routing
    WebCRM --> AuthMiddleware
    AIAnalytics --> AuthMiddleware
    SignalRClient --> CorsPolicy --> ChatHub

    AuthMiddleware --> CustomerCtrl
    AuthMiddleware --> TicketCtrl
    AuthMiddleware --> CampaignCtrl
    AuthMiddleware --> WebhookCtrl

    %% Controller -> Service
    CustomerCtrl --> CustomerSvc
    TicketCtrl --> TicketSvc
    CampaignCtrl --> CampaignSvc
    WebhookCtrl --> WebhookSvc
    ChatHub --> ChatSvc

    %% Service -> Repository
    CustomerSvc --> CustomerRepo
    TicketSvc --> TicketRepo
    CampaignSvc --> CampaignRepo
    WebhookSvc --> CustomerRepo & TicketRepo
    ChatSvc --> TicketRepo

    %% Repository -> DbContext -> Postgres
    CustomerRepo --> DbContext
    TicketRepo --> DbContext
    CampaignRepo --> DbContext
    DbContext --> Postgres
```

## Layering Rules Enforced
1. **Controller → Service → Repository**: Controllers delegate all business logic to Services. Repositories handle data persistence using Entity Framework Core.
2. **SignalR ChatHub**: SignalR hub routes live chat messages to `ChatManagementService` and persists conversation threads to PostgreSQL.
3. **Webhooks Endpoint**: `/api/v1/webhooks/*` receives signed JSON payloads from `br-online-shop`, logging events and upserting customer/ticket entities.
