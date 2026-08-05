# Plan: Fix Dashboard Report Download

**Status**: In Progress  
**Branch**: `fix/dashboard-download-report`

## What Was Broken

- The CSV download utility `downloadDashboardReport` was accessing forecast keys like `series` on the `ticketVolume`, `revenueBySegment`, `churnDistribution`, and `sentimentTrend` responses.
- The actual API responses returned by `ForecastService` don't have a `.series` field. Instead, they structure their series collections with fields like `forecast_series`, `historical_series`, `trend_series`, or `daily_scores`.
- This mismatch caused the download report action to output empty strings or "No data available" statements for all forecast analytics.

## Affected Components

- `apps/web-crm/src/components/features/dashboard/download-report.ts`

## Fix Details

1. Update keys in `downloadDashboardReport` to match the exact keys returned by the `api-ai-analytics` service:
   - `ticketVolume`: `historical_series` and `forecast_series`
   - `revenueBySegment`: `forecast_series`, `by_segment`, `total_projected`, `confidence`
   - `churnDistribution`: `low`, `medium`, `high`, `critical`, `trend_series`
   - `sentimentTrend`: `daily_scores`, `moving_average`, `forecast_next_7d`
2. Add a comprehensive Jest test suite:
   - `apps/web-crm/src/__tests__/components/features/dashboard/download-report.test.ts`
   - Validates report headers, section structures, and exact formatting matching for real backend models.
