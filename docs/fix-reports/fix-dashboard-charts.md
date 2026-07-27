# Bug Fix Report: Dashboard Charts Not Rendering

## Symptom
Interactive dynamic charts on the CRM dashboard (`TicketVolumeForecastChart`, `RevenueBySegmentChart`, `SentimentTrendChart`, `ChurnDistributionChart`) failed to display graphs or rendered blank / infinite skeleton loaders.

## Root Cause
1. **Invalid SVG Color Syntax**: CSS variables in component SVG attributes were wrapped in `oklch(var(--primary))`, but token variables in `globals.css` already contained `oklch(...)`. The evaluated value `oklch(oklch(...))` is invalid CSS color syntax, causing browser SVG rendering to fail.
2. **API Endpoint & Query Mismatch**: `aiClient` queried `/api/v1/forecasts/revenue-by-segment` (returning HTTP 404 instead of `/api/v1/forecasts/revenue`) and sent `?days=7` instead of query parameter `?range=7d`.
3. **Data Schema Mismatches**: Chart components attempted to access `item.timestamp` and `item.value`, but backend Pydantic models return `date`, `count`, `score`, and `revenue`.
4. **Error Handling**: API failure left `data` as `null` while setting `isLoading` to `false`, sticking charts in permanent skeleton loading states.

## Fix
- Modified [ai-client.ts](file:///home/friedrich/workspace/monorepo/SentraCX/apps/web-crm/src/lib/api/ai-client.ts) to query correct routes (`/api/v1/forecasts/revenue`) and formatting range parameter `?range=${days}d`.
- Modified [TicketVolumeForecastChart.tsx](file:///home/friedrich/workspace/monorepo/SentraCX/apps/web-crm/src/components/features/dashboard/TicketVolumeForecastChart.tsx), [RevenueBySegmentChart.tsx](file:///home/friedrich/workspace/monorepo/SentraCX/apps/web-crm/src/components/features/dashboard/RevenueBySegmentChart.tsx), [SentimentTrendChart.tsx](file:///home/friedrich/workspace/monorepo/SentraCX/apps/web-crm/src/components/features/dashboard/SentimentTrendChart.tsx), and [ChurnDistributionChart.tsx](file:///home/friedrich/workspace/monorepo/SentraCX/apps/web-crm/src/components/features/dashboard/ChurnDistributionChart.tsx) to replace `oklch(var(--token))` with `var(--token)` and added defensive fallback mapping for `date`/`timestamp` and `count`/`value`/`score`/`revenue`.

## Verification
- Backend tests passed: `pytest tests/api/v1/routes/test_forecasts.py` (4/4 passed).
- Frontend hook unit tests passed: `npm test -- src/__tests__/hooks/useDashboardForecasts.test.ts`.
