# SentraCX — Integration Backlog

**Cross-system integration between `br-online-shop`, `internal-auth-service`, and `SentraCX`.**

This backlog covers all integration touchpoints that connect:
- **`br-online-shop`** (`api-oos`, `web-shop`) — customer-facing ecommerce
- **`internal-auth-service`** (`api` OpenIddict OIDC) — centralized identity provider
- **`SentraCX`** (`api-crm`, `api-ai-analytics`, `web-crm`) — CRM & AI platform

Priority: P0 = MVP-critical, P1 = important, P2 = nice-to-have.

---

## Current State (already working)

| Integration | How it works today |
|---|---|
| Customer signup → CRM profile | `api-oos` calls `POST /api/v1/webhooks/customer-signup` on SentraCX after registration |
| Ticket creation from shop | `api-oos` proxies `POST /api/v1/tickets` to SentraCX via `SentraCxService` |
| Ticket listing/details from shop | `api-oos` proxies `GET /api/v1/tickets` to SentraCX |
| Bot replies | `web-shop` → `api-oos` `POST /api/bot/reply` → `api-ai-analytics` (Groq LLM) |
| Auth setup (web-crm) | NextAuth v5 configured with OIDC provider (`crms-client`) pointing to `internal-auth-service` — currently **bypassed** for local dev |
| OIDC client registered | `crms-client` seeded in auth service with redirect to `https://localhost:3005` |
| CRMS modules seeded | Dashboard, Customer Profiles, Campaigns, Conversations, Tickets — registered in auth service |

---

## EPIC INT-1: Customer Profile Sync (P0)

Ensures that when a user signs up on `br-online-shop`, their profile is automatically created in SentraCX and stays linked for order history display.

### INT-1.1 Auto-create CRM customer on shop signup

**Status:** ✅ Partially implemented — `SentraCxService.CreateSupportTicketAsync` already calls the webhook.

**Remaining work:**

- [ ] Backend (`api-oos`): Extract the signup webhook call from `CreateSupportTicketAsync` into a dedicated `SyncCustomerToSentraCxAsync` method so it's called on **every** registration, not just when initiating chat
- [ ] Backend (`api-oos`): Call `SyncCustomerToSentraCxAsync` inside `AuthService.RegisterAsync` (after successful user creation) — fire-and-forget with retry
- [ ] Backend (`api-crm`): Ensure `/api/v1/webhooks/customer-signup` is idempotent (no duplicate customer if called twice with same email)
- [ ] Backend (`api-crm`): Store the `api-oos` user ID (`Guid`) as `externalId` on the Customer entity for cross-system linking
- [ ] Backend (`api-crm`): Return the created/existing CRM customer ID in the webhook response so `api-oos` can store the mapping

### INT-1.2 Order history in customer profile details

**Status:** 🔲 Not yet implemented — webhook for orders exists (`POST /api/v1/webhooks/orders`) but not triggered from `api-oos`.

- [ ] Backend (`api-oos`): After order status changes (placed, shipped, delivered, cancelled), emit a webhook call to SentraCX: `POST /api/v1/webhooks/orders` with `{ orderId, customerId, status, total, items[], timestamps }`
- [ ] Backend (`api-crm`): Consume order webhooks and store order summary data linked to the customer record
- [ ] Backend (`api-crm`): `GET /api/v1/customers/{id}/orders` endpoint returns paginated order history
- [ ] Frontend (`web-crm`): Customer profile "Order History" tab displays data from the above endpoint (already has UI placeholder — needs real data binding)
- [ ] Backend (`api-oos`): On order completion/cancellation → webhook call (event-driven or scheduled sync fallback)

---

## EPIC INT-2: Real-Time Ticketing (P0)

When a customer creates a ticket in `br-online-shop`, it appears in real time in SentraCX's Tickets module.

### INT-2.1 Ticket creation real-time sync

**Status:** ✅ Partially implemented — `api-oos` already proxies ticket creation to `api-crm`.

**Remaining work:**

- [ ] Backend (`api-crm`): On ticket creation, broadcast a SignalR event (`NewTicketAvailable`) to all connected `web-crm` clients subscribed to the tickets channel
- [ ] Frontend (`web-crm`): Subscribe to `NewTicketAvailable` SignalR event on the Tickets page — append new ticket to the "Available" list without requiring a page refresh
- [ ] Backend (`api-crm`): On ticket status change (claimed, completed, cancelled), broadcast `TicketStatusChanged` event with ticket ID + new status
- [ ] Frontend (`web-crm`): Handle `TicketStatusChanged` — move ticket between tabs (Available → Claimed → Completed) in real time

### INT-2.2 Ticket status sync back to shop

- [ ] Backend (`api-crm`): When staff claims/completes a ticket, the status update is immediately visible when `api-oos` proxies `GET /api/v1/tickets` (already works via proxy pattern)
- [ ] Frontend (`web-shop`): Poll or subscribe to ticket status changes so the customer sees "An agent is handling your ticket" in real time
- [ ] Backend (`api-oos`): Optionally expose a SignalR hub (or use SSE) for the customer to receive ticket status updates without polling

---

## EPIC INT-3: Real-Time Conversations (P0)

When a customer asks for a human agent in `br-online-shop`, the conversation appears live in SentraCX's Conversations module, and both parties can chat in real time.

### INT-3.1 Live agent escalation flow

**Status:** 🔲 Partially built — `ChatHub` in `api-crm` supports real-time messaging. `web-shop` has a chat UI. They are not yet connected end-to-end.

- [ ] Backend (`api-crm`): Allow external (cross-origin) SignalR connections from `web-shop` (`https://localhost:3006`) — add CORS policy for the `/hubs/chat` endpoint
- [ ] Frontend (`web-shop`): When bot returns `shouldEscalate: true`, connect directly to SentraCX's `ChatHub` (SignalR) using the ticket ID as the group — no proxy needed for real-time messages
- [ ] Frontend (`web-shop`): Show "Connecting to agent..." state while waiting for an employee to claim the ticket
- [ ] Frontend (`web-crm`): Conversations module already listens on `ChatHub` — when a customer sends a message, it appears live in the employee's conversation window
- [ ] Backend (`api-crm`): `SendMessage` hub method should accept a `senderType` field (`customer` | `employee`) to distinguish message origin
- [ ] Backend (`api-crm`): On new message from customer, broadcast `NewMessageNotification` to notify employees of unread conversations
- [ ] Frontend (`web-crm`): Show unread badge / notification when a customer sends a new message

### INT-3.2 Bi-directional real-time messaging

- [ ] Frontend (`web-shop`): Customer receives employee messages via `ReceiveMessage` SignalR event — already supported by hub group pattern
- [ ] Frontend (`web-crm`): Employee receives customer messages via same `ReceiveMessage` event
- [ ] Backend (`api-crm`): Ensure message persistence — all messages saved to DB regardless of SignalR delivery success
- [ ] Backend (`api-crm`): Handle reconnection — on SignalR reconnect, client fetches missed messages via `GET /api/v1/tickets/{id}/messages?since={lastMessageTimestamp}`

---

## EPIC INT-4: Authentication & Authorization (P0)

SentraCX (`web-crm`) is only accessible to authenticated employees with CRMS access granted by `internal-auth-service`.

### INT-4.1 Enable OIDC authentication (remove dev bypass)

**Status:** 🔲 Auth is configured but bypassed (`return true` in `authorized` callback in `src/auth.ts`).

- [ ] Frontend (`web-crm`): Remove the auth bypass — uncomment the real `authorized` callback logic in `src/auth.ts`
- [ ] Frontend (`web-crm`): Ensure the sign-in page redirects to `internal-auth-service` login
- [ ] Frontend (`web-crm`): After successful OIDC login, validate that the user has `CRMS` in their `systems` claim
- [ ] Frontend (`web-crm`): If user is authenticated but does NOT have CRMS access, show an "Access Denied" page instead of the app
- [ ] Frontend (`web-crm`): Display user info (name, role) from the OIDC token in the app shell / sidebar

### INT-4.2 Module-level access control

The auth service seeds per-module permissions (`UserAppPermission`) for CRMS: Dashboard, Customer Profiles, Campaigns, Conversations, Tickets.

- [ ] Frontend (`web-crm`): Fetch user's CRMS module permissions from auth service (or include in token claims)
- [ ] Frontend (`web-crm`): Hide/disable sidebar nav items for modules the user has no access to
- [ ] Frontend (`web-crm`): Protect routes server-side (middleware) — redirect to "Access Denied" if user navigates to a module they lack permission for
- [ ] Backend (`api-crm`): Validate incoming requests have a valid bearer token from `internal-auth-service` (OIDC resource server pattern)
- [ ] Backend (`api-crm`): Optionally enforce module permissions server-side (e.g., reject `/api/v1/campaigns` if user lacks Campaigns permission)

### INT-4.3 Role-based feature visibility

Roles seeded in auth service: Super Admin, CEO, VP, Marketing Manager, Support Assistant, Staff/Employee.

- [ ] Frontend (`web-crm`): Map roles to CRM capabilities (e.g., Support Assistant can only access Tickets + Conversations; Marketing Manager can access Campaigns + Customer Profiles)
- [ ] Frontend (`web-crm`): Admin settings page (Epic 9 in main backlog) restricted to Super Admin / CEO roles
- [ ] Backend (`api-crm`): Role-based authorization attributes on sensitive endpoints (e.g., `DELETE` operations, config changes)

---

## EPIC INT-5: Chatbot Integration (P0)

The `br-online-shop` chatbot (powered by `api-ai-analytics` via `api-oos`) has tiered access based on authentication state.

### INT-5.1 Unauthenticated chatbot (shop overview only)

- [ ] Backend (`api-oos`): Allow `POST /api/bot/reply` **without** `[Authorize]` when the request does not include order-related or account-related intent
- [ ] Backend (`api-oos`): Add a separate `POST /api/bot/public-reply` endpoint (no auth required) — restrict context to: store hours, product catalog, shipping policies, general FAQ
- [ ] Backend (`api-ai-analytics`): Chatbot intent detection must classify the query scope (`public_info` vs. `account_specific`) — if `account_specific`, respond with "Please log in to access your orders and chat with a live agent"
- [ ] Frontend (`web-shop`): Show chat bubble for all users (authenticated or not)
- [ ] Frontend (`web-shop`): Unauthenticated users see bot responses only — no "Talk to agent" option, no order lookup
- [ ] Frontend (`web-shop`): If unauthenticated user asks about orders/account, bot replies with login prompt + link to sign-in page

### INT-5.2 Authenticated chatbot (full features)

- [ ] Backend (`api-oos`): Existing `POST /api/bot/reply` (requires auth) — bot can access user's order history, ticket history, and account details for personalized responses
- [ ] Backend (`api-ai-analytics`): When intent is `order_status`, look up order from `api-oos` data and return status
- [ ] Backend (`api-ai-analytics`): When intent is `escalate` or confidence is low, return `shouldEscalate: true`
- [ ] Frontend (`web-shop`): Authenticated users see "Talk to live agent" button after bot escalation signal
- [ ] Frontend (`web-shop`): On escalation, create a ticket (via `api-oos` → `api-crm`) and connect to `ChatHub` (Epic INT-3.1)

### INT-5.3 Conversation continuity

- [ ] Backend (`api-crm`): When chatbot escalates to human agent, include the bot conversation history as context in the ticket description or as initial messages
- [ ] Frontend (`web-crm`): Employee sees bot conversation summary when opening an escalated ticket — understands context before replying
- [ ] Backend (`api-ai-analytics`): `GET /api/ai/conversations/{id}/summary` generates a quick summary of the bot exchange for the human agent

---

## EPIC INT-6: Order Event Sync to AI-Analytics (P1)

Enables AI features (CLV prediction, churn scoring) that depend on purchase history.

- [ ] Backend (`api-oos`): On order status change, publish event to SentraCX webhook (`POST /api/v1/webhooks/orders`)
- [ ] Backend (`api-crm`): Forward relevant order data to `api-ai-analytics` (or `api-ai-analytics` pulls from CRM on schedule)
- [ ] Backend (`api-ai-analytics`): `OrderIngestionService` consumes order data for CLV/churn model inputs
- [ ] Backend (`api-ai-analytics`): Recalculate customer scores when new order data arrives (or on next scheduled batch)

---

## Dependency Graph

```
INT-4 (Auth)           ← Must be first: nothing works without auth in production
  ↓
INT-1 (Customer Sync)  ← Foundation: customers must exist before tickets/orders reference them
  ↓
INT-2 (Tickets)        ← Depends on INT-1 (customer linked to ticket)
INT-5 (Chatbot)        ← Depends on INT-1 (knows if user is authenticated customer)
  ↓
INT-3 (Conversations)  ← Depends on INT-2 (escalation creates a ticket first) + INT-5 (bot triggers escalation)
  ↓
INT-6 (Order → AI)     ← Depends on INT-1 (customer mapping) — can be done in parallel with INT-3
```

---

## Suggested Build Order

| Phase | Epic | Rationale |
|---|---|---|
| 1 | INT-4 (Auth) | Gate everything behind real auth — removes dev bypass |
| 2 | INT-1 (Customer Sync) | Ensure every shop user has a CRM profile with linked ID |
| 3 | INT-2 (Real-Time Tickets) | Tickets flow from shop to CRM live |
| 4 | INT-5 (Chatbot) | Tiered bot access (public vs. authenticated) |
| 5 | INT-3 (Real-Time Conversations) | Human agent escalation — the final link |
| 6 | INT-6 (Order → AI) | Enables predictive features (CLV, churn) |

---

## Technical Notes

| Topic | Detail |
|---|---|
| **SignalR CORS** | `api-crm` must allow `https://localhost:3006` (web-shop) on the `/hubs/chat` path |
| **Auth token forwarding** | `web-shop` passes the user's JWT to `api-oos` which forwards it when proxying to `api-crm` — or `api-crm` trusts `api-oos` via service-to-service token |
| **Idempotency** | Customer signup webhook must be idempotent (dedupe by email); order webhook must be idempotent (dedupe by orderId + status) |
| **Failure resilience** | All webhook calls from `api-oos` to SentraCX should use retry with exponential backoff; ticket/chat creation must not fail the shop's primary operation |
| **OIDC scopes** | `web-crm` requests `openid profile email systems` — the `systems` scope returns which apps the user can access |
| **Module permissions** | Fetched via auth service API or included as custom claims in the access token |
