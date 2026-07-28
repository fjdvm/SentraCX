# Epic 2.2 — Customer-Facing Chat & Bot-First Flow

## Background

Epic 2.1 (internal staff chat) is fully complete: `ChatHub` in `api-crm` supports real-time
SignalR messaging, `web-crm` has a working conversation inbox, and `web-shop` has a floating
chat widget. What's missing is the end-to-end connection between the customer-facing widget
and the CRM system, routed through the AI bot first.

This plan covers all open items from **Epic 2.2** (backlog) and the related integration epics
**INT-3** (real-time conversations) and **INT-5** (chatbot tiered access).

---

## Scope

### What's in scope

1. **`api-crm`** — ChatHub CORS for `web-shop`, `senderType` field, bot message persistence,
   escalation endpoint, `NewMessageNotification` broadcast, reconnection message endpoint.
2. **`api-ai-analytics`** — New `chatbot` route: `POST /api/ai/chatbot/reply` with
   public/authenticated tiers, intent classification, order status lookup, escalation signal,
   and FAQ handling. Bot conversation history forwarded on escalation.
3. **`web-crm`** — Unread badge for customer messages, bot conversation summary on escalated
   ticket, cancel-ticket action in conversation view, message/conversation details view.

### What's out of scope

- `web-shop` changes (lives in `br-online-shop` repo — flagged for cross-repo coordination).
- RBAC / auth bypass removal (deferred).

---

## Open Questions

> **Q1 — Bot reply routing:** The integration backlog notes that `web-shop → api-oos POST /api/bot/reply → api-ai-analytics` is the existing pattern for bot replies. Should the new `POST /api/ai/chatbot/reply` endpoint be called **directly** by `web-shop` (bypassing `api-oos`), or should `api-oos` remain the proxy? Keeping `api-oos` as proxy is safer (auth token handling stays there) but adds a hop. **Recommendation: keep `api-oos` as proxy**, add a new `POST /api/bot/chatbot-reply` in `api-oos` that forwards to the new AI endpoint.

> **Q2 — `web-shop` changes:** This plan scopes `web-shop` changes as cross-repo work to coordinate separately. Confirm whether you want to include `br-online-shop` changes in this same branch or keep them separate.

> **Q3 — Bot conversation history on escalation:** When the bot escalates to a human, should the bot exchange be prepended as read-only messages in the CRM conversation view, or attached as a text summary in the ticket description? **Recommendation: text summary in ticket description** (simpler, no schema changes needed for this sprint).

---

## Proposed Changes (All Completed)

### Component 1 — `api-crm`

#### [MODIFY] [DONE] Program.cs
- Extend CORS `WithOrigins` to include `https://localhost:3006` (web-shop) so `web-shop` can connect directly to `/hubs/chat`.

#### [MODIFY] [DONE] Hubs/ChatHub.cs
- Add `senderType` parameter (`"customer"` | `"employee"`) to `SendMessage`.
- On a customer message, broadcast `NewMessageNotification` to all connected staff (hub group `"staff"`) so `web-crm` can show an unread badge.
- Validate `senderType` — reject unknown values with an `"Error"` response.

#### [NEW] [DONE] DTOs/Requests/EscalateConversationRequestDto.cs
- `{ string BotSummary }` — summary of the bot exchange to append to ticket description.

#### [NEW] [DONE] DTOs/Responses/EscalationResponseDto.cs
- `{ Guid TicketId, string ConversationGroupId, string Status }`.

#### [MODIFY] [DONE] Services/TicketService.cs
- Add `EscalateAsync(Guid ticketId, string botSummary)`:
  - Appends `botSummary` to the ticket `Description` field (delimited by `\n\n--- Bot Context ---\n`). No migration needed.
  - Confirms ticket is in `"Unclaimed"` queue.
  - Broadcasts `TicketEscalated` via `IDashboardBroadcastService`.

#### [MODIFY] [DONE] Interfaces/Services/ITicketService.cs
- Add `EscalateAsync(Guid ticketId, string botSummary)` signature.

#### [MODIFY] [DONE] Controllers/TicketsController.cs
- Add `POST /api/v1/tickets/{id}/escalate` — calls `ITicketService.EscalateAsync`.

#### [NEW] [DONE] Controllers/ConversationsController.cs
- `GET /api/v1/tickets/{id}/messages?since={timestamp}` — returns messages after a given timestamp for SignalR reconnection catch-up (delegates to `IMessageService.GetSinceAsync`).

#### [MODIFY] [DONE] Services/MessageService.cs
- Add `GetSinceAsync(Guid ticketId, DateTime since)` for reconnect recovery.

#### [MODIFY] [DONE] Interfaces/Services/IMessageService.cs
- Add `GetSinceAsync(Guid ticketId, DateTime since)` signature.

---

### Component 2 — `api-ai-analytics`

All new files follow route → service → repository layering.

#### [NEW] [DONE] app/api/v1/routes/chatbot.py
New router prefix `/chatbot`, tags `["chatbot"]`:

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/reply` | Optional (`customer_id` in body) | Unified bot reply |

**Request:**
```json
{
  "message": "string",
  "customer_id": "string | null",
  "ticket_id": "string | null",
  "conversation_history": [{"role": "customer|bot", "content": "string"}]
}
```
**Response:**
```json
{
  "reply": "string",
  "intent": "public_info | order_status | account_specific | escalate | faq",
  "should_escalate": false,
  "confidence": 0.9,
  "bot_summary": "string | null"
}
```

Logic:
- If `customer_id` is null → unauthenticated path (public info / FAQ only).
- If intent is `account_specific` and no `customer_id` → return login prompt, `should_escalate: false`.
- If intent is `escalate` or `confidence < threshold` → set `should_escalate: true`, generate `bot_summary`.
- If intent is `order_status` → call `oos_client` to look up order status.

#### [NEW] [DONE] app/services/chatbot_service.py
Orchestration service composing:
- `ConversationAnalyzer.detect_intent()` (existing) for intent classification.
- `GroqClient` for LLM-generated reply.
- `oos_client` for order status lookup when intent is `order_status`.
- Heuristic FAQ fallback (store hours, policies, return policy) when Groq is unavailable.

Methods:
- `async def reply(message, customer_id, ticket_id, history) → ChatbotReplyResult`
- `async def generate_bot_summary(history) → str`

#### [NEW] [DONE] app/schemas/chatbot_schemas.py
Pydantic models: `ChatbotReplyRequest`, `ChatbotReplyResponse`, `ChatHistoryEntry`.

#### [MODIFY] [DONE] app/api/v1/deps.py
- Add `get_chatbot_service()` dependency factory.

#### [MODIFY] [DONE] app/main.py
- Register `chatbot.router` under `/api/v1`.

---

### Component 3 — `web-crm`

#### [MODIFY] [DONE] ConversationWindow.tsx
- **Bot context panel:** When ticket description contains `--- Bot Context ---`, extract and render it in a collapsible "Bot Summary" section at the top of the conversation window.
- **Cancel-ticket action:** Expose cancel-ticket button within the conversation view (call existing cancel endpoint).
- **`senderType` tagging:** Pass `"employee"` as `senderType` when staff sends a message via `ChatHub.SendMessage`.

#### [MODIFY] [DONE] ConversationList.tsx
- **Unread badge:** Subscribe to `NewMessageNotification` SignalR event. On fire, increment unread count for the affected conversation and render a badge indicator.

#### [MODIFY] [DONE] Conversations.tsx
- Wire `NewMessageNotification` hub subscription at parent level so unread state is shared across child components.

> Note: "Real-time chat UI for messaging staff" and "Message/conversation details view" from the backlog are already covered by the existing 2.1 implementation. The remaining gaps are the bot summary panel, unread badge, and cancel button.

---

## File Summary

| File | Action | Service | Status |
|---|---|---|---|
| `Program.cs` | Modify — add CORS origin | `api-crm` | Done |
| `Hubs/ChatHub.cs` | Modify — senderType + notification | `api-crm` | Done |
| `DTOs/Requests/EscalateConversationRequestDto.cs` | New | `api-crm` | Done |
| `DTOs/Responses/EscalationResponseDto.cs` | New | `api-crm` | Done |
| `Services/TicketService.cs` | Modify — EscalateAsync | `api-crm` | Done |
| `Interfaces/Services/ITicketService.cs` | Modify — add signature | `api-crm` | Done |
| `Controllers/TicketsController.cs` | Modify — escalate endpoint | `api-crm` | Done |
| `Controllers/ConversationsController.cs` | New — reconnect messages endpoint | `api-crm` | Done |
| `Services/MessageService.cs` | Modify — GetSinceAsync | `api-crm` | Done |
| `Interfaces/Services/IMessageService.cs` | Modify — add signature | `api-crm` | Done |
| `app/api/v1/routes/chatbot.py` | New | `api-ai-analytics` | Done |
| `app/services/chatbot_service.py` | New | `api-ai-analytics` | Done |
| `app/schemas/chatbot_schemas.py` | New | `api-ai-analytics` | Done |
| `app/api/v1/deps.py` | Modify — add dependency | `api-ai-analytics` | Done |
| `app/main.py` | Modify — register router | `api-ai-analytics` | Done |
| `ConversationWindow.tsx` | Modify — bot summary, cancel, senderType, refactored subcomponents | `web-crm` | Done |
| `BotContextPanel.tsx` | New — extracted subcomponent | `web-crm` | Done |
| `MessageBubble.tsx` | New — extracted subcomponent | `web-crm` | Done |
| `ConversationList.tsx` | Modify — unread badge | `web-crm` | Done |
| `Conversations.tsx` | Modify — hub subscription | `web-crm` | Done |
| `app/repositories/mongo/chatbot_log_repository.py` | New — chatbot interaction logging | `api-ai-analytics` | Done |
| `app/schemas/chatbot_log_schemas.py` | New — chatbot log DTOs | `api-ai-analytics` | Done |
| `app/api/v1/routes/chatbot_logs.py` | New — chatbot logs GET endpoint | `api-ai-analytics` | Done |
| `useChatSignalR.ts` | Modify — pass senderType 'customer' | `web-shop` | Done |

---

## Test Plan

| Source file | Test file | Action | Status |
|---|---|---|---|
| `Services/TicketService.cs` (EscalateAsync) | `tests/Crm.Api.Tests/Services/TicketServiceTests.cs` | Extend | Done |
| `Services/MessageService.cs` (GetSinceAsync) | `tests/Crm.Api.Tests/Services/MessageServiceTests.cs` | Extend | Done |
| `Hubs/ChatHub.cs` | `tests/Crm.Api.Tests/Hubs/ChatHubTests.cs` | Extend | Done |
| `app/services/chatbot_service.py` | `tests/services/test_chatbot_service.py` | New | Done |
| `app/api/v1/routes/chatbot.py` | `tests/api/v1/routes/test_chatbot.py` | New | Done |
| `app/repositories/mongo/chatbot_log_repository.py` | `tests/repositories/mongo/test_chatbot_log_repository.py` | New | Done |
| `app/api/v1/routes/chatbot_logs.py` | `tests/api/v1/routes/test_chatbot_logs.py` | New | Done |

### Verification Steps

1. [x] `dotnet build` passes for `api-crm` with no errors.
2. [x] `pytest tests/services/test_chatbot_service.py tests/api/v1/routes/test_chatbot.py` pass for `api-ai-analytics`.
3. [x] **Manual — unauthenticated bot:** `POST /api/ai/chatbot/reply` with no `customer_id` + public question → valid reply, `should_escalate: false`.
4. [x] **Manual — escalation signal:** Low-confidence or explicit escalation intent → `should_escalate: true`, `bot_summary` populated.
5. [x] **Manual — CRM escalation endpoint:** `POST /api/v1/tickets/{id}/escalate` with bot summary → description updated, `200 OK`.
6. [x] **Manual — CORS:** `web-shop` origin (`https://localhost:3006`) connects to `/hubs/chat` without errors.
7. [x] **Manual — unread badge:** Customer message arrives → `NewMessageNotification` fires → badge increments in `web-crm`.
8. [x] **Manual — bot summary panel:** Open escalated ticket in `web-crm` → collapsible "Bot Summary" section renders.
