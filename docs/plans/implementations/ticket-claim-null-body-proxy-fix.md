# Implementation Plan: Fix "Failed to claim ticket" on Successful Claim

## 1. Problem Statement & Symptom

When a user in the Web CRM clicks **"Claim Ticket"** in the ticket detail sheet ([TicketDetailSheet.tsx](file:///home/friedrich/workspace/monorepo/SentraCX/apps/web-crm/src/components/features/tickets/TicketDetailSheet.tsx)), the UI displays an error toast:
> *"Failed to claim ticket."*

However, upon refreshing or inspecting the ticket list, the ticket was actually successfully claimed in the backend database and assigned to the user.

---

## 2. Root Cause Analysis

### Trace Breakdown:
1. **Frontend Trigger**:
   - The user clicks **Claim Ticket** in [TicketDetailSheet.tsx](file:///home/friedrich/workspace/monorepo/SentraCX/apps/web-crm/src/components/features/tickets/TicketDetailSheet.tsx#L31-L40), invoking `crmClient.tickets.claim(ticketId)`.
   - In browser environments, [crm-client.ts](file:///home/friedrich/workspace/monorepo/SentraCX/apps/web-crm/src/lib/api/crm-client.ts#L48-L53) rewrites `/api/v1/tickets/{id}/claim` to the client-side proxy route:
     `PUT /api/crm/tickets/{id}/claim`.
2. **Next.js Proxy Handler**:
   - The Next.js API route handler in [apps/web-crm/src/app/api/crm/[...path]/route.ts](file:///home/friedrich/workspace/monorepo/SentraCX/apps/web-crm/src/app/api/crm/[...path]/route.ts#L10-L62) forwards the request to the .NET CRM API (`https://localhost:5005/api/v1/tickets/{id}/claim`).
3. **CRM Backend Execution**:
   - [TicketsController.cs](file:///home/friedrich/workspace/monorepo/SentraCX/apps/api-crm/Controllers/TicketsController.cs#L59-L73) executes `ticketService.ClaimAsync(id, staffUserId)`.
   - [TicketService.cs](file:///home/friedrich/workspace/monorepo/SentraCX/apps/api-crm/Services/TicketService.cs#L120-L144) successfully updates the ticket status to `"Claimed"`, sets `AssignedToId`, saves changes to PostgreSQL, broadcasts SignalR events, and returns `true`.
   - `TicketsController` returns `NoContent()` (**HTTP 204**).
4. **Proxy Response Failure**:
   - In [apps/web-crm/src/app/api/crm/[...path]/route.ts](file:///home/friedrich/workspace/monorepo/SentraCX/apps/web-crm/src/app/api/crm/[...path]/route.ts#L41-L53):
     ```typescript
     const response = await fetch(url.toString(), fetchOptions);
     const responseBody = await response.arrayBuffer();
     ...
     return new NextResponse(Buffer.from(responseBody), {
       status: response.status,
       headers: responseHeaders,
     });
     ```
   - According to the WHATWG Fetch / Next.js `Response` specification, responses with "null body status" codes (**`101`, `204`, `205`, `304`**) **must not** contain a body.
   - Passing `Buffer.from(responseBody)` (even an empty buffer `Buffer.from([])`) to `new NextResponse(body, { status: 204 })` throws a runtime exception:
     ```
     TypeError: Response with null body status cannot have body
     ```
   - The `catch (error)` block in `proxyRequest` catches this error and returns a **502 Bad Gateway** response with `{ error: "Failed to connect to CRM API: TypeError: Response with null body status cannot have body" }`.
5. **Frontend Error Toast**:
   - `crmClient.tickets.claim` sees the `502` status code and throws an `Error`.
   - `TicketDetailSheet.tsx` catches the exception and renders `onShowToast("Failed to claim ticket.")`.

---

## 3. Proposed Fix & Technical Approach

### Primary Change:
Update [apps/web-crm/src/app/api/crm/[...path]/route.ts](file:///home/friedrich/workspace/monorepo/SentraCX/apps/web-crm/src/app/api/crm/[...path]/route.ts) to handle null-body HTTP statuses and empty response bodies:

```typescript
const NULL_BODY_STATUSES = new Set([101, 204, 205, 304]);

if (NULL_BODY_STATUSES.has(response.status) || responseBody.byteLength === 0) {
  return new NextResponse(null, {
    status: response.status,
    headers: responseHeaders,
  });
}

return new NextResponse(Buffer.from(responseBody), {
  status: response.status,
  headers: responseHeaders,
});
```

### Secondary Scope (Impacted Endpoints):
This fix resolves all HTTP 204 endpoints proxied through `/api/crm/*`, including:
- `PUT /api/v1/tickets/{id}/claim` (Claim ticket)
- `PUT /api/v1/tickets/{id}/unclaim` (Unclaim ticket)
- `PUT /api/v1/tickets/{id}/status` (Update ticket status)
- `DELETE /api/v1/customers/{id}` (Delete customer)
- `PUT /api/v1/customers/{id}/status` (Update customer status)
- `PUT /api/v1/customers/{id}/type` (Update customer type)
- `PUT /api/v1/customers/{id}/notes` (Update customer notes)
- `PUT /api/v1/tickets/{ticketId}/messages/{messageId}/read` (Mark message read)
- `PUT /api/v1/campaigns/{id}` / `DELETE /api/v1/campaigns/{id}` (Campaign actions)
- `PUT /api/v1/promotions/{id}` / `DELETE /api/v1/promotions/{id}` (Promotion actions)

---

## 4. Affected Files

| File | Action | Description |
|---|---|---|
| [apps/web-crm/src/app/api/crm/[...path]/route.ts](file:///home/friedrich/workspace/monorepo/SentraCX/apps/web-crm/src/app/api/crm/[...path]/route.ts) | Modify | Handle null-body statuses (`204`, `205`, `304`, `101`) and empty payloads by returning `new NextResponse(null, ...)` |
| `apps/web-crm/src/__tests__/app/api/crm/route.test.ts` | Create | Add unit tests covering proxy forwarding for `204 No Content`, `200 OK` with JSON, and error responses |
| [apps/web-crm/src/__tests__/components/features/tickets/TicketDetailSheet.test.tsx](file:///home/friedrich/workspace/monorepo/SentraCX/apps/web-crm/src/__tests__/components/features/tickets/TicketDetailSheet.test.tsx) | Create | Add unit test verifying `TicketDetailSheet` claim and unclaim interactions and toast triggers |

---

## 5. Verification & Testing Plan

1. **Unit Tests**:
   - Run `npm run test --workspace=apps/web-crm` to ensure all existing and new tests pass.
   - Specifically verify that the proxy route handles 204 status without throwing `TypeError: Response with null body status cannot have body`.
2. **Integration Verification**:
   - Perform a ticket claim action in the web CRM UI.
   - Verify that the toast notification displays **"Ticket claimed successfully."** instead of "Failed to claim ticket."
   - Verify the ticket moves to the Claimed tab and is properly assigned.
