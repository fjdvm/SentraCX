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
| Customer signup → CRM profile | `api-oos` calls `POST /api/v1/webhooks/customer-signup` on SentraCX after registration (idempotent, stores externalUserId) |
| Ticket creation from shop | `api-oos` proxies `POST /api/v1/tickets` to SentraCX via `SentraCxService` |
| Ticket listing/details from shop | `api-oos` proxies `GET /api/v1/tickets` to SentraCX |
| Real-time ticket events | `api-crm` broadcasts `NewTicketAvailable` and `TicketStatusChanged` via SignalR ChatHub; `web-crm` subscribes and updates UI live |
| Live agent chat (SignalR) | `web-shop` connects directly to `api-crm` ChatHub (`/hubs/chat`) for real-time messaging after bot escalation |
| Bi-directional messaging | Both customer (web-shop) and employee (web-crm) receive messages via `ReceiveMessage` SignalR event; messages persisted to DB |
| Bot replies (tiered) | `web-shop` → `api-oos` `POST /api/bot/reply` (auth) or `POST /api/bot/public-reply` (no auth) → `api-ai-analytics` (Groq LLM) with intent classification and escalation detection |
| Bot escalation flow | Bot returns `shouldEscalate`, web-shop shows escalation prompt, creates ticket, connects to ChatHub; bot summary appended to ticket description |
| Conversation summary (AI) | `GET /api/v1/conversations/{id}/summary` on `api-ai-analytics` generates LLM-powered summary of bot exchange for human agents |
| Order webhook consumption | `api-crm` `POST /api/v1/webhooks/orders` endpoint processes order events (idempotent by orderNumber); `GET /api/v1/customers/{id}/orders` returns order history |
| Order ingestion for AI | `api-ai-analytics` `OrderIngestionService` pulls order data from OOS on schedule; feeds CLV/churn prediction models |
| Auth setup (web-crm) | NextAuth v5 configured with OIDC provider (`crms-client`) pointing to `internal-auth-service` — currently **bypassed** for local dev |
| Auth setup (api-crm) | JWT bearer authentication configured with `internal-auth-service` as authority — controllers have `[Authorize]` commented out for dev |
| OIDC client registered | `crms-client` seeded in auth service with redirect to `https://localhost:3005` |
| CRMS modules seeded | Dashboard, Customer Profiles, Campaigns, Conversations, Tickets — registered in auth service |
| CORS for web-shop | `api-crm` CORS policy allows `https://localhost:3006` (web-shop) on all endpoints including `/hubs/chat` |
| Dashboard real-time | `web-crm` connects to `/hubs/dashboard` SignalR hub for live metrics (active tickets, pending escalations, unread conversations, online agents) |

---

## EPIC INT-1: Customer Profile Sync (P0)

Ensures that when a user signs up on `br-online-shop`, their profile is automatically created in SentraCX and stays linked for order history display.

### INT-1.1 Auto-create CRM customer on shop signup

**Status:** ✅ Implemented — `EnsureCustomerSignupAsync` is called in `AuthService.RegisterAsync` and hits the idempotent webhook.

**Remaining work:**

- [x] Backend (`api-oos`): Extract the signup webhook call from `CreateSupportTicketAsync` into a dedicated `SyncCustomerToSentraCxAsync` method so it's called on **every** registration, not just when initiating chat — ✅ Done: `EnsureCustomerSignupAsync` in `SentraCxService`, called from `AuthService.RegisterAsync`
- [x] Backend (`api-oos`): Call `SyncCustomerToSentraCxAsync` inside `AuthService.RegisterAsync` (after successful user creation) — fire-and-forget with retry — ✅ Done: Called with try/catch + warning log on failure
- [x] Backend (`api-crm`): Ensure `/api/v1/webhooks/customer-signup` is idempotent (no duplicate customer if called twice with same email) — ✅ Done: Checks `GetByEmailAsync` before creating
- [x] Backend (`api-crm`): Store the `api-oos` user ID (`Guid`) as `externalId` on the Customer entity for cross-system linking — ✅ Done: `ExternalUserId` passed in webhook DTO, stored as `User.Id`
- [ ] Backend (`api-crm`): Return the created/existing CRM customer ID in the webhook response so `api-oos` can store the mapping — ❌ Webhook returns `Ok()` without body

### INT-1.2 Order history in customer profile details

**Status:** ⚠️ Partially implemented — `api-crm` has the order webhook endpoint and GET orders endpoint, but `api-oos` does not emit order events yet.

- [ ] Backend (`api-oos`): After order status changes (placed, shipped, delivered, cancelled), emit a webhook call to SentraCX: `POST /api/v1/webhooks/orders` with `{ orderId, customerId, status, total, items[], timestamps }` — ❌ No order→SentraCX webhook in api-oos
- [x] Backend (`api-crm`): Consume order webhooks and store order summary data linked to the customer record — ✅ Done: `OrderService.ProcessWebhookAsync` upserts orders (idempotent by orderNumber)
- [x] Backend (`api-crm`): `GET /api/v1/customers/{id}/orders` endpoint returns paginated order history — ✅ Done: `OrdersController` at route `api/v1/customers/{customerId}/orders`
- [ ] Frontend (`web-crm`): Customer profile "Order History" tab displays data from the above endpoint (already has UI placeholder — needs real data binding)
- [ ] Backend (`api-oos`): On order completion/cancellation → webhook call (event-driven or scheduled sync fallback) — ❌ Same as first item

---

## EPIC INT-2: Real-Time Ticketing (P0)

When a customer creates a ticket in `br-online-shop`, it appears in real time in SentraCX's Tickets module.

### INT-2.1 Ticket creation real-time sync

**Status:** ✅ Implemented — `api-crm` broadcasts SignalR events on all ticket mutations; `web-crm` subscribes.

**Remaining work:**

- [x] Backend (`api-crm`): On ticket creation, broadcast a SignalR event (`NewTicketAvailable`) to all connected `web-crm` clients subscribed to the tickets channel — ✅ Done: `TicketService.CreateAsync` broadcasts to "staff" group
- [x] Frontend (`web-crm`): Subscribe to `NewTicketAvailable` SignalR event on the Tickets page — append new ticket to the "Available" list without requiring a page refresh — ✅ Done: `useSignalR` hook subscribes to `NewTicketAvailable`
- [x] Backend (`api-crm`): On ticket status change (claimed, completed, cancelled), broadcast `TicketStatusChanged` event with ticket ID + new status — ✅ Done: `ClaimAsync`, `UnclaimAsync`, `UpdateStatusAsync`, `CancelAsync` all broadcast
- [x] Frontend (`web-crm`): Handle `TicketStatusChanged` — move ticket between tabs (Available → Claimed → Completed) in real time — ✅ Done: `useSignalR` hook subscribes to `TicketStatusChanged`

### INT-2.2 Ticket status sync back to shop

- [x] Backend (`api-crm`): When staff claims/completes a ticket, the status update is immediately visible when `api-oos` proxies `GET /api/v1/tickets` (already works via proxy pattern) — ✅ Done: Proxy pattern works
- [ ] Frontend (`web-shop`): Poll or subscribe to ticket status changes so the customer sees "An agent is handling your ticket" in real time
- [ ] Backend (`api-oos`): Optionally expose a SignalR hub (or use SSE) for the customer to receive ticket status updates without polling

---

## EPIC INT-3: Real-Time Conversations (P0)

When a customer asks for a human agent in `br-online-shop`, the conversation appears live in SentraCX's Conversations module, and both parties can chat in real time.

### INT-3.1 Live agent escalation flow

**Status:** ✅ Implemented — `web-shop` connects directly to SentraCX ChatHub; full escalation flow works end-to-end.

- [x] Backend (`api-crm`): Allow external (cross-origin) SignalR connections from `web-shop` (`https://localhost:3006`) — add CORS policy for the `/hubs/chat` endpoint — ✅ Done: CORS in `Program.cs` includes `https://localhost:3006` with `AllowCredentials`
- [x] Frontend (`web-shop`): When bot returns `shouldEscalate: true`, connect directly to SentraCX's `ChatHub` (SignalR) using the ticket ID as the group — no proxy needed for real-time messages — ✅ Done: `useChatSignalR` hook connects to ChatHub, invokes `JoinTicket`
- [x] Frontend (`web-shop`): Show "Connecting to agent..." state while waiting for an employee to claim the ticket — ✅ Done: Escalation prompt and connection status indicator in `ChatPanel.tsx`
- [x] Frontend (`web-crm`): Conversations module already listens on `ChatHub` — when a customer sends a message, it appears live in the employee's conversation window — ✅ Done: `useSignalR` in web-crm subscribes to `ReceiveMessage`
- [x] Backend (`api-crm`): `SendMessage` hub method should accept a `senderType` field (`customer` | `employee`) to distinguish message origin — ✅ Done: `ChatHub.SendMessage` takes `senderType` parameter with validation
- [x] Backend (`api-crm`): On new message from customer, broadcast `NewMessageNotification` to notify employees of unread conversations — ✅ Done: Sends `NewMessageNotification` to "staff" group when `senderType == "customer"`
- [ ] Frontend (`web-crm`): Show unread badge / notification when a customer sends a new message — ⚠️ `useSignalR` subscribes to `NewMessageNotification` but visual badge/indicator needs verification

### INT-3.2 Bi-directional real-time messaging

- [x] Frontend (`web-shop`): Customer receives employee messages via `ReceiveMessage` SignalR event — already supported by hub group pattern — ✅ Done: `useChatSignalR` listens on `ReceiveMessage`
- [x] Frontend (`web-crm`): Employee receives customer messages via same `ReceiveMessage` event — ✅ Done: `useSignalR` listens on `ReceiveMessage`
- [x] Backend (`api-crm`): Ensure message persistence — all messages saved to DB regardless of SignalR delivery success — ✅ Done: `MessageService.CreateAsync` persists via `messageRepo.AddAsync` before broadcasting
- [x] Backend (`api-crm`): Handle reconnection — on SignalR reconnect, client fetches missed messages via `GET /api/v1/tickets/{id}/messages?since={lastMessageTimestamp}` — ✅ Done: `ConversationsController.GetMessagesSince` with `since` query parameter

---

## EPIC INT-4: Authentication & Authorization (P0)

SentraCX (`web-crm`) is only accessible to authenticated employees with CRMS access granted by `internal-auth-service`.

### INT-4.1 Enable OIDC authentication (remove dev bypass)

**Status:** 🔲 Auth is configured but bypassed (`return true` in `authorized` callback in `src/auth.ts`). JWT bearer is configured in api-crm but `[Authorize]` attributes are commented out.

- [ ] Frontend (`web-crm`): Remove the auth bypass — uncomment the real `authorized` callback logic in `src/auth.ts` — ❌ Still returns `true` unconditionally
- [ ] Frontend (`web-crm`): Ensure the sign-in page redirects to `internal-auth-service` login
- [ ] Frontend (`web-crm`): After successful OIDC login, validate that the user has `CRMS` in their `systems` claim — ⚠️ Systems claim IS parsed from token in JWT callback but NOT enforced
- [ ] Frontend (`web-crm`): If user is authenticated but does NOT have CRMS access, show an "Access Denied" page instead of the app — ❌ No Access Denied page exists
- [ ] Frontend (`web-crm`): Display user info (name, role) from the OIDC token in the app shell / sidebar — ❌ Sidebar uses hardcoded accounts, not session data

### INT-4.2 Module-level access control

The auth service seeds per-module permissions (`UserAppPermission`) for CRMS: Dashboard, Customer Profiles, Campaigns, Conversations, Tickets.

- [ ] Frontend (`web-crm`): Fetch user's CRMS module permissions from auth service (or include in token claims) — ⚠️ `getAccessibleSystems` helper exists but is not wired into UI
- [ ] Frontend (`web-crm`): Hide/disable sidebar nav items for modules the user has no access to — ❌ All nav items render unconditionally
- [ ] Frontend (`web-crm`): Protect routes server-side (middleware) — redirect to "Access Denied" if user navigates to a module they lack permission for — ❌ No middleware.ts exists
- [ ] Backend (`api-crm`): Validate incoming requests have a valid bearer token from `internal-auth-service` (OIDC resource server pattern) — ⚠️ JWT bearer configured in Program.cs but `[Authorize]` commented out on controllers
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

**Status:** ✅ Implemented — `POST /api/bot/public-reply` serves unauthenticated users; intent detection returns login prompts for account-specific queries.

- [x] Backend (`api-oos`): Allow `POST /api/bot/reply` **without** `[Authorize]` when the request does not include order-related or account-related intent — ✅ Done differently: Separate endpoint `POST /api/bot/public-reply` with `[AllowAnonymous]` handles unauthenticated users
- [x] Backend (`api-oos`): Add a separate `POST /api/bot/public-reply` endpoint (no auth required) — restrict context to: store hours, product catalog, shipping policies, general FAQ — ✅ Done: `BotController` has `[AllowAnonymous]` `public-reply` endpoint
- [x] Backend (`api-ai-analytics`): Chatbot intent detection must classify the query scope (`public_info` vs. `account_specific`) — if `account_specific`, respond with "Please log in to access your orders and chat with a live agent" — ✅ Done: `ChatbotService.reply()` checks if `customer_id is None` for account-specific intents and returns login prompt
- [x] Frontend (`web-shop`): Show chat bubble for all users (authenticated or not) — ✅ Done: `<ChatBubble />` rendered in root `layout.tsx`
- [x] Frontend (`web-shop`): Unauthenticated users see bot responses only — no "Talk to agent" option, no order lookup — ✅ Done: "Sign In to Connect" shown instead of direct escalation for unauthenticated users
- [x] Frontend (`web-shop`): If unauthenticated user asks about orders/account, bot replies with login prompt + link to sign-in page — ✅ Done: AI returns login prompt for account_specific intents when no customer_id

### INT-5.2 Authenticated chatbot (full features)

**Status:** ✅ Implemented — Full authenticated chatbot flow with escalation to live agent.

- [x] Backend (`api-oos`): Existing `POST /api/bot/reply` (requires auth) — bot can access user's order history, ticket history, and account details for personalized responses — ✅ Done: `[Authorize]` on endpoint, passes `customerId` from JWT claims to AI service
- [ ] Backend (`api-ai-analytics`): When intent is `order_status`, look up order from `api-oos` data and return status — ⚠️ Intent classification detects `track_order` but actual order lookup from OOS not confirmed
- [x] Backend (`api-ai-analytics`): When intent is `escalate` or confidence is low, return `shouldEscalate: true` — ✅ Done: Escalates when `confidence < 0.60`, `escalation_flag` is True, or `intent == "escalate"`
- [x] Frontend (`web-shop`): Authenticated users see "Talk to live agent" button after bot escalation signal — ✅ Done: Escalation prompt card shown when `shouldEscalate`
- [x] Frontend (`web-shop`): On escalation, create a ticket (via `api-oos` → `api-crm`) and connect to `ChatHub` (Epic INT-3.1) — ✅ Done: `escalateToLiveAgent()` creates ticket and transitions to LIVE_AGENT phase

### INT-5.3 Conversation continuity

**Status:** ✅ Implemented — Bot context appended to ticket; AI summary endpoint available.

- [x] Backend (`api-crm`): When chatbot escalates to human agent, include the bot conversation history as context in the ticket description or as initial messages — ✅ Done: `TicketService.EscalateAsync` appends `botSummary` to ticket description under "--- Bot Context ---"
- [x] Frontend (`web-crm`): Employee sees bot conversation summary when opening an escalated ticket — understands context before replying — ✅ Done: Bot context visible in ticket description
- [x] Backend (`api-ai-analytics`): `GET /api/ai/conversations/{id}/summary` generates a quick summary of the bot exchange for the human agent — ✅ Done: `GET /api/v1/conversations/{id}/summary` with LLM-powered summarization and Redis caching

---

## EPIC INT-6: Order Event Sync to AI-Analytics (P1)

Enables AI features (CLV prediction, churn scoring) that depend on purchase history.

- [ ] Backend (`api-oos`): On order status change, publish event to SentraCX webhook (`POST /api/v1/webhooks/orders`) — ❌ Not implemented in api-oos
- [ ] Backend (`api-crm`): Forward relevant order data to `api-ai-analytics` (or `api-ai-analytics` pulls from CRM on schedule) — ⚠️ Not forwarding from CRM, but AI pulls directly from OOS
- [x] Backend (`api-ai-analytics`): `OrderIngestionService` consumes order data for CLV/churn model inputs — ✅ Done: `OrderIngestionService.sync_recent_orders()` pulls from OOS API, upserts to MongoDB
- [x] Backend (`api-ai-analytics`): Recalculate customer scores when new order data arrives (or on next scheduled batch) — ✅ Done: Scheduled via APScheduler; CLV/churn models consume order features (`total_order_value`, `order_frequency_per_month`, `days_since_last_order`)

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

| Phase | Epic | Status | Rationale |
|---|---|---|---|
| 1 | INT-4 (Auth) | 🔲 Not started | Gate everything behind real auth — removes dev bypass |
| 2 | INT-1 (Customer Sync) | ⚠️ ~90% done | Ensure every shop user has a CRM profile with linked ID (only missing: return customer ID in webhook response) |
| 3 | INT-2 (Real-Time Tickets) | ✅ Done | Tickets flow from shop to CRM live |
| 4 | INT-5 (Chatbot) | ✅ Done | Tiered bot access (public vs. authenticated) with escalation |
| 5 | INT-3 (Real-Time Conversations) | ✅ Done | Human agent escalation — end-to-end working |
| 6 | INT-6 (Order → AI) | ⚠️ ~50% done | AI ingestion works; missing: api-oos event publishing |

---

## Summary of Remaining Work

### High Priority (blocks production deployment)
1. **INT-4**: Remove auth bypass in web-crm, uncomment `[Authorize]` in api-crm, implement access denied page, wire session data into sidebar
2. **INT-1.1**: Return created customer ID in webhook response (minor)
3. **INT-1.2 / INT-6**: Implement order status webhook calls from `api-oos` to SentraCX

### Medium Priority
4. **INT-2.2**: Real-time ticket status updates for customers in web-shop (polling or SignalR)
5. **INT-3.1**: Unread badge/notification in web-crm UI (SignalR event subscription exists, visual indicator may need work)
6. **INT-4.2/4.3**: Module permissions and role-based visibility in web-crm

### Low Priority
7. **INT-1.2**: Web-crm Order History tab real data binding
8. **INT-5.2**: Verify actual order lookup from AI for `track_order` intent

---

## Technical Notes

| Topic | Detail |
|---|---|
| **SignalR CORS** | ✅ `api-crm` allows `https://localhost:3006` (web-shop) — configured in `Program.cs` default CORS policy |
| **Auth token forwarding** | `web-shop` passes the user's JWT to `api-oos` which forwards it when proxying to `api-crm` — or `api-crm` trusts `api-oos` via service-to-service token |
| **Idempotency** | ✅ Customer signup webhook is idempotent (dedupe by email); ✅ Order webhook is idempotent (dedupe by orderNumber + status update) |
| **Failure resilience** | ✅ `EnsureCustomerSignupAsync` wrapped in try/catch with warning log; ticket/chat creation does not fail the shop's primary operation |
| **OIDC scopes** | `web-crm` requests `openid profile email systems` — the `systems` scope returns which apps the user can access (parsed in JWT callback) |
| **Module permissions** | `getAccessibleSystems` helper exists but is not wired into rendering — needs integration |
| **SignalR Redis backplane** | ✅ SignalR uses Redis backplane for horizontal scaling (`AddStackExchangeRedis`) |
