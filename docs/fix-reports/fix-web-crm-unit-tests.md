# Bug Fix Report: Web CRM Unit Test Failures

## Symptom
Running `npm run test --workspace=apps/web-crm` resulted in multiple failures across two test suites:
1. `src/__tests__/lib/api/crm-client.test.ts`:
   - All tests failed due to requesting relative paths (`/api/crm/...`) instead of direct backend paths (`https://localhost:5005/api/v1/...`).
   - When configured to run under a node environment, it crashed with a `SyntaxError: Cannot use import statement outside a module` on `next-auth/index.js` during dynamic import of `@/auth`.
2. `src/__tests__/components/features/dashboard/dashboard.test.tsx`:
   - `KpiRow` test: Failed to find `Avg Customer Value` in the document.
   - `AttentionFeed` test: `acknowledgeAnomaly` was called with `undefined` instead of `"anom-1"`.

## Root Cause
1. **API Client Environment & Auth Import**:
   - `crmClient` uses a browser rewrite proxy when `typeof window !== "undefined"` and direct endpoint calls when running server-side. Because the tests ran in JSDOM, it triggered client-side behavior instead of the direct endpoint behavior expected by the tests.
   - Changing the test environment to `node` caused the client to evaluate `typeof window === "undefined"`, which triggered server-side authentication loading code. This code imports `src/auth.ts` (using `next-auth`), which threw ESM module errors since Jest under node doesn't natively transform `next-auth` ESM code.
2. **Dashboard KPI Layout**:
   - The KPI dashboard row had been updated in a previous layout change to only show 5 KPI cards (commenting out `Avg Customer Value` and updating the CSS grid to `xl:grid-cols-5`). However, both the loading skeleton loader and unit test assertions were still hardcoded to expect 6 KPI cards.
3. **Mock Anomaly ID Mismatch**:
   - The `AttentionFeed` component expects and uses `anomaly_id` to refer to the identifier of an anomaly. The dashboard tests mocked this object with `id` instead of `anomaly_id`, resulting in the `Acknowledge` action handler passing `undefined`.

## Fix
1. **API Client Test Environment & Auth Mocking**:
   - Added `/** @jest-environment node */` header at the top of `src/__tests__/lib/api/crm-client.test.ts` to ensure it runs in the Node environment (matching direct server-side endpoint behavior).
   - Mocked `@/auth` in `crm-client.test.ts` to return a null session:
     ```typescript
     jest.mock("@/auth", () => ({
       auth: jest.fn().mockResolvedValue(null),
     }));
     ```
     This bypasses the load of the real `src/auth.ts` and `next-auth`, resolving the SyntaxError.
2. **Dashboard KPI Row & Loader Alignment**:
   - Updated `kpi-row.tsx` skeleton loader to match the 5 active KPI cards (`xl:grid-cols-5` and `length: 5` instead of `6`).
   - Aligned `dashboard.test.tsx` assertions to check for 5 active KPI cards (and check that `Avg Customer Value` and its corresponding formatting values are not present).
3. **AttentionFeed Anomaly ID Mock Alignment**:
   - Changed the mocked anomaly key from `id` to `anomaly_id` in `dashboard.test.tsx` to match component requirements.
4. **Jest Setup environment check**:
   - Wrapped `Object.defineProperty(window, "matchMedia", ...)` inside `jest.setup.ts` with `if (typeof window !== "undefined")` so that global setups do not break when tests run in node environments.

## Verification
Ran `npm run test --workspace=apps/web-crm` locally. All 23 test suites and all 93 unit tests passed successfully.
