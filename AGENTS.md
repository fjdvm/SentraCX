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
   MongoDB + Redis (pgvector planned, not implemented).
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

## 5. Key Reference Docs (not skills — read directly if the task needs schema/API detail)

- `docs/architecture/crm-data-model.md` — CRM schema, ER diagram, WebSocket+Redis flow
- `docs/architecture/ai-analytics-data-model.md` — AI-Analytics schema, ER diagram
- `docs/api/api-crm.md` / `docs/api/api-ai-analytics.md` — API references
- `apps/api-crm/README.md` / `apps/api-ai-analytics/README.md` — service quick-starts