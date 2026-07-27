---
name: dev-setup
description: Run commands and local environment setup for all three SentraCX services (CRM, AI-Analytics, Web). Load when starting a service locally or debugging a local dev environment issue.
category: Developer Experience
---

## Objective
Provide concise, accurate commands and instructions for running and debugging SentraCX services locally.

## Instructions
1. Run monorepo tasks from root:
   - `npm run dev:web`: Runs `web-crm` only (Next.js, port 3005).
   - `npm run dev:api`: Runs `api-crm` only (.NET, port 5005).
   - `npm run dev:ai`: Runs `api-ai-analytics` only (FastAPI, port 4005).

2. Set up and run CRM (.NET):
   - Navigate to `apps/api-crm` and run `dotnet watch run --urls https://localhost:5005`.
   - Configure via `appsettings.json` / `appsettings.Development.json` and environment variables in `.env`.
   - Ensure PostgreSQL is running. Database migrations execute automatically on dev startup or manually via `npm run migrate` (`scripts/migrate-crm.sh`).
   - Access Scalar API docs at `https://localhost:5005/docs`.

3. Set up and run AI-Analytics (FastAPI):
   - Ensure MongoDB (port 27017) and Redis (port 6379) are active.
   - Run `uvicorn app.main:app --reload --port 4005` inside `.venv` in `apps/api-ai-analytics`, or `npm run dev:ai` from root.
   - Configure via `app/core/config.py` (Pydantic Settings) and `.env.local`.
   - Access Scalar API docs at `http://localhost:4005/docs`.

4. Verify command validity:
   - Always verify script commands against `.csproj`, `pyproject.toml`, or `package.json` before assuming final accuracy.

## Validation Checklist
* [ ] Monorepo package manager commands use `npm` exclusively.
* [ ] Database prerequisites (PostgreSQL, MongoDB, Redis) are verified before starting services.
* [ ] Local API documentation endpoints load successfully.