# C4 Level 1: System Context Diagram

This diagram illustrates the high-level boundary of the **SentraCX** Customer Experience & Relationship Management System, identifying external actors, sibling systems, and third-party APIs with which SentraCX interacts.

```mermaid
graph TB
    subgraph Users ["Users & Actors"]
        Agent["Support Agent / CRM Staff<br/><i>[Person]</i><br/>Manages tickets, chats with customers, views predictive insights."]
        Customer["Online Shop Customer<br/><i>[Person]</i><br/>Browses ecommerce store, submits tickets, initiates live support chat."]
    end

    subgraph SentraCXSystem ["SentraCX Platform (System Boundary)"]
        SentraCX["SentraCX CX & CRM Platform<br/><i>[Software System]</i><br/>System of record for customer profiles, tickets, real-time support chat, and AI predictive analytics."]
    end

    subgraph ExternalSystems ["External & Sibling Systems"]
        Shop["br-online-shop<br/><i>[Software System]</i><br/>Ecommerce platform handling online store orders, signups, and customer-facing web app."]
        AuthService["internal-auth-service<br/><i>[Software System]</i><br/>Central OpenIddict OIDC provider for identity management."]
        GroqAPI["Groq Cloud API<br/><i>[External API]</i><br/>Provides Llama 3.1 LLM inference for natural language queries and text generation."]
    end

    %% Interactions
    Agent -->|"Uses web app over HTTPS<br/>(OIDC Authenticated)"| SentraCX
    Customer -->|"Uses store web interface"| Shop
    Customer -->|"Connects to real-time chat"| SentraCX
    
    Shop -->|"Dispatches Webhooks<br/>(Signups, Orders, Tickets)"| SentraCX
    SentraCX -->|"Authenticates employee logins"| AuthService
    SentraCX -->|"Invokes LLM queries & fallback"| GroqAPI
```

## Key Interactions Summary
- **Support Staff / CRM Agents**: Authenticate via `internal-auth-service` and interact with the `web-crm` portal.
- **Online Shop Customers**: Interact with `br-online-shop` web app and initiate live support chat connecting directly to `SentraCX`.
- **br-online-shop**: Dispatches real-time HTTPS webhooks for signups, order placements, and customer ticket sync.
- **Groq Cloud API**: Provides fast Llama-3.1 inference for natural language query generation with local heuristic fallbacks.
