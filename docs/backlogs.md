# SentraCX — Product Backlog

**Stack:** .NET Web API (`api-crm`) · FastAPI (`api-ai-analytics`) · Next.js + Tailwind + shadcn/ui (`web-crm`)
**Related repo:** `br-online-shop` (`web-shop`, `web-oos`, `api-oos`) — cross-repo touchpoints are flagged with 🔗

Organized as Epics → User Stories → Tasks (Backend / Frontend split). Priority: P0 = MVP-critical, P1 = important, P2 = nice-to-have.

---

## EPIC 1: Ticketing (P0)

### 1.1 Internal ticket queue (Employee/Manager/Staff)
*Maps to: BR-CRM-02*

**Backend (`api-crm`)**
- [x] Design `ticket` data model: title, description, image (optional), status (unclaimed/available, claimed, completed, cancelled), assigned_to (user), created_by (customer), timestamps
- [x] `GET /api/tickets?status=unclaimed` — list available tickets
- [x] `GET /api/tickets?status=claimed&userId=` — list tickets claimed by user
- [x] `GET /api/tickets?status=completed&userId=` — list completed tickets
- [x] `GET /api/tickets/{id}` — ticket detail
- [x] `POST /api/tickets/{id}/claim`, `POST /api/tickets/{id}/unclaim`
- [x] Link ticket to its associated conversation thread for the "message" redirect

**Frontend (`web-crm`)**
- [x] Tickets module with tabs: Available (unclaimed), Claimed, Completed
- [x] Ticket details view on click
- [x] Claim / unclaim button on each ticket
- [x] "Message" button on a ticket that redirects to its conversation

### 1.2 Customer-raised tickets
*Maps to: BR-CRM-02*

**Backend (`api-crm`)**
- [x] `POST /api/tickets` — create ticket (title, description, image optional)
- [x] `GET /api/tickets/mine?status=pending|ongoing|completed|cancelled`
- [x] `PUT /api/tickets/{id}/cancel`
- [x] Image upload/storage handling for ticket attachments
- [x] Timestamp/audit logging on ticket submissions per NFR-CRM-02.4

**Frontend (`web-crm`)**
- [x] Ticket module with tabs: Pending, Ongoing, Completed, Cancel
- [x] "Create ticket" form: title, description, image (optional)
- [x] Ticket details view on click
- [x] Cancel-ticket action
- [x] "Message" button within each ticket component

---

## EPIC 2: Support Chat (P0)

### 2.1 Internal conversation inbox (Employee/Manager/Staff)
*Maps to: BR-CRM-03, BR-CRM-04*

**Backend (`api-crm`)**
- [x] Real-time messaging infrastructure (WebSocket/SignalR hub per conversation)
- [x] Design `conversation` and `message` data models, linked to the originating ticket
- [x] `GET /api/conversations?tab=unread|read|all`
- [x] `PUT /api/messages/{id}/read`, `PUT /api/messages/{id}/unread`
- [x] `POST /api/conversations/{id}/messages` — send message
- [x] `GET /api/messages/{id}` — message detail
- [x] Persist conversation history for a minimum of 1 year (NFR-CRM-03.3), restrict access to authorized participants only (NFR-CRM-03.2)

**Frontend (`web-crm`)**
- [x] Conversations module with tabs: Unread, Read, All
- [x] Active conversation list on the user's page (sourced from claimed tickets)
- [x] Mark-as-read / mark-as-unread control
- [x] Real-time chat UI: send and receive messages live
- [x] Message/conversation details view
- [x] "Completed" and "Unclaim" buttons inside the conversation view
- [x] Deep link: clicking the "message" button on a ticket routes here

### 2.2 Customer-facing chat
*Maps to: BR-CRM-03, BR-CRM-04*

**Backend (`api-crm`)**
- [ ] 🔗 Chat endpoint consumed directly by `br-online-shop`'s floating chat widget (`web-shop`) via the shared SignalR hub
- [ ] Bot-first flow — route to AI agent bot before offering human handoff (🔗 uses `api-ai-analytics` intent detection, see Epic 5)
- [ ] Chatbot integration: route incoming customer messages to an agent bot first
- [ ] Logic to detect when the bot's response is insufficient and prompt escalation to a live agent
- [ ] Escalation endpoint to hand off a conversation from bot to human staff
- [x] `PUT /api/tickets/{id}/cancel` reachable from within conversation view
- [x] Message detail endpoint

**Frontend (`web-crm`)**
- [ ] Real-time chat UI for messaging staff
- [ ] Bot-first chat experience: show the agent bot's responses before offering escalation
- [ ] "Talk to a real agent" prompt/option shown when the bot's response isn't sufficient
- [ ] Cancel-ticket action available inside the conversation view
- [ ] Message/conversation details view

---

## EPIC 3: Customer Profiles (P0)

### 3.1 Contacts & Leads
*Maps to: BR-CRM-01*

**Backend (`api-crm`)**
- [x] Design `customer` data model: type (contact/lead), first name, last name, email, phone (optional), customer type (vip, regular, institutional buyer, lead), status (active/inactive/suspended), address (optional), profile (optional), notes (optional), created_at
- [x] CRUD endpoints for customer contact and customer lead records
- [x] Endpoint to update customer status (active, inactive, suspended)
- [x] Endpoint to update customer type — enforce that a lead's type is always fixed to `"lead"` and cannot be changed until converted
- [x] Endpoint to delete a customer contact/lead
- [x] Endpoint to add/update notes on a customer profile
- [x] Endpoint returning customer overview (name, email, address, created_at, status, type, profile, top 5 most recent order history items, top 5 most recent marketing history items)
- [x] Paginated endpoint for a customer's marketing history
- [x] Paginated endpoint for a customer's order history — restrict to contacts only; leads excluded
- [x] Webhook/integration: auto-create a customer **contact** record on ecommerce website signup
- [x] Webhook/integration: auto-create a customer **lead** record when any lead-gen form is submitted

**Frontend (`web-crm`)**
- [x] Customer module with separate tabs for **contacts** and **leads**
- [x] Contact/lead list view showing name, email, phone (optional), customer type, created at
- [x] "Add new customer contact/lead" form
- [x] Delete customer contact/lead action (with confirmation)
- [x] Customer detail page with three tabs: **Overview**, **Marketing History**, **Order History**
- [x] Overview tab: display name, email, address, created at, status, customer type, profile, plus 5 most recent order/marketing history items
- [x] Status control: active / inactive / suspended
- [x] Customer type control: vip / regular / institutional buyer — disabled/locked for leads
- [x] Optional notes field/section on the customer profile
- [x] Marketing History tab: paginated list with details
- [x] Order History tab: paginated list — **hidden for leads**, shown only for contacts

---

## EPIC 4: Campaigns & Promotions (P0)

### 4.1 Campaigns
*Maps to: BR-CRM-05, BR-CRM-06*

**Backend (`api-crm`)**
- [x] Design `campaign` data model: title, subject, description, channels (email, in-app, facebook, twitter, instagram), schedule type (send now, scheduled, recurring), recurring days, images (optional), template reference, status (draft, active, ended)
- [x] CRUD endpoints for campaigns
- [x] Endpoints to list campaigns filtered by status: active, draft, history (ended)
- [x] Scheduling logic to send campaigns immediately, on a schedule, or recurring
- [x] Background job to auto-stop a campaign once its end date/schedule has elapsed
- [x] Draft save/update logic (partial campaign data allowed while in draft state)
- [x] Template storage and retrieval endpoints

**Frontend (`web-crm`)**
- [x] Campaigns module with three tabs: Campaign List, Campaign Drafts, Campaign History
- [x] "Create campaign" button/entry point
- [x] Create-campaign form: title, subject, description, channel selection, schedule options, optional image upload
- [x] Template picker within the create-campaign flow
- [x] "Save as draft" action

### 4.2 Promotions
*Maps to: BR-CRM-05*

**Backend (`api-crm`)**
- [x] Design `promotion` data model: title, description, promotion type (discount, voucher, free shipping, buy-one-get-one, cashback), discount value, voucher code, start date, end date, status (draft, active, cancelled, accomplished)
- [x] CRUD endpoints for promotions
- [x] Endpoints to list promotions by status: all/active, drafted, cancelled, accomplished
- [x] Background job or logic to auto-mark a promotion as "accomplished" once its end date passes
- [x] Field validation per promotion type

**Frontend (`web-crm`)**
- [x] Promotions views: all/active, drafted, cancelled, accomplished
- [x] Create-promotion form with all fields
- [x] "Save as draft" action for promotions
- [x] Edit/update UI for a drafted promotion
- [x] Stop/cancel action for an active promotion

### 4.3 Campaign–Promotion Linking

**Backend (`api-crm`)**
- [x] Many-to-many relationship between `campaign` and `promotion`
- [x] Endpoint to attach/select multiple promotions under a single campaign

**Frontend (`web-crm`)**
- [x] Multi-select promotion picker inside the campaign create/edit form

---

## EPIC 5: AI-Analytics — Customer Intelligence (P1)

### 5.1 Customer Segmentation

**Backend (`api-ai-analytics`)**
- [x] Segment customers (New, High-Value, At-Risk, Dormant, Loyal) using order history 🔗 from `api-oos`, engagement/activity from `api-crm`
- [x] `GET /api/ai/customers/{id}/segment` → `{ segment, computed_at, confidence }`
- [x] Scheduled recalculation job
- [x] Hot-read from Redis cache, invalidated on recalculation

**Frontend (`web-crm`)**
- [x] Segment badge on customer profile
- [x] Filter/sort customer list by segment

### 5.2 Churn / At-Risk Prediction

**Backend (`api-ai-analytics`)**
- [x] Score churn risk from 🔗 order frequency decline, negative ticket sentiment, inactivity
- [x] `GET /api/ai/customers/{id}/churn-score` → `{ score, risk_level, contributing_factors[], computed_at }`
- [x] Configurable risk threshold (admin-settable via Epic 8)
- [x] Hot-read from Redis with TTL

**Frontend (`web-crm`)**
- [x] Churn score + risk flag on customer profile
- [x] Sort/filter by churn risk

### 5.3 Customer Lifetime Value (CLV) Prediction

**Backend (`api-ai-analytics`)**
- [x] Predict CLV from 🔗 purchase history and behavior patterns
- [x] `GET /api/ai/customers/{id}/clv` → `{ predicted_clv, currency, computed_at }`
- [x] Hot-read from Redis cache

**Frontend (`web-crm`)**
- [x] CLV display on customer profile
- [x] Sort customers by predicted CLV

### 5.4 Next-Best-Action Recommendation

**Backend (`api-ai-analytics`)**
- [x] Generate recommended action from segment + churn + CLV outputs
- [x] `GET /api/ai/customers/{id}/next-action` → `{ action, reason, confidence, computed_at }`
- [x] `POST /api/ai/customers/{id}/next-action/feedback` → log accept/dismiss/complete for model tuning
- [x] Hot-read from Redis, feedback persisted to MongoDB

**Frontend (`web-crm`)**
- [x] Recommendation card on customer profile with accept/dismiss/complete actions

---

## EPIC 6: AI-Analytics — Tickets & Conversations (P1)

### 6.1 Ticket Intelligence

**Backend (`api-ai-analytics`)**
- [x] `POST /api/ai/tickets/analyze` → `{ sentiment, category, priority_score, confidence }` (called synchronously by `api-crm` on ticket creation)
- [x] Sentiment: classify positive/neutral/negative; fallback to "Neutral/Unclassified" on low confidence
- [x] Auto-categorization: tag ticket type (billing, shipping, technical, complaint, refund); fallback to "Uncategorized" + manual tagging on low confidence
- [x] Urgency/priority: combine sentiment + CLV + content into priority score; configurable weights (admin-settable)
- [x] `GET /api/ai/tickets/{id}/resolution-estimate` → `{ estimated_hours, confidence }`
- [x] `GET /api/ai/tickets/volume-forecast?range=` → `{ forecast_series[], threshold, alert_triggered }`

**Frontend (`web-crm`)**
- [x] Sentiment badge on ticket list/detail; filter tickets by sentiment
- [x] Category tag on ticket, manual override control; filter by category
- [x] Priority badge on ticket list, sort by priority
- [x] Estimated resolution time on ticket detail
- [x] Forecast chart (dashboard); threshold-based alert

### 6.2 Conversation Intelligence

**Backend (`api-ai-analytics`)**
- [x] `POST /api/ai/conversations/{id}/analyze-message` → real-time sentiment + escalation flag (per message via SignalR hub)
- [x] `GET /api/ai/conversations/{id}/summary` → on-demand + Redis-cached summary, regenerate flag
- [x] `POST /api/ai/conversations/{id}/suggest-replies` → suggestion list
- [x] `POST /api/ai/conversations/{id}/detect-intent` → intent label + confidence
- [x] `GET /api/ai/conversations/{id}/entities` → extracted entities, 🔗 order numbers cross-referenced to `api-oos`

**Frontend (`web-crm`)**
- [x] Escalation indicator in conversation view
- [x] Summary panel at top of conversation view, regenerate action
- [x] Suggestion chips — select / edit / dismiss
- [x] Detected intent shown in conversation view
- [x] Extracted entities panel alongside conversation, clickable order number

### 6.3 AI Chatbot / Virtual Assistant

**Backend (`api-ai-analytics` + `api-crm`)**
- [ ] FAQ handling, order status lookup (🔗 `api-oos`), simple request handling
- [ ] Escalation to human agent via Epic 2.2 flow when bot can't resolve
- [ ] Log chatbot conversations for quality review

**Frontend (`web-shop` 🔗)**
- [ ] Chatbot widget lives in `br-online-shop`, calls `api-ai-analytics`/`api-crm` endpoints

---

## EPIC 7: AI-Analytics — Campaigns (P2)

- [ ] Lead/customer scoring for targeting
- [ ] Send-time optimization
- [ ] Campaign performance prediction (forecast open/click/conversion rate)
- [ ] AI-generated content suggestions (LLM subject line / copy)
- [ ] Frontend: Audience builder, send-time toggle, forecast panel, suggestion picker

---

## EPIC 8: Dashboard, Forecasting & Predictive Analytics (P1)

### 8.1 KPI Metric Cards

**Backend (`api-ai-analytics`)**
- [x] `GET /api/ai/dashboard/summary?from=&to=` → combined metrics (MongoDB aggregation pipeline)
- [ ] Extend summary response to include: `active_tickets`, `avg_resolution_hours`, `churn_rate`, `avg_clv`, `avg_sentiment`, `active_campaigns`, each with `delta_vs_previous_period`

**Frontend (`web-crm`)**
- [x] Dashboard page with date range filter
- [ ] KPI cards row: Active Tickets, Avg Resolution Time, Churn Rate, Avg CLV, Customer Sentiment, Active Campaigns
- [ ] Each card shows value + trend indicator (↑↓) + delta vs. previous period
- [ ] Cards fetch from `/api/ai/dashboard/summary` with selected date range

### 8.2 Ticket Volume Forecasting

**Backend (`api-ai-analytics`)**
- [ ] `GET /api/ai/forecasts/ticket-volume?range=7d|14d|30d` → `{ historical_series[], forecast_series[], confidence_band_upper[], confidence_band_lower[], threshold, alert_triggered }`
- [ ] Time-series model (Prophet or simple ARIMA) trained on historical ticket volume from MongoDB
- [ ] Factor in scheduled campaigns (campaign launches historically spike ticket volume)
- [ ] Configurable staffing threshold — alert when forecast exceeds capacity

**Frontend (`web-crm`)**
- [ ] Area chart: solid line for historical, dashed line for forecast, shaded confidence band
- [ ] Threshold line overlay showing staffing capacity
- [ ] Alert banner: "⚠️ Predicted ticket spike in X days — exceeds current capacity by Y%"

### 8.3 Revenue & CLV Forecasting

**Backend (`api-ai-analytics`)**
- [ ] `GET /api/ai/forecasts/revenue?range=30d|90d|12m` → `{ forecast_series[], by_segment{}, total_projected, confidence }`
- [ ] Aggregate CLV predictions across active customer base, grouped by segment
- [ ] Project revenue trajectory based on current customer mix + churn rate

**Frontend (`web-crm`)**
- [ ] Bar chart: projected revenue per segment (High-Value, Regular, New, At-Risk)
- [ ] Trend line showing revenue trajectory over selected range
- [ ] Summary card: "Projected 90-day revenue: $X (±Y%)"

### 8.4 Churn Risk Distribution & Trend

**Backend (`api-ai-analytics`)**
- [ ] `GET /api/ai/forecasts/churn-distribution` → `{ low: count, medium: count, high: count, critical: count, trend_series[] }`
- [ ] Aggregate all customer churn scores into risk buckets
- [ ] Weekly trend of how the distribution shifts over time

**Frontend (`web-crm`)**
- [ ] Donut chart: customer base breakdown by churn risk level (Low / Medium / High / Critical)
- [ ] Line chart overlay: risk distribution trend over past 4–8 weeks
- [ ] Clickable segments → filter customer list to that risk bucket

### 8.5 Sentiment Trend Analysis

**Backend (`api-ai-analytics`)**
- [ ] `GET /api/ai/forecasts/sentiment-trend?range=7d|30d|90d` → `{ daily_scores[], moving_average[], forecast_next_7d[] }`
- [ ] Compute daily average sentiment from conversation transcripts
- [ ] Simple trend extrapolation for next 7 days

**Frontend (`web-crm`)**
- [ ] Line chart: daily sentiment score + 7-day moving average + forecast extension
- [ ] Alert indicator when sentiment trends below configurable threshold

### 8.6 Campaign Performance Prediction

**Backend (`api-ai-analytics`)**
- [ ] `GET /api/ai/forecasts/campaign/{id}/performance` → `{ predicted_open_rate, predicted_click_rate, predicted_conversion_rate, confidence, similar_campaigns[] }`
- [ ] Predict performance for active/scheduled campaigns based on historical campaign data, audience segment, channel, and send time
- [ ] Reference similar past campaigns as supporting evidence

**Frontend (`web-crm`)**
- [ ] Prediction panel on campaign detail page (pre-send): estimated open/click/conversion rates
- [ ] Confidence indicator + list of similar historical campaigns and their actual performance
- [ ] Dashboard widget: active campaigns with predicted vs. actual performance (post-send)

### 8.7 At-Risk Customer Watchlist

**Backend (`api-ai-analytics`)**
- [ ] `GET /api/ai/dashboard/at-risk-customers?limit=10` → top N customers by churn score with `{ customer_id, name, churn_score, risk_level, contributing_factors[], recommended_action }`
- [ ] Combines churn model output + next-best-action into a prioritized list

**Frontend (`web-crm`)**
- [ ] Table/card list: top at-risk customers with score, factors, and recommended action
- [ ] Each row clickable → navigates to customer profile
- [ ] Quick-action button (e.g., "Send retention offer", "Assign to support") that triggers next-best-action

### 8.8 Anomaly Detection & Alerts

**Backend (`api-ai-analytics`)**
- [x] `GET /api/ai/anomalies?from=&to=&status=` → anomaly list with severity
- [ ] Expand anomaly types: ticket volume spike, sentiment drop, churn rate elevation, unusual order cancellations (🔗 `api-oos`), engagement drop
- [ ] `POST /api/ai/anomalies/{id}/acknowledge` — mark as reviewed
- [ ] Severity auto-classification: low / medium / high / critical

**Frontend (`web-crm`)**
- [x] Anomaly feed on dashboard
- [ ] Anomaly cards with severity badge, description, detected time, and acknowledge/dismiss actions
- [ ] Critical anomalies trigger a toast notification on any dashboard page
- [ ] Filter by type, severity, status (open/acknowledged)

### 8.9 Staffing Capacity Alert

**Backend (`api-ai-analytics`)**
- [ ] `GET /api/ai/forecasts/staffing-alert` → `{ forecast_volume, current_capacity, surplus_or_deficit, alert_level, recommended_action }`
- [ ] Compare ticket volume forecast (8.2) against configured staff count / avg tickets-per-agent
- [ ] Config: `GET/PUT /api/ai/config/staffing-capacity` (agents available, avg handle time)

**Frontend (`web-crm`)**
- [ ] Staffing alert card on dashboard: "You have X agents available; forecast predicts Y tickets in next 7 days — Z% over capacity"
- [ ] Recommendation: "Consider scheduling N additional agents on [date]"

### 8.10 Natural Language Query

**Backend (`api-ai-analytics`)**
- [x] `POST /api/ai/query` → natural-language query → structured result (Groq LLM)

**Frontend (`web-crm`)**
- [x] NL query input box
- [ ] Results displayed as table, chart, or single-value depending on query type
- [ ] Query history / saved queries for common questions
- [ ] Suggested queries: "Show me customers at high churn risk", "Ticket volume last 7 days", "Top performing campaign this month"

### 8.11 Real-Time Live Metrics

**Backend (`api-crm`)**
- [ ] SignalR event `DashboardMetricsUpdated` — broadcast on ticket create/claim/complete, new conversation, escalation
- [ ] Lightweight payload: `{ active_tickets, pending_escalations, unread_conversations, online_agents }`

**Frontend (`web-crm`)**
- [ ] Live indicator panel (top of dashboard or sidebar): tickets in queue, pending escalations, unread conversations
- [ ] Numbers update in real time via SignalR subscription — no polling
- [ ] Pulse animation on change to draw attention

---

## EPIC 9: Admin Configuration (P1)

**Backend (`api-ai-analytics`)**
- [x] `GET/PUT /api/ai/config/churn-threshold`
- [x] `GET/PUT /api/ai/config/priority-weights`
- [x] `GET/PUT /api/ai/config/anomaly-sensitivity`
- [x] `GET/PUT /api/ai/config/confidence-thresholds`
- [x] Config stored in MongoDB `config` collection, hot-read cached in Redis
- [x] Config changes audit-logged

**Frontend (`web-crm`)**
- [x] Admin settings page — thresholds/weights, restricted to manager/admin roles

---

## EPIC 10: Model Lifecycle & Data Governance (P1)

- [x] Model versioning scheme (semantic version per model, stored with each prediction)
- [x] Retraining cadence defined per model (churn/CLV monthly, sentiment as-needed)
- [x] PII handling policy — role-based access, redaction/anonymization before external LLM calls
- [x] MongoDB TTL indexes or scheduled cleanup for data retention
- [x] Model inputs/outputs documented per feature for audit

---

## EPIC 11: Data Ingestion & Storage (P0 — Foundation)

- [x] Ingestion pattern decided: scheduled batch sync (nightly) for heavy historical data from `api-oos`, event-driven via Redis Pub/Sub for real-time needs
- [x] Relational → document transform (ETL): Pydantic models validate/transform incoming DTOs
- [x] MongoDB collection schemas designed (customers, orders, tickets, conversations, ai_scores)
- [x] `OrderIngestionService` — pulls `OrderSyncDto` payloads, writes transformed documents to MongoDB
- [x] Ticket/conversation ingestion consumer from `api-crm`
- [x] Redis usage: cache hot AI outputs with TTL, rate-limiting/circuit-breaker state, short-TTL conversation state, Pub/Sub for real-time events
- [x] Data freshness: each AI output includes `computed_at` timestamp; max staleness defined per feature
- [ ] Frontend: Show "last updated" indicator next to AI-derived values

---

## EPIC 12: Feedback & Ratings (P0)
*Maps to: BR-CRM-07*

**Backend (`api-crm`)**
- [ ] 🔗 `GET /api/products/{id}/feedback` — reads product identity from `api-oos`, stores feedback in `api-crm`
- [ ] `POST /api/products/{id}/feedback` — submit feedback + rating (max 500 chars, 1–5 stars)
- [ ] Validation: 500 char max, 1–5 star range, one review per user per product

**Frontend (`web-crm`)**
- [ ] Average rating + feedback list on product page
- [ ] Submit feedback form (star selector, textarea, char counter)
- [ ] Display rating, feedback text, and date only

---

## Cross-Cutting Concerns

### Role-Based Access Control
*Maps to: BR-CRM-08*

- [ ] Design role model: Admin, CEO, Manager, Support, Marketing
- [ ] Middleware/guard to enforce role-based permissions on every endpoint
- [ ] Admin endpoints to assign/manage user roles
- [ ] Data encryption in transit and at rest for customer data (NFR-CRM-01.2)

### API Contracts

- [x] FastAPI auto-generated OpenAPI spec at `/openapi.json`
- [ ] Generate shared TypeScript types for `web-crm` from FastAPI OpenAPI spec
- [ ] Version the API (`/api/ai/v1/...`) so clients aren't broken by model iteration

### Confidence & Fallback (implemented)

- [x] Every scoring/classification response includes a `confidence` value (0–1)
- [x] Per-feature confidence threshold below which output is withheld or marked "Unclassified"
- [x] Circuit breaker + timeout policy on all `api-ai-analytics` calls made by `api-crm`
- [x] Frontend: UI distinguishes AI-suggested values from confirmed/manual values; "AI unavailable" state

---

## Open Items

- [ ] Resolve system-of-record conflict: product reviews exist in both this backlog (Epic 12) and `br-online-shop` Epic 5.4
- [ ] Campaign AI features (Epic 7) require new endpoints not yet defined in API contracts

