# Epic 8: Dashboard, Forecasting & Real-Time Analytics

## Overview

Epic 8 extends the existing dashboard from a static, hardcoded display into a live, data-driven
analytics hub. The work spans three services:

- **`api-ai-analytics`** — new forecasting endpoints + extended KPI summary + anomaly improvements
- **`api-crm`** — new `DashboardHub` (SignalR) that broadcasts live metric updates on domain events
- **`web-crm`** — replace static/hardcoded dashboard UI with real API data, live charts, and
  SignalR-driven real-time indicators

The implementation is broken into **four sub-epics** that map 1-to-1 with backlog items 8.1, 8.2–8.5,
8.7–8.8, and 8.11.

---

## Current State

| Area | What exists today |
|---|---|
| Dashboard page | Static hardcoded data in `Dashboard.tsx` / `DashboardChart.tsx` / `DashboardMetricCards.tsx` |
| KPI summary API | `GET /api/ai/dashboard/summary` exists but only returns `churn_rate`, `avg_sentiment`, `total_tickets`, `resolved_tickets`, `active_campaigns` |
| Anomaly API | `GET /api/ai/anomalies` exists (basic) — missing severity filter, acknowledge action, toast trigger |
| Natural language query | `POST /api/ai/query` exists and frontend has the input box |
| SignalR | `ChatHub.cs` exists for ticket chat only — no dashboard hub |
| Forecasting | None — 8.2, 8.3, 8.4, 8.5 are all unimplemented |
| At-risk watchlist | None — 8.7 is unimplemented |
| Real-time dashboard | None — 8.11 is unimplemented |

---

## Proposed Changes

### Sub-Epic A — 8.1: KPI Metric Cards (real data)

#### `api-ai-analytics`

##### [MODIFY] dashboard_schemas.py
- [x] Add `MetricWithDelta` model: `{ value, delta_vs_previous_period, delta_pct }`
- [x] Extend `DashboardSummaryResponse` with:
  - [x] `active_tickets: MetricWithDelta`
  - [x] `avg_resolution_hours: MetricWithDelta`
  - [x] `churn_rate: MetricWithDelta`
  - [x] `avg_clv: MetricWithDelta`
  - [x] `avg_sentiment: MetricWithDelta`
  - [x] `active_campaigns: MetricWithDelta`

##### [MODIFY] dashboard_service.py
- [x] Extend `get_summary()` to compute deltas vs. equal-length previous period
- [x] Pull `active_tickets` from CRM via `crm_client.py` (new `get_active_ticket_count()` method)
- [x] Compute `avg_resolution_hours` from `ConversationTranscripts`
- [x] Compute `avg_clv` from `customer_feature_logs`
- [x] Pull `active_campaigns` from CRM via `crm_client.py` (new `get_active_campaign_count()`)

##### [MODIFY] dashboard.py (route)
- [x] No new routes — response contract is extended in place

#### `web-crm`

##### [NEW] `src/hooks/useDashboardSummary.ts`
- [x] Fetches `/api/ai/dashboard/summary?from=&to=`
- [x] Returns `{ data, isLoading, error }`

##### [MODIFY] DashboardMetricCards.tsx
- [x] Accept API data props instead of hardcoded values
- [x] Render 6 cards: Active Tickets, Avg Resolution Time, Churn Rate, Avg CLV, Customer Sentiment, Active Campaigns
- [x] Each card: value + trend arrow (↑↓) + delta vs. previous period + skeleton loading state

##### [MODIFY] Dashboard.tsx
- [x] Wire `useDashboardSummary` hook
- [x] Pass live data to `DashboardMetricCards`
- [x] Add functional date range picker (replace hardcoded date label)

---

### Sub-Epic B — 8.2–8.5: Forecasting Charts

#### `api-ai-analytics`

##### [NEW] `app/api/v1/routes/forecasts.py`
Four GET endpoints:
- [x] `GET /api/ai/forecasts/ticket-volume?range=7d|14d|30d`
  → `{ historical_series[], forecast_series[], confidence_band_upper[], confidence_band_lower[], threshold, alert_triggered }`
- [x] `GET /api/ai/forecasts/revenue?range=30d|90d|12m`
  → `{ forecast_series[], by_segment{}, total_projected, confidence }`
- [x] `GET /api/ai/forecasts/churn-distribution`
  → `{ low, medium, high, critical, trend_series[] }`
- [x] `GET /api/ai/forecasts/sentiment-trend?range=7d|30d|90d`
  → `{ daily_scores[], moving_average[], forecast_next_7d[] }`

##### [NEW] `app/schemas/forecast_schemas.py`
- [x] `TicketVolumeForecastResponse`
- [x] `RevenueForecastResponse`
- [x] `ChurnDistributionResponse`
- [x] `SentimentTrendResponse`

##### [NEW] `app/services/forecast_service.py`
- [x] `get_ticket_volume_forecast(range)` — linear extrapolation from MongoDB `ConversationTranscripts`; numpy for trend fitting; heuristic fallback
- [x] `get_revenue_forecast(range)` — aggregate CLV predictions by segment from `customer_feature_logs`, project forward
- [x] `get_churn_distribution()` — bucket all customers' latest churn scores into Low/Medium/High/Critical; compute weekly trend
- [x] `get_sentiment_trend(range)` — daily average from `ConversationTranscripts`, 7-day rolling avg, simple linear forecast

##### [MODIFY] `app/api/v1/deps.py`
- [x] Add `get_forecast_service()` dependency factory

##### [MODIFY] `app/main.py`
- [x] Register `forecasts.router` under `/api/ai`

#### `web-crm`

##### [NEW] `src/hooks/useDashboardForecasts.ts`
- [x] Named exports: `useTicketVolumeForecast`, `useRevenueForecast`, `useChurnDistribution`, `useSentimentTrend`

##### [NEW] `src/components/features/dashboard/ForecastSection.tsx`
- [x] Renders all four charts in a 2×2 grid layout on `lg` screens

##### [NEW] `src/components/features/dashboard/TicketVolumeForecastChart.tsx`
- [x] Recharts AreaChart: solid historical, dashed forecast, shaded confidence band
- [x] Threshold `<ReferenceLine>` overlay
- [x] Alert banner when `alert_triggered === true`

##### [NEW] `src/components/features/dashboard/RevenueBySegmentChart.tsx`
- [x] Recharts grouped BarChart by segment (High-Value, Regular, New, At-Risk)
- [x] Summary card: "Projected X-day revenue: $Y (±Z%)"

##### [NEW] `src/components/features/dashboard/ChurnDistributionChart.tsx`
- [x] Recharts PieChart donut: Low / Medium / High / Critical
- [x] Clicking a segment navigates to `/customers?churn_risk=<level>`

##### [NEW] `src/components/features/dashboard/SentimentTrendChart.tsx`
- [x] Recharts LineChart: daily score + 7-day moving average + dashed forecast extension
- [x] Alert indicator when trend falls below configurable threshold

---

### Sub-Epic C — 8.7–8.8: At-Risk Watchlist & Anomaly Cards

#### `api-ai-analytics`

##### [NEW] `app/api/v1/routes/watchlist.py`
- [x] `GET /api/ai/dashboard/at-risk-customers?limit=10`
  → `{ customers: [{ customer_id, name, churn_score, risk_level, contributing_factors[], recommended_action }] }`
- [x] `POST /api/ai/anomalies/{id}/acknowledge`
  → `{ anomaly_id, status: "acknowledged" }`

##### [NEW] `app/schemas/watchlist_schemas.py`
- [x] `AtRiskCustomerItem` and `AtRiskCustomerListResponse`

##### [MODIFY] dashboard_service.py
- [x] `get_at_risk_customers(limit)` — query top-N by churn score from `customer_feature_logs`, enrich with NBA recommendation
- [x] `acknowledge_anomaly(anomaly_id)` — update anomaly status in MongoDB to "acknowledged"
- [x] Expand `get_anomalies()` to detect: sentiment drop, churn rate elevation, engagement drop; auto-classify severity as low/medium/high/critical

##### [MODIFY] dashboard_schemas.py
- [x] Add `"critical"` to `AnomalyItem.severity` enum
- [x] Add `"acknowledged"` to `AnomalyItem.status` enum

#### `web-crm`

##### [NEW] `src/components/features/dashboard/AtRiskWatchlist.tsx`
- [x] Card list: customer name, churn score badge, contributing factors, recommended action
- [x] Each row links to `/customers/{id}`
- [x] Quick-action button triggers next-best-action (`POST /api/ai/customers/{id}/next-action`)

##### [MODIFY] DashboardQuickOps.tsx
- [x] Wire anomaly cards to real data (`GET /api/ai/anomalies`) (implemented in DashboardAnomalies)
- [x] Anomaly cards: severity badge + description + detected time + acknowledge button (implemented in DashboardAnomalies)
- [x] Critical-severity anomalies trigger a toast notification (implemented in DashboardAnomalies)

---

### Sub-Epic D — 8.11: Real-Time Live Metrics (SignalR)

> [!IMPORTANT]
> New `DashboardHub.cs` is separate from the existing `ChatHub.cs`. It is a broadcast-only hub
> (clients join a group, server pushes — no complex client-invokable methods).

#### `api-crm`

##### [NEW] `Hubs/DashboardHub.cs`
- [x] `JoinDashboard()` / `LeaveDashboard()` — add/remove from `"dashboard"` group
- [x] `OnConnectedAsync` / `OnDisconnectedAsync` — increment/decrement Redis online-agent counter

##### [NEW] `DTOs/Responses/DashboardMetricsDto.cs`
- [x] `int ActiveTickets`, `int PendingEscalations`, `int UnreadConversations`, `int OnlineAgents`

##### [NEW] `Interfaces/Services/IDashboardBroadcastService.cs`
- [x] `Task BroadcastMetricsAsync()`

##### [NEW] `Services/DashboardBroadcastService.cs`
- [x] Injects `IHubContext<DashboardHub>`, `ITicketRepository`, `IMessageRepository`, Redis `IConnectionMultiplexer`
- [x] Queries live counts and broadcasts `DashboardMetricsUpdated` to the `"dashboard"` group

##### [MODIFY] TicketService.cs
- [x] Inject `IDashboardBroadcastService`
- [x] Fire-and-forget `BroadcastMetricsAsync()` after `CreateAsync`, `ClaimAsync`, `UnclaimAsync`, `UpdateStatusAsync`

##### [MODIFY] MessageService.cs
- [x] Inject `IDashboardBroadcastService`
- [x] Fire-and-forget `BroadcastMetricsAsync()` after new message creation

##### [MODIFY] Program.cs
- [x] Register `IDashboardBroadcastService` as scoped
- [x] `app.MapHub<DashboardHub>("/hubs/dashboard")`

#### `web-crm`

##### [NEW] `src/hooks/useDashboardHub.ts`
- [x] Connects to `/hubs/dashboard` SignalR hub (mirrors `useSignalR.ts` pattern)
- [x] Subscribes to `DashboardMetricsUpdated`
- [x] Returns `{ liveMetrics, isConnected }`

##### [NEW] `src/components/features/dashboard/LiveMetricsBar.tsx`
- [x] Shows: Tickets in Queue, Pending Escalations, Unread Conversations, Online Agents
- [x] Numbers pulse-animate on change
- [x] Green "live" dot indicator

##### [MODIFY] Dashboard.tsx
- [x] Add `<LiveMetricsBar />` below page header
- [x] Integrate `useDashboardHub()`

---

### 8.10 NL Query — Remaining Frontend Items

Backend `POST /api/ai/query` is complete. Frontend has the input box. Remaining work:

##### [MODIFY] DashboardQuickOps.tsx
- [x] Render results as: table (if `rows[]`), line chart (if `series[]`), or single-value card (implemented in DashboardNLQuery)
- [x] Query history stored in `localStorage` (last 10 queries)
- [x] Suggested query chips: "Show me customers at high churn risk", "Ticket volume last 7 days", "Top performing campaign this month"

---

## File Summary

### `api-ai-analytics`

| Action | File |
|---|---|
| MODIFY | `app/schemas/dashboard_schemas.py` |
| MODIFY | `app/services/dashboard_service.py` |
| MODIFY | `app/api/v1/routes/dashboard.py` |
| MODIFY | `app/api/v1/deps.py` |
| MODIFY | `app/main.py` |
| NEW | `app/api/v1/routes/forecasts.py` |
| NEW | `app/api/v1/routes/watchlist.py` |
| NEW | `app/schemas/forecast_schemas.py` |
| NEW | `app/schemas/watchlist_schemas.py` |
| NEW | `app/services/forecast_service.py` |

### `api-crm`

| Action | File |
|---|---|
| NEW | `Hubs/DashboardHub.cs` |
| NEW | `DTOs/Responses/DashboardMetricsDto.cs` |
| NEW | `Interfaces/Services/IDashboardBroadcastService.cs` |
| NEW | `Services/DashboardBroadcastService.cs` |
| MODIFY | `Services/TicketService.cs` |
| MODIFY | `Services/MessageService.cs` |
| MODIFY | `Program.cs` |

### `web-crm`

| Action | File |
|---|---|
| NEW | `src/hooks/useDashboardSummary.ts` |
| NEW | `src/hooks/useDashboardHub.ts` |
| NEW | `src/hooks/useDashboardForecasts.ts` |
| MODIFY | `src/components/features/dashboard/Dashboard.tsx` |
| MODIFY | `src/components/features/dashboard/DashboardMetricCards.tsx` |
| MODIFY | `src/components/features/dashboard/DashboardQuickOps.tsx` |
| NEW | `src/components/features/dashboard/LiveMetricsBar.tsx` |
| NEW | `src/components/features/dashboard/ForecastSection.tsx` |
| NEW | `src/components/features/dashboard/TicketVolumeForecastChart.tsx` |
| NEW | `src/components/features/dashboard/RevenueBySegmentChart.tsx` |
| NEW | `src/components/features/dashboard/ChurnDistributionChart.tsx` |
| NEW | `src/components/features/dashboard/SentimentTrendChart.tsx` |
| NEW | `src/components/features/dashboard/AtRiskWatchlist.tsx` |

---

## Open Questions

> [!IMPORTANT]
> **Q1 — Active ticket count source for KPI cards**: Should `active_tickets` come from `api-crm`
> PostgreSQL (via `crm_client.py` HTTP call) or from MongoDB `ConversationTranscripts` (may lag)?
> **Recommendation**: Call `api-crm` for authoritative counts — `crm_client.py` already exists.

> [!IMPORTANT]
> **Q2 — Forecasting model complexity**: Prophet/ARIMA vs. simple numpy linear regression?
> **Recommendation**: Start with numpy linear regression + heuristic fallback (no new heavy deps).
> Upgrade to Prophet in a later sprint if accuracy is insufficient.

> [!NOTE]
> **Q3 — NL query results rendering**: `result` is a free-form `dict`. Frontend strategy:
> `series[]` → line chart, `rows[]` → table, otherwise → single value card. No API change needed.

> [!NOTE]
> **Q4 — `online_agents` for LiveMetricsBar**: Requires Redis counter incremented in
> `DashboardHub.OnConnectedAsync`. Confirm this is in scope.
> **Recommendation**: Include — Redis `IConnectionMultiplexer` is already wired in `Program.cs`.

---

## Verification Plan

### Automated Tests (new files required)
- `apps/api-ai-analytics/tests/services/test_forecast_service.py`
- `apps/api-ai-analytics/tests/api/v1/test_forecasts.py`
- `apps/api-crm/tests/Crm.Api.Tests/Services/DashboardBroadcastServiceTests.cs`
- `apps/api-crm/tests/Crm.Api.Tests/Hubs/DashboardHubTests.cs`
- `apps/web-crm/src/__tests__/hooks/useDashboardSummary.test.ts`
- `apps/web-crm/src/__tests__/hooks/useDashboardHub.test.ts`

### Run commands
```bash
# api-ai-analytics
cd apps/api-ai-analytics && python -m pytest tests/ -v

# api-crm
cd apps/api-crm && dotnet test tests/Crm.Api.Tests/

# web-crm
cd apps/web-crm && npm test
```

### Manual Verification Checklist
- [x] KPI cards show real data with ↑↓ delta indicators and skeleton on load
- [x] All four forecast charts render with correct data shapes
- [x] Churn distribution donut clicks navigate to filtered customer list
- [x] At-risk watchlist rows link to customer profiles; quick-action fires NBA
- [x] Anomaly acknowledge button changes card state; critical anomalies fire toast
- [x] LiveMetricsBar updates in real time when a ticket is created/claimed
- [x] NL query renders results as table, chart, or value correctly
