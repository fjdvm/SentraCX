# C4 Level 2: Container Diagram

This diagram shows the high-level architecture of SentraCX's three independently deployable applications, their polyglot datastores, and inter-service communications over REST and WebSockets.

```mermaid
graph TB
    subgraph Clients ["Clients & External Systems"]
        Browser["Support Agent Browser<br/><i>[Next.js Client]</i>"]
        ShopApp["br-online-shop Web<br/><i>[React App]</i>"]
        OIDCProvider["internal-auth-service<br/><i>[OpenIddict OIDC]</i>"]
        Groq["Groq API<br/><i>[External LLM Service]</i>"]
    end

    subgraph SentraCXBoundary ["SentraCX Applications"]
        WebApp["Web App (apps/web-crm)<br/><i>[Next.js 16 / React 19]</i><br/>Frontend user interface, server-side API proxying, NextAuth OIDC integration."]
        
        CRMService["CRM API (apps/api-crm)<br/><i>[.NET 10 / C#]</i><br/>System of record: profiles, tickets, campaigns, SignalR real-time chat."]
        
        AIService["AI-Analytics API (apps/api-ai-analytics)<br/><i>[Python 3.12 / FastAPI]</i><br/>Predictive analytics: churn risk, CLV, sentiment, workload forecasting, ask AI."]
    end

    subgraph Datastores ["Polyglot Datastores"]
        Postgres[("PostgreSQL 16<br/><i>[Primary Relational DB]</i><br/>EF Core store for customer profiles, tickets, campaigns, webhooks log.")]
        MongoDB[("MongoDB 7<br/><i>[Document Store]</i><br/>Analytics metrics, conversation history, churn scores, anomaly logs.")]
        RedisCache[("Redis 7<br/><i>[In-Memory Cache & Lock]</i><br/>Forecast cache, rate limiting, session transient state.")]
    end

    %% Client / App Connections
    Browser -->|"HTTPS / REST"| WebApp
    Browser -->|"WSS / SignalR ChatHub"| CRMService
    ShopApp -->|"WSS / SignalR ChatHub"| CRMService
    ShopApp -->|"HTTPS Webhooks (/api/v1/webhooks/*)"| CRMService

    %% WebApp Connections
    WebApp -->|"HTTPS / REST (port 5000 / 4000)"| CRMService
    WebApp -->|"HTTPS / REST (port 4005)"| AIService
    WebApp -->|"OIDC PKCE Flow"| OIDCProvider

    %% Backend Datastore Connections
    CRMService -->|"EF Core / Npgsql TCP:5432"| Postgres
    AIService -->|"Motor Async TCP:27017"| MongoDB
    AIService -->|"redis-py TCP:6379"| RedisCache

    %% Cross-Service Rest & External API
    AIService -->|"HTTPS REST (Reads CRM data)"| CRMService
    AIService -->|"HTTPS / REST (Llama 3.1)"| Groq
```

## Technology Stack & Isolation Rules
- **No Shared Databases**: `api-crm` interacts exclusively with **PostgreSQL**. `api-ai-analytics` interacts exclusively with **MongoDB** and **Redis**.
- **REST Communication Only**: `api-ai-analytics` consumes `api-crm` data via REST HTTP APIs. They do not share code or direct DB access.
- **WebSockets / SignalR**: Live support chat connects both internal staff and online shop customers directly to `api-crm`'s SignalR ChatHub.
