# C4 Level 3: Component Diagram - Web CRM Application (`apps/web-crm`)

This diagram details the frontend application architecture of **Web CRM** (`apps/web-crm`), built with Next.js 16 App Router, React 19, Tailwind CSS v4, and shadcn/ui.

```mermaid
graph TB
    subgraph BrowserClient ["User Browser"]
        User["Support Agent / Manager"]
    end

    subgraph WebCRMApp ["apps/web-crm (Next.js 16 / React 19)"]
        subgraph AuthLayer ["Authentication & Session"]
            NextAuth["NextAuth.js v5 (auth.ts)<br/><i>[OIDC Client & Session Provider]</i>"]
        end

        subgraph AppRouter ["App Router Layouts & Pages (src/app/)"]
            DashboardPage["/dashboard<br/><i>[Page Component]</i>"]
            CustomersPage["/customers<br/><i>[Page Component]</i>"]
            TicketsPage["/tickets<br/><i>[Page Component]</i>"]
            CampaignsPage["/campaigns<br/><i>[Page Component]</i>"]
        end

        subgraph FeatureComponents ["Feature UI Components (src/components/features/)"]
            DashboardUI["Dashboard.tsx<br/><i>[Predictive Intelligence, KPI Row, Status Strip]</i>"]
            ForecastCharts["Forecast Charts<br/><i>[TicketVolumeForecastChart, RevenueBySegmentChart, SentimentTrendChart, ChurnDistributionChart]</i>"]
            AttentionFeed["attention-feed.tsx<br/><i>[Things That Need Attention]</i>"]
            AtRiskList["AtRiskWatchlist.tsx<br/><i>[At-Risk Accounts Watchlist]</i>"]
            AskAIPanel["ask-sentracx-panel.tsx<br/><i>[Ask SentrAI Floating Assistant]</i>"]
            TicketChatUI["Tickets & Chat UI<br/><i>[TicketList, TicketDetail, LiveChatWindow]</i>"]
        end

        subgraph CustomHooks ["State & Data Fetching Hooks (src/hooks/)"]
            UseDashboardForecasts["useDashboardForecasts.ts<br/><i>[Hook]</i>"]
            UseDashboardSummary["useDashboardSummary.ts<br/><i>[Hook]</i>"]
            UseTickets["useTickets.ts / useChat.ts<br/><i>[Hook]</i>"]
        end

        subgraph APIClients ["API Infrastructure (src/lib/api/)"]
            CRMClient["crm-client.ts<br/><i>[HTTP REST Client for api-crm]</i>"]
            AIClient["ai-client.ts<br/><i>[HTTP REST Client for api-ai-analytics]</i>"]
            SignalRConnection["SignalR Chat Hub Connection Manager"]
        end
    end

    subgraph BackendServices ["Backend Services"]
        CRMService["apps/api-crm (.NET 10)<br/><i>[REST API & SignalR ChatHub]</i>"]
        AIService["apps/api-ai-analytics (FastAPI)<br/><i>[REST Analytics API]</i>"]
        AuthService["internal-auth-service<br/><i>[OpenIddict OIDC Provider]</i>"]
    end

    %% User Interaction
    User -->|"Interacts with UI"| AppRouter
    AppRouter --> AuthLayer
    AuthLayer -->|"OIDC PKCE Redirect / Token Swap"| AuthService

    %% Pages -> Components
    DashboardPage --> DashboardUI
    DashboardUI --> ForecastCharts & AttentionFeed & AtRiskList & AskAIPanel
    TicketsPage --> TicketChatUI

    %% Components -> Hooks
    ForecastCharts --> UseDashboardForecasts
    DashboardUI --> UseDashboardSummary
    TicketChatUI --> UseTickets

    %% Hooks -> API Clients
    UseDashboardForecasts & AskAIPanel & AttentionFeed & AtRiskList --> AIClient
    UseDashboardSummary & UseTickets --> CRMClient
    TicketChatUI --> SignalRConnection

    %% API Clients -> Backend
    CRMClient -->|"HTTPS REST (Port 5000)"| CRMService
    SignalRConnection -->|"WSS SignalR ChatHub (Port 5000)"| CRMService
    AIClient -->|"HTTPS REST (Port 4005)"| AIService
```

## UI & Component Design Rules
- **shadcn/ui & Tailwind v4**: All UI controls use shadcn/ui components (`new-york`, `neutral`) styled with Tailwind CSS v4 and OKLCH color variables defined in `globals.css`.
- **Lucide Icons**: `lucide-react` is the single authorized icon library across all web components.
- **Strict Component Layering**: Pages render feature containers (`src/components/features/*`), which consume custom hooks (`src/hooks/*`) backed by strongly-typed API wrappers (`crmClient` and `aiClient`).
