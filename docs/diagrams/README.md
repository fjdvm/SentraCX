# SentraCX Architecture & C4 Diagrams

This directory contains comprehensive C4 Model architecture diagrams and technology interaction sequence flows for the SentraCX platform.

## Diagram Directory

| Diagram | Description | Link |
|---|---|---|
| **C4 Level 1: System Context** | High-level system boundary, external actors, sibling systems (`br-online-shop`, `internal-auth-service`), and Groq LLM API. | [c4-context.md](c4-context.md) |
| **C4 Level 2: Container Architecture** | Application containers (`web-crm`, `api-crm`, `api-ai-analytics`), polyglot persistence (PostgreSQL, MongoDB, Redis), and inter-service REST/SignalR protocols. | [c4-container.md](c4-container.md) |
| **C4 Level 3: CRM Core Service** | Internal architecture of `apps/api-crm` (.NET 10), Controller → Service → Repository layering, SignalR ChatHub, and webhooks processing. | [c4-component-crm.md](c4-component-crm.md) |
| **C4 Level 3: AI-Analytics Service** | Internal architecture of `apps/api-ai-analytics` (Python/FastAPI), prediction engines (churn, CLV, sentiment, forecast, anomalies), and Groq LLM fallback logic. | [c4-component-ai-analytics.md](c4-component-ai-analytics.md) |
| **C4 Level 3: Web CRM Application** | Frontend architecture of `apps/web-crm` (Next.js 16 / React 19), App Router pages, feature UI components, custom hooks, and API clients. | [c4-component-web.md](c4-component-web.md) |
| **Technology Interaction & Sequence Flows** | Real-time SignalR support chat, ecommerce webhooks sync, Ask SentrAI query flow, and OIDC PKCE authentication flow. | [technology-interaction-flow.md](technology-interaction-flow.md) |
