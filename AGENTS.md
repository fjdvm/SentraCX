# SentraCX - Customer Experience & Relationship Management System

This file gives AI coding agents (Antigravity, Cursor, Copilot, etc.) the minimum context
needed for *any* task in this repo. It is intentionally short. Detailed, situational rules
live in `.agents/skills/` — load the relevant file(s) from there before starting work on a
matching area. Don't load skill files you don't need for the current task.

## 1. Project Overview

SentraCX is composed of **three independently deployable applications** that communicate only
over HTTP APIs — never shared code, never shared DB connections:

1. **CRM** (`apps/api-crm`) — .NET / C# (net10.0). System of record: customer profiles,
   campaigns, tickets, real-time support chat. PostgreSQL primary store.
2. **AI-Analytics** (`apps/api-ai-analytics`) — Python / FastAPI. Consumes CRM data via API,
   produces predictions/insights (churn, CLV, sentiment, NBA, ticket intelligence).
   MongoDB + Redis.
3. **Web** (`apps/web-crm`) — Next.js 16 / React 19. Calls both APIs.

## 2. Tech Stack (quick reference)

| Service | Stack | Datastore |
|---|---|---|
| CRM | .NET 10 / C# | PostgreSQL (EF Core) |
| AI-Analytics | Python 3.12 / FastAPI | MongoDB + Redis |
| Frontend | Next.js 16, React 19 | — |

Package manager: **npm only** (never pnpm/yarn) — `package.json` workspaces.
UI: shadcn/ui (`new-york`, `neutral`) + Tailwind v4 (OKLCH vars in `globals.css`) +
lucide-react (only icon lib) + Hanken Grotesk/Geist Mono fonts. Auth: NextAuth.js v5 (Beta) +
external OIDC (`authservice`); local dev has auth bypass in `src/auth.ts`. LLM: Groq API
(`llama-3.1-8b-instant`) via `app/lib/groq_client.py`, all AI features have heuristic fallback.
Design reference: check `.design-ref/` before building new UI — ask before improvising if no
match exists.

## 3. Global Rules (apply everywhere, no exceptions)

- **~200-line hard cap per file.** Approaching it = extract, don't keep writing.
- **One concern per file** — one component/hook/service/repository/route module.
- **No cross-feature reaching** — shared logic goes into an explicit shared/common location.
- Don't add a new database/storage tech without a documented reason (see
  `.agents/skills/data-architecture/SKILL.md`).
- Don't let CRM and AI-Analytics import each other's code, share a DB connection, or query
  each other's databases directly — only REST APIs.
- Don't invent API endpoints, folder paths, or config values not confirmed in this repo —
  flag the gap instead of guessing.
- Don't skip committing after a completed task; don't bundle unrelated tasks into one commit.
- Never use `pnpm`/`yarn`. Never hardcode colors (use `globals.css` tokens). Never add another
  icon library. Never hand-roll a UI primitive shadcn already provides.
- New business logic requires a test in the same PR (see `.agents/skills/testing/SKILL.md`).

## 4. Skill Index — load only what the current task needs

| Load this file when you're... | File |
|---|---|
| Adding/changing where data is stored (new table, cache, collection) | `.agents/skills/data-architecture/SKILL.md` |
| Wiring CRM ↔ AI-Analytics, or adding a sync mechanism | `.agents/skills/cross-service-communication/SKILL.md` |
| Committing, branching, or opening a PR | `.agents/skills/git-and-pr-workflow/SKILL.md` |
| Starting/running a service locally | `.agents/skills/dev-setup/SKILL.md` |
| Writing or running tests | `.agents/skills/testing/SKILL.md` |
| Asked to produce a plan, bug-fix report, or implementation report | `.agents/skills/planning-and-report/SKILL.md` |
| Editing anything under `apps/web-crm` | `.agents/skills/web-nextjs-structure/SKILL.md` |
| Editing anything under `apps/api-crm` | `.agents/skills/crm-dotnet-structure/SKILL.md` |
| Editing anything under `apps/api-ai-analytics` | `.agents/skills/ai-analytics-fastapi-structure/SKILL.md` |
| Anything related to components under `apps/web-crm` like installing, needing new components or icons | `.agents/skills/shadcn-ui/SKILL.md` |

## 5. Key Reference Docs (not skills — read directly if the task needs detail)

**How to use these docs:**

| Doc | When to read | How to read |
|---|---|---|
| `docs/backlogs.md` | **Every implementation task** | Read the relevant epic to know what to build — it has the task list, endpoints, and frontend items |
| `docs/backlogs-integration.md` | **Cross-system work** (auth, webhooks, chat between shop ↔ CRM) | Read the relevant INT-* epic |
| `docs/prd.md` | **Reference only** — when you need acceptance criteria, NFRs, or scope clarification | Read ONLY the specific section (e.g., §6.3 for chat requirements) — never load the full file |
| `docs/plans/implementations/` | When implementing a feature that already has a plan | Read the matching plan file |
| `docs/plans/coming-soon/` | When starting work on an upcoming feature | Read to understand the planned approach |

Service quick-starts: `apps/api-crm/README.md` / `apps/api-ai-analytics/README.md`

## 6. Cross-System Integration Context

SentraCX does not exist in isolation. It integrates with two sibling repos in the monorepo:

| System | Repo | Relationship |
|---|---|---|
| **br-online-shop** | `../br-online-shop` | Ecommerce platform. Sends customer signups, tickets, and orders to SentraCX via webhooks/proxy. Customers chat with CRM staff via shared SignalR hub. |
| **internal-auth-service** | `../internal-auth-service` | OIDC provider (OpenIddict). SentraCX authenticates employees via this service. CRMS client registered as `crms-client`. |

**Integration rules:**
- `api-oos` (br-online-shop) calls `api-crm` via HTTP — never the reverse.
- `web-shop` connects directly to `api-crm`'s SignalR ChatHub for live chat (CORS must allow it).
- `api-crm` exposes webhooks at `/api/v1/webhooks/*` for signup and order events.
- Auth tokens come from `internal-auth-service` — SentraCX never manages its own user/password store.
- See `docs/backlogs-integration.md` for the full integration backlog and dependency graph.

**Conventions**
- all plans must live inside docs/plans/implementations/
