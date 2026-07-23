# SentraCX — `api-ai-analytics` Enhanced Backlog

**Stack:** Python (FastAPI) · MongoDB (primary store) · Redis (cache / pub-sub / rate-limit state)
**Note — polyglot architecture:** `api-crm` and `api-oos` are .NET Web API + relational DB (SQL Server/PostgreSQL). `api-ai-analytics` is a separate Python service with its own document store. All cross-service communication is over HTTP/REST or a message broker — never shared DB access.

This backlog goes one layer deeper than the feature list: it defines **where the data comes from, how it's transformed and stored, what the service exposes, how it behaves when uncertain, and who controls its thresholds.** This is the prerequisite for the integration backlog.

Priority: P0 = MVP-critical, P1 = important, P2 = nice-to-have.

---

## EPIC A: Data Ingestion & Storage Strategy (P0)

**A.1 Decide ingestion pattern**

- [x] Decide per data source: event-driven (message broker) vs. scheduled batch sync vs. on-demand API pull
- [x] Recommendation to evaluate: scheduled batch sync (nightly) for heavy historical data (orders, purchase history from `api-oos`), event-driven via broker for near-real-time needs (ticket/conversation sentiment)
- [x] Decide message broker if event-driven is chosen (Redis Streams/Pub-Sub — already in stack — vs. adding RabbitMQ/Kafka/Azure Service Bus). Redis Pub/Sub recommended for MVP since it's already a dependency; revisit if durability/replay guarantees become necessary
- [x] Document decision + rationale in `/docs/ai/ingestion-strategy.md`

**A.2 Relational → document transform (ETL)**

- [x] Backend: Since `api-oos`/`api-crm` are relational (.NET/SQL) and `api-ai-analytics` is MongoDB, define an explicit transform step — no 1:1 table-to-collection copy
- [x] Backend: Design MongoDB collection schemas (e.g., `customers`, `orders`, `tickets`, `conversations`, `ai_scores`) — denormalized/embedded where it suits read patterns, since Mongo isn't relational
- [x] Backend: Build `OrderIngestionService` (Python) — pulls/receives `OrderSyncDto` payloads (JSON over REST or from broker) and writes transformed documents to MongoDB
- [x] Backend: Same pattern for ticket/conversation ingestion from `api-crm`
- [x] Backend: Use Pydantic models for validating/transforming incoming DTOs before persistence

**A.3 Order/purchase data from `api-oos`** 🔗

- [x] Backend: Define read contract — `api-ai-analytics` calls `api-oos`'s internal REST endpoint, or `api-oos` publishes events it subscribes to
- [x] Backend: Define minimum fields needed: order id, customer id, order date, total, status, line items, cancellation flag
- [x] Backend: Sync job (Python — APScheduler, Celery beat, or a scheduled Azure/cron function) with retry + failure logging
- [x] Backend: Store transformed data in MongoDB — do not query `api-oos` live for every score calculation
- [x] Backend: Define sync cadence (e.g., nightly for CLV/segmentation, more frequent for anomaly detection)

**A.4 Ticket/conversation data from `api-crm`** 🔗

- [x] Backend: Define read contract — internal REST call to `api-crm` vs. event stream (no shared DB access, since `api-crm` is SQL-based and separate)
- [x] Backend: Define minimum fields needed: ticket id, customer id, category, status, timestamps, message text
- [x] Backend: Build ingestion consumer for ticket/conversation events
- [x] Backend: Real-time features (sentiment analysis, real-time tracking, smart replies) must be synchronous/event-driven, not batch — define latency SLA (e.g., under 2s), likely backed by Redis for low-latency state

**A.5 Data freshness & staleness handling**

- [x] Backend: Each AI output document includes a `computed_at` timestamp
- [x] Backend: Define max staleness per feature (e.g., churn score OK if <24h old; real-time sentiment must be <5s old)
- [ ] Frontend (`web-crm`): Show "last updated" indicator next to AI-derived values

**A.6 Redis usage strategy**

- [x] Backend: Cache hot AI outputs (churn score, CLV, segment) in Redis with TTL matching the staleness policy (A.5) — avoids re-querying MongoDB/re-running inference on every `api-crm`/`web-crm` request
- [x] Backend: Use Redis for rate-limiting/circuit-breaker state on cross-service calls (shared with Epic Q of the integration backlog)
- [x] Backend: Use Redis for short-TTL chatbot session/conversation state (Epic 5.11 features)
- [x] Backend: Use Redis Pub/Sub (or Streams if replay is needed) for real-time sentiment/escalation events if event-driven ingestion (A.1) is chosen
- [x] Backend: Document cache invalidation strategy — when does a fresh score computation bust the Redis cache

---

## EPIC B: API Contracts Exposed by `api-ai-analytics` (P0)

FastAPI auto-generates the OpenAPI/Swagger spec from route + Pydantic model definitions — this becomes the source of truth for contract generation (see Epic P of the integration backlog).

**B.1 Customer Profile endpoints**

- [x] `GET /api/ai/customers/{customer_id}/segment` → `{ segment, computed_at, confidence }`
- [x] `GET /api/ai/customers/{customer_id}/churn-score` → `{ score, risk_level, contributing_factors[], computed_at }`
- [x] `GET /api/ai/customers/{customer_id}/clv` → `{ predicted_clv, currency, computed_at }`
- [x] `GET /api/ai/customers/{customer_id}/next-action` → `{ action, reason, confidence, computed_at }`
- [x] `POST /api/ai/customers/{customer_id}/next-action/feedback` → log accept/dismiss/complete for model tuning

**B.2 Ticket endpoints**

- [x] `POST /api/ai/tickets/analyze` → input: ticket text/id; output: `{ sentiment, category, priority_score, confidence }` (called synchronously by `api-crm` on ticket creation)
- [x] `GET /api/ai/tickets/{ticket_id}/resolution-estimate` → `{ estimated_hours, confidence }`
- [x] `GET /api/ai/tickets/volume-forecast?range=` → `{ forecast_series[], threshold, alert_triggered }`

**B.3 Conversation endpoints**

- [x] `POST /api/ai/conversations/{id}/analyze-message` → real-time sentiment + escalation flag (called per message by `api-crm`'s SignalR hub)
- [x] `GET /api/ai/conversations/{id}/summary` → on-demand + Redis-cached summary, regenerate flag
- [x] `POST /api/ai/conversations/{id}/suggest-replies` → suggestion list
- [x] `POST /api/ai/conversations/{id}/detect-intent` → intent label + confidence
- [x] `GET /api/ai/conversations/{id}/entities` → extracted entities, 🔗 order numbers cross-referenced to `api-oos`

**B.4 Dashboard/aggregate endpoints**

- [x] `GET /api/ai/dashboard/summary?from=&to=` → combined churn/sentiment/campaign/ticket metrics (MongoDB aggregation pipeline)
- [x] `GET /api/ai/anomalies?from=&to=&status=` → anomaly list with severity
- [x] `POST /api/ai/query` → natural-language query → structured result

**B.5 Contract documentation**

- [x] Backend: Publish FastAPI's auto-generated OpenAPI spec at a stable path (`/openapi.json`)
- [ ] Backend: 🔗 Generate shared TypeScript types for `web-crm` from the FastAPI OpenAPI spec (same tooling as `br-online-shop`'s `openapi-typescript` approach)
- [ ] Backend: Version the API (e.g., `/api/ai/v1/...`) so `api-crm`/`web-crm` aren't broken by model iteration

---

## EPIC C: Confidence, Fallback & Degradation (P0)

- [x] Backend: Every scoring/classification response includes a `confidence` value (0–1)
- [x] Backend: Define per-feature confidence threshold below which output is withheld or marked "Unclassified"/"Uncategorized"
- [x] Backend: Ticket auto-categorization falls back to "Uncategorized" + manual tagging when confidence is low
- [x] Backend: Sentiment falls back to "Neutral/Unclassified" (not silently guessing) when confidence is low
- [x] Backend: Define behavior when `api-ai-analytics` is down/unreachable — `api-crm`/`web-crm` (both .NET/JS clients) must degrade gracefully (e.g., ticket creation still succeeds without AI tagging)
- [x] Backend: Circuit breaker + timeout policy on all `api-ai-analytics` calls made by `api-crm` (e.g., Polly in .NET for the caller side), backed by Redis-stored breaker state on the `api-ai-analytics` side for coordinated status
- [x] Frontend: UI clearly distinguishes AI-suggested values from confirmed/manual values, and shows an "AI unavailable" state instead of blank/broken UI

---

## EPIC D: Admin Configuration (P1)

- [x] Backend: `GET/PUT /api/ai/config/churn-threshold`
- [x] Backend: `GET/PUT /api/ai/config/priority-weights`
- [x] Backend: `GET/PUT /api/ai/config/anomaly-sensitivity`
- [x] Backend: `GET/PUT /api/ai/config/confidence-thresholds`
- [x] Backend: Config stored in MongoDB `config` collection, hot-read copy cached in Redis for low-latency access during scoring
- [x] Backend: Config changes audit-logged (who changed what, when)
- [x] Frontend (`web-crm`): Admin settings page — thresholds/weights, restricted to manager/admin roles

---

## EPIC E: Model Lifecycle & Data Governance (P1)

- [x] Backend: Model versioning scheme (e.g., semantic version per model, stored with each prediction document for traceability)
- [x] Backend: Retraining cadence defined per model (e.g., churn/CLV monthly, sentiment as-needed)
- [x] Backend: PII handling policy — churn score, CLV, and segmentation are sensitive; define role-based access, and whether raw PII is sent to any external LLM provider
- [x] Backend: If using a third-party LLM API (content suggestions, NL query, summarization) — define redaction/anonymization before sending customer text externally
- [x] Backend: MongoDB TTL indexes or scheduled cleanup for data retention policy on analyzed conversation/ticket text
- [x] Docs: Document model inputs/outputs per feature for audit purposes

---

## EPIC F: Feature Backlog (carried over, now dependent on A–E)

**F.1 Customer Profiles (from Epic 4)**
- [x] **Customer segmentation**: Implements `GET /api/ai/customers/{id}/segment` (B.1). Fallback: Mark as "Unclassified" if confidence is below threshold (C). Config: Uses `confidence-thresholds` (D). Storage: Hot-read from Redis cache (A.6), invalidated on recalculation.
- [x] **Churn / at-risk prediction**: Implements `GET /api/ai/customers/{id}/churn-score` (B.1). Fallback: Output withheld/Unclassified on low confidence (C). Config: Uses `churn-threshold` (D). Storage: Hot-read from Redis with TTL (A.6).
- [x] **CLV prediction**: Implements `GET /api/ai/customers/{id}/clv` (B.1). Config: Uses `confidence-thresholds` (D). Storage: Hot-read from Redis cache (A.6).
- [x] **Next-best-action**: Implements `GET /api/ai/customers/{id}/next-action` and feedback `POST` (B.1). Fallback: Includes `confidence` score (C). Storage: Hot-read from Redis, with feedback actions directly persisted to MongoDB.

**F.2 Tickets & Conversations (from Epic 5)**
- [x] **Sentiment analysis**: Implements `POST /api/ai/tickets/analyze` (B.2). Fallback: "Neutral/Unclassified" when confidence is low (C). Config: Uses `confidence-thresholds` (D). Storage: Synchronous execution, directly reading/writing to MongoDB without hot cache.
- [x] **Auto-categorization**: Implements `POST /api/ai/tickets/analyze` (B.2). Fallback: "Uncategorized" + manual tagging on low confidence (C). Config: Uses `confidence-thresholds` (D). Storage: Synchronous execution, directly reading/writing to MongoDB.
- [x] **Urgency/priority scoring**: Implements `POST /api/ai/tickets/analyze` (B.2). Fallback: Confidence value included (C). Config: Uses admin-defined `priority-weights` (D). Storage: Synchronous execution.
- [x] **Resolution time prediction**: Implements `GET /api/ai/tickets/{id}/resolution-estimate` (B.2). Fallback: Included confidence score (C). Storage: MongoDB.
- [x] **Ticket volume forecasting**: Implements `GET /api/ai/tickets/volume-forecast?range=` (B.2). Config: Alert triggered based on `anomaly-sensitivity` (D). Storage: MongoDB aggregation pipeline.
- [x] **Real-time sentiment tracking**: Implements `POST /api/ai/conversations/{id}/analyze-message` (B.3). Fallback: Escalation flag when sentiment trends negative; degradation via circuit breaker if unavailable (C). Storage: Uses Redis for low-latency state and pub/sub events (A.6).
- [x] **Auto-summarization**: Implements `GET /api/ai/conversations/{id}/summary` (B.3). Storage: On-demand + Redis-cached summary (B.3).
- [x] **Smart reply suggestions**: Implements `POST /api/ai/conversations/{id}/suggest-replies` (B.3). Fallback: Graceful degradation if AI down (C). Storage: Short-TTL Redis cache (A.6).
- [x] **Intent detection**: Implements `POST /api/ai/conversations/{id}/detect-intent` (B.3). Config: Uses `confidence-thresholds` (D) to determine bot vs. human handoff. Storage: Real-time.
- [x] **Key entity/topic extraction**: Implements `GET /api/ai/conversations/{id}/entities` (B.3). Storage: MongoDB.
- [x] **AI chatbot (virtual assistant)**: Uses above B.3 endpoints. Fallback: Escalates to human agent when intent/confidence is low (C). Storage: Uses Redis for short-TTL conversation state (A.6).

**F.3 Campaigns (from Epic 6 - P2)**
- [ ] *Note: Campaign endpoints are not defined in Epic B.* They will require new endpoints (e.g., `GET /api/ai/campaigns/{id}/forecast`), reading from MongoDB, utilizing `confidence-thresholds` (D).

**F.4 Dashboard (from Epic 7)**
- [x] **Unified dashboard**: Implements `GET /api/ai/dashboard/summary?from=&to=` (B.4). Storage: MongoDB aggregation pipeline (B.4).
- [x] **Campaign ROI / trend analytics**: Sourced from `GET /api/ai/dashboard/summary?from=&to=` (B.4). Storage: MongoDB aggregation.
- [x] **Anomaly detection**: Implements `GET /api/ai/anomalies?from=&to=&status=` (B.4). Config: Uses `anomaly-sensitivity` (D). Storage: MongoDB aggregation.
- [x] **Natural language query**: Implements `POST /api/ai/query` (B.4). Fallback: Standardized "no results" handling when confidence is extremely low (C).

---

## Suggested Build Order

| Phase | Focus |
|---|---|
| 1 | Epic A (ingestion strategy, ETL transform, MongoDB schema, Redis usage plan) |
| 2 | Epic B (API contracts) + Epic C (confidence/fallback) — built together per feature |
| 3 | Epic D (admin config) |
| 4 | Epic F feature implementation against stable contracts |
| 5 | Epic E (governance/model lifecycle) — parallel track, needed before production |
| 6 | Dashboard (Epic 7 in CRM backlog) — consumes B.4 aggregate endpoints |

---
