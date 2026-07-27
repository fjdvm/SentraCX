# Implementation Plan - Fix Dashboard Charts

## Overview
Fix broken interactive charts in `apps/web-crm` by aligning frontend API queries with Python FastAPI backend schemas, fixing invalid CSS `oklch(var(...))` SVG color attributes, mapping field names (`date`, `count`, `score`, `revenue`), and resolving skeleton loader lock on errors.

## Affected Services
- `apps/web-crm` (Next.js frontend)
- `apps/api-ai-analytics` (Python FastAPI backend endpoints reference)

## Modified Files
- `apps/web-crm/src/lib/api/ai-client.ts`
- `apps/web-crm/src/components/features/dashboard/TicketVolumeForecastChart.tsx`
- `apps/web-crm/src/components/features/dashboard/RevenueBySegmentChart.tsx`
- `apps/web-crm/src/components/features/dashboard/SentimentTrendChart.tsx`
- `apps/web-crm/src/components/features/dashboard/ChurnDistributionChart.tsx`
- `apps/web-crm/src/hooks/useDashboardForecasts.ts`

## Verification
- Unit test: `npm --prefix apps/web-crm test -- src/__tests__/hooks/useDashboardForecasts.test.ts`
- Backend test: `pytest apps/api-ai-analytics/tests/api/v1/routes/test_forecasts.py`
