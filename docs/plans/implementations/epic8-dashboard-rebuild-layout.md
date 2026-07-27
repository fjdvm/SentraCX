# Implementation Plan: Dashboard Rebuild & Layout Alignment (BR-DASH-01 to BR-DASH-04)

## Overview
This plan details the restructuring and styling alignment of the SentraCX operational dashboard with the `analytics_dashboard` design reference (screen.png & DESIGN.md). It ensures consistent copy, color tokens, and a clean grid layout while maintaining the existing sidebar and header.

## Design Alignment & Constraints
- **Colors**: Do not use the red color. Semantic colors (destructive, warnings) are mapped to warm orange, amber, and slate tones. We define `--color-metric-negative` to point to a non-red rust orange `oklch(0.62 0.18 45)`.
- **Top Row**: 6 KPI cards displayed horizontally (Open Support Requests, Avg Time to Resolve, Customers Leaving, Avg Customer Value, Customer Mood, Running Promotions).
- **Status Strip**: Dark status strip directly below the KPI cards showing live queue states and connection status without reload.
- **2x2 Chart Grid**: expected support requests, expected revenue, risk donut, and sentiment trend with threshold line overlay.
- **Attention Feed**: scrollable panel titled "Things That Need Attention" showing severity badges and acknowledge triggers (always visible, handles empty state gracefully).
- **FAB Ask SentraCX**: Collapsible sheet panel toggled by a bottom-right FAB button, supporting inline mini-charts, tables, value cards, and suggest chips.

## Proposed Changes

### `globals.css`
- Add metric colors aliases to support theme-driven values avoiding red:
  - `--color-metric-positive` pointing to green (`--success`)
  - `--color-metric-negative` pointing to orange/rust (`oklch(0.62 0.18 45)`)
  - `--color-metric-warning` pointing to amber (`--warning`)

### `api-ai-analytics`
- Add `/api/v1/dashboard/ask` route to process natural language questions.
- Schema definitions for `AskRequest` and `AskResponse`.

### `web-crm`
- Custom `ask` API call inside `aiClient`.
- `kpi-card.tsx` & `kpi-row.tsx` components.
- `live-status-strip.tsx` component.
- `attention-feed.tsx` component.
- `ask-sentracx-panel.tsx` component.
- Layout refactoring in `Dashboard.tsx`.
- Verification test suite `dashboard.test.tsx`.

## Verification & Testing
- Run Python service tests: `pytest tests/`
- Run Jest frontend tests: `npm run test`
