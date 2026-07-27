# Technology Interaction & Data Flow Diagrams

This document details sequence flows showing how technologies across **SentraCX** (`apps/web-crm`, `apps/api-crm`, `apps/api-ai-analytics`) and sibling systems (`br-online-shop`, `internal-auth-service`) interact during key operations.

---

## 1. Real-Time Support Chat Interaction Flow

Sequence of real-time support chat between an online shop customer, `api-crm`'s SignalR ChatHub, and a CRM support agent on `web-crm`.

```mermaid
sequenceDiagram
    autonumber
    actor Customer as Shop Customer
    participant ShopWeb as br-online-shop Web
    participant Hub as api-crm SignalR ChatHub
    participant CRMDB as PostgreSQL DB
    participant AgentWeb as web-crm (Agent UI)
    actor Agent as Support Agent

    Customer->>ShopWeb: Click "Start Live Chat"
    ShopWeb->>Hub: Connect WebSocket (/hubs/chat)
    Hub->>CRMDB: Create/Retrieve Chat Session & Ticket
    Hub-->>ShopWeb: Connection Established (SessionId)

    Customer->>ShopWeb: Type message "Need help with order"
    ShopWeb->>Hub: SendMessage(sessionId, text)
    Hub->>CRMDB: Persist Message to Tickets/Messages Table
    Hub-->>AgentWeb: Broadcast NewChatMessage Event

    AgentWeb-->>Agent: Display Incoming Chat Notification & Message
    Agent->>AgentWeb: Type response "Happy to help!"
    AgentWeb->>Hub: SendAgentMessage(sessionId, text)
    Hub->>CRMDB: Persist Agent Response
    Hub-->>ShopWeb: Broadcast ReceiveMessage Event
    ShopWeb-->>Customer: Render Agent Reply in Chat Box
```

---

## 2. Ecommerce Webhook & AI Analytics Sync Flow

Sequence showing how customer signups and orders from `br-online-shop` trigger webhooks, updating CRM data and feeding the AI-Analytics engine.

```mermaid
sequenceDiagram
    autonumber
    participant OOS as br-online-shop (api-oos)
    participant CRM as api-crm (.NET 10)
    participant Postgres as PostgreSQL
    participant AI as api-ai-analytics (FastAPI)
    participant Mongo as MongoDB

    OOS->>CRM: POST /api/v1/webhooks/customer-signup (Signed HMAC Payload)
    CRM->>CRM: Verify Webhook Signature & Deduplicate
    CRM->>Postgres: Upsert Customer Record
    CRM-->>OOS: 200 OK (Event Received)

    OOS->>CRM: POST /api/v1/webhooks/order-completed (Order Details)
    CRM->>Postgres: Record Order & Ticket Activity

    Note over AI,CRM: Scheduled Sync or Real-Time Request
    AI->>CRM: GET /api/v1/customers?updated_since=...
    CRM-->>AI: Return Customer JSON Payload
    AI->>AI: Run Churn Risk & CLV Model
    AI->>Mongo: Store ChurnScore & Analytics Metrics
```

---

## 3. Predictive Intelligence & Ask SentrAI Query Flow

Sequence illustrating dashboard predictive chart loading and the Ask SentrAI natural language query workflow with LLM fallback.

```mermaid
sequenceDiagram
    autonumber
    actor Agent as CRM User
    participant Web as web-crm (Next.js)
    participant AI as api-ai-analytics (FastAPI)
    participant Redis as Redis Cache
    participant Groq as Groq API (Llama 3.1)
    participant Fallback as Heuristic Engine

    Agent->>Web: Select "Workload Forecast" (7 Days)
    Web->>AI: GET /api/v1/forecasts/ticket-volume?range=7d
    AI->>Redis: Check Forecast Cache (Key: forecast:7d)
    
    alt Cache Hit
        Redis-->>AI: Return Cached JSON
    else Cache Miss
        AI->>AI: Compute Holt-Winters / Prophesy Model
        AI->>Redis: SETEX forecast:7d (TTL 300s)
    end
    AI-->>Web: TicketVolumeForecastResponse JSON
    Web-->>Agent: Render Interactive Recharts Area Graph

    %% Ask AI Query
    Agent->>Web: Ask "Which customers might leave soon?"
    Web->>AI: POST /api/v1/dashboard/ask { query: "..." }
    
    alt Groq API Available
        AI->>Groq: Generate SQL/Mongo query & response
        Groq-->>AI: Return LLM Completion
    else Groq API Timeout / Rate Limit
        AI->>Fallback: Execute rule-based query parser
        Fallback-->>AI: Return Structured Heuristic Result
    end
    AI-->>Web: { type: "chart", content: {...} }
    Web-->>Agent: Render AI Answer & Customer List Card
```

---

## 4. Employee OIDC Authentication Flow

Sequence showing employee authentication via `internal-auth-service` (OpenIddict) using PKCE flow.

```mermaid
sequenceDiagram
    autonumber
    actor Agent as CRM Employee
    participant Web as web-crm (NextAuth.js)
    participant AuthSvc as internal-auth-service (OpenIddict)
    participant CRM as api-crm (.NET 10)

    Agent->>Web: Access /dashboard
    Web->>Web: Check Session (Unauthenticated)
    Web-->>Agent: Redirect to /api/auth/signin
    Web->>AuthSvc: Authorize Request (client_id=crms-client, PKCE challenge)
    
    Agent->>AuthSvc: Enter Employee Credentials
    AuthSvc-->>Web: Redirect to Callback with Auth Code
    Web->>AuthSvc: POST /connect/token (Auth Code + Code Verifier)
    AuthSvc-->>Web: Return ID Token & JWT Access Token

    Web->>CRM: GET /api/v1/customers (Authorization: Bearer <JWT>)
    CRM->>CRM: Validate JWT Signature against internal-auth-service JWKS
    CRM-->>Web: 200 OK (Customer Data)
    Web-->>Agent: Render Dashboard
```
