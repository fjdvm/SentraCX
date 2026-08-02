# Bug Fix Report: False "Failed to claim ticket" Error on Successful Claim

## Symptom
When an agent clicked **"Claim Ticket"** in the ticket detail sheet ([TicketDetailSheet.tsx](file:///home/friedrich/workspace/monorepo/SentraCX/apps/web-crm/src/components/features/tickets/TicketDetailSheet.tsx)), the UI displayed an error toast:
> *"Failed to claim ticket."*

However, the ticket was successfully claimed in the CRM backend and database, correctly assigned to the staff user.

## Root Cause
1. In browser environments, the frontend client ([crm-client.ts](file:///home/friedrich/workspace/monorepo/SentraCX/apps/web-crm/src/lib/api/crm-client.ts)) proxies requests through the Next.js route handler at `/api/crm/[...path]`.
2. The .NET CRM backend returns `204 NoContent` upon a successful ticket claim.
3. In [route.ts](file:///home/friedrich/workspace/monorepo/SentraCX/apps/web-crm/src/app/api/crm/[...path]/route.ts), the handler previously passed `Buffer.from(responseBody)` directly to `new NextResponse(body, { status: 204 })`.
4. Per the WHATWG Fetch and Next.js `Response` specification, responses with status codes `101`, `204`, `205`, and `304` are "null body status" codes and throwing `TypeError: Response with null body status cannot have body` if any body is provided.
5. The catch block in `proxyRequest` caught this error and returned a **502 Bad Gateway**, which caused the client to throw and trigger the error toast.

## Fix
1. **Next.js CRM API Proxy Route Handler**:
   - Modified [apps/web-crm/src/app/api/crm/[...path]/route.ts](file:///home/friedrich/workspace/monorepo/SentraCX/apps/web-crm/src/app/api/crm/[...path]/route.ts) to detect null-body status codes (`101`, `204`, `205`, `304`) and empty response bodies, returning `new NextResponse(null, { status: response.status, headers: responseHeaders })`.
2. **CRM Proxy Unit Tests**:
   - Added unit test suite in [apps/web-crm/src/__tests__/app/api/crm/route.test.ts](file:///home/friedrich/workspace/monorepo/SentraCX/apps/web-crm/src/__tests__/app/api/crm/route.test.ts) covering `204 No Content` proxying without errors, JSON payload passthrough, query parameter forwarding, and 502 error mapping.
3. **TicketDetailSheet Unit Tests**:
   - Added unit test suite in [apps/web-crm/src/__tests__/components/features/tickets/TicketDetailSheet.test.tsx](file:///home/friedrich/workspace/monorepo/SentraCX/apps/web-crm/src/__tests__/components/features/tickets/TicketDetailSheet.test.tsx) testing claim, unclaim, and error toast handling.
4. **CRM Backend Test Fix**:
   - Fixed missing `using Crm.Api.Interfaces.Repositories;` and `ISingleClientProxy` mock in [apps/api-crm/tests/Crm.Api.Tests/Hubs/DashboardHubTests.cs](file:///home/friedrich/workspace/monorepo/SentraCX/apps/api-crm/tests/Crm.Api.Tests/Hubs/DashboardHubTests.cs).

## Verification
- Ran `npm run test --workspace=apps/web-crm`: All 25 test suites and 102 unit tests passed.
- Ran `dotnet test apps/api-crm/tests/Crm.Api.Tests/Crm.Api.Tests.csproj`: All 88 tests passed.
