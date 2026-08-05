# Plan: Make Dashboard AI & Analytics Fully Functional

**Status**: In Progress  
**Branch**: `feature/dashboard-ai-analytics-functional`

## What Was Broken

| Component | Problem |
|---|---|
| `DashboardChartSummary` | All 4 chart summary panels show hardcoded static values (e.g. "58% Enterprise Share", "4.8/5.0 CSAT", "4 Accounts"). Live forecast data was being received but ignored. |
| `Dashboard.tsx` | `AskSentraCXPanel` was fully implemented but never rendered — the AI chatbot button was invisible. |
| `RevenueBySegmentChart` | The `by_segment` object from the API contains scalar totals per segment (e.g. `{ "High-Value": 120000, "Regular": 85000 }`). These are incorrectly plotted per time-series point as if they were daily values, making segment lines appear flat and misleading. |
| `data.json` | Orphan file in `app/dashboard/` containing irrelevant document planning data — not used by any component. |

## Services Affected

- `apps/web-crm` (frontend only)
- `apps/api-crm` — **No changes needed.** DashboardHub already correctly broadcasts all 4 metrics (`ActiveTickets`, `PendingEscalations`, `UnreadConversations`, `OnlineAgents`) via `DashboardMetricsUpdated`. Tests already pass.

## File Modifications

### Changed
- `apps/web-crm/src/components/features/dashboard/DashboardChartSummary.tsx`  
  All 4 panels (`workload`, `revenue`, `sentiment`, `risk`) now receive typed props and compute dynamic stats from live API data.

- `apps/web-crm/src/components/features/dashboard/Dashboard.tsx`  
  `<AskSentraCXPanel />` imported and rendered as a floating panel.

- `apps/web-crm/src/components/features/dashboard/RevenueBySegmentChart.tsx`  
  The `by_segment` scalar totals are now rendered as a segment breakdown bar (or donut summary) below the time-series forecast line, not incorrectly plotted as flat time-series lines.

### Deleted
- `apps/web-crm/src/app/dashboard/data.json`

## Architecture Notes
- No new API endpoints required — all data was already being fetched; the rendering logic was broken.
- No new shadcn components required.
- CRM hub already implemented correctly.
