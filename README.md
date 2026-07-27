<div align="center">

# SentraCX

**S**mart **EN**gagement **T**icketing **R**elationship and **A**nalytics — **C**ustomer E**X**perience

[![Status](https://img.shields.io/badge/status-under%20development-yellow)](https://github.com/your-org/sentracx)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

A modern, AI-powered customer experience and relationship management platform.

</div>

---

## Overview

SentraCX is a monorepo containing three core applications:

| App | Description | Port | Tech Stack |
|-----|-------------|------|------------|
| **web-crm** | CRM web frontend | `3005` | Next.js 16, React 19, Tailwind CSS v4, shadcn/ui |
| **api-crm** | CRM backend API | `5005` | .NET 10, Entity Framework Core, PostgreSQL |
| **api-ai-analytics** | AI & analytics service | `4005` | FastAPI, Pydantic v2, MongoDB, Redis, Groq |

## Prerequisites

To run the application locally for testing or development, you will need the following installed:
- [Git](https://git-scm.com/)
- [Node.js](https://nodejs.org/) v22+
- [npm](https://www.npmjs.com/) v10+
- [.NET SDK](https://dotnet.microsoft.com/) 10.0+
- [Python](https://www.python.org/) 3.12+
- [PostgreSQL](https://www.postgresql.org/) v15+ (for api-crm)
- [MongoDB](https://www.mongodb.com/) 7+ (for api-ai-analytics)
- [Redis](https://redis.io/) (for api-crm SignalR backplane and api-ai-analytics cache)

### Linux only: Fix inotify limits

The default inotify instance limit (128) is too low for `dotnet watch` + IDE file watchers. Run once:

```bash
sudo ./scripts/fix-inotify.sh
```

This persists across reboots. Without it, `dotnet watch` will crash with `System.IO.IOException`.

## Installation & Setup

Follow these steps to set up the repository for development or testing.

1. **Clone the repository**

   ```bash
   git clone https://github.com/your-org/sentracx.git
   cd SentraCX
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   cp apps/web-crm/.env.example apps/web-crm/.env.local
   cp apps/api-crm/.env.example apps/api-crm/.env
   cp apps/api-ai-analytics/.env.example apps/api-ai-analytics/.env.local
   ```

4. **Trust the HTTPS development certificate** (one-time)

   The api-crm runs over HTTPS locally. Run this once to generate and permanently trust the dev certificate:

   ```bash
   # macOS / Linux (bash, zsh)
   ./scripts/trust-dev-cert.sh

   # Windows (PowerShell)
   .\scripts\trust-dev-cert.ps1
   ```

   This persists across reboots — no need to repeat unless the certificate expires (1 year).

5. **Start databases** (required for api-ai-analytics)

   ```bash
   # Redis (macOS via Homebrew)
   brew services start redis

   # MongoDB (Linux tarball install)
   mongod --dbpath ~/.local/share/mongodb/data \
          --logpath ~/.local/share/mongodb/log/mongod.log \
          --fork --port 27017
   ```

   PostgreSQL must also be running for api-crm.

6. **Run all services**

   Start the entire platform in development mode (databases + all services):

   ```bash
   npm run dev
   ```

   This single command ensures PostgreSQL, Redis, and MongoDB are running, then launches all three services concurrently. Press Ctrl+C to stop everything.

   Alternatively, start individual services:

   ```bash
   npm run dev:web   # web-crm only
   npm run dev:api   # api-crm only
   npm run dev:ai    # api-ai-analytics only
   ```

7. **Access the Application**

   Once the services have successfully started, you can access the platform at:
   - **Web CRM Frontend**: [https://localhost:3005](https://localhost:3005)
   - **API CRM Backend**: [https://localhost:5005](https://localhost:5005)
   - **AI Analytics Service**: [http://localhost:4005](http://localhost:4005)

## Scripts

All scripts are run from the monorepo root with `npm run <script>`.

### Development

| Command | Description |
|---------|-------------|
| `npm run dev` | Start all databases and services concurrently |
| `npm run dev:web` | Start web-crm (Next.js) on port 3005 |
| `npm run dev:api` | Start api-crm (.NET) on port 5005 |
| `npm run dev:ai` | Start api-ai-analytics (FastAPI) on port 4005 |

### Build

| Command | Description |
|---------|-------------|
| `npm run build` | Build all apps in parallel |
| `npm run build:web` | Build web-crm |
| `npm run build:api` | Build api-crm |
| `npm run build:ai` | Build api-ai-analytics |

### Production

| Command | Description |
|---------|-------------|
| `npm run start` | Start all apps in production mode |
| `npm run start:web` | Start web-crm production server |
| `npm run start:api` | Start api-crm production server |
| `npm run start:ai` | Start api-ai-analytics production server |

### Quality

| Command | Description |
|---------|-------------|
| `npm run lint` | Lint all workspaces |
| `npm run lint:web` | Lint web-crm |
| `npm run test` | Run all test suites |
| `npm run test:api` | Run api-crm tests (dotnet test) |
| `npm run test:ai` | Run api-ai-analytics tests (pytest) |
| `npm run migrate` | Run database migrations (wraps `scripts/migrate-crm.sh`) |
| `npm run clean` | Remove all build artifacts & node_modules |

### Setup Scripts

One-time setup scripts located in `scripts/`. Run these once after cloning — they persist permanently.

| Script | OS | Requires | Description |
|--------|----|----------|-------------|
| `./scripts/fix-inotify.sh` | Linux only | `sudo` | Increases inotify limits so `dotnet watch` and IDE file watchers don't crash |
| `./scripts/trust-dev-cert.sh` | macOS / Linux | — | Generates and trusts the ASP.NET Core HTTPS dev certificate |
| `.\scripts\trust-dev-cert.ps1` | Windows | — | Same as above, native PowerShell version |
| `./scripts/migrate-crm.sh` | All | — | Manage EF Core database migrations for api-crm |

#### `fix-inotify.sh` — Fix file watcher limits (Linux)

The default inotify instance limit (128) is too low when running `dotnet watch` alongside VS Code or other IDEs. This script sets it to 1024 and persists the change across reboots via `/etc/sysctl.d/`.

```bash
sudo ./scripts/fix-inotify.sh
```

- Idempotent — skips if the limit is already sufficient.
- Not needed on macOS or Windows (they use different file-watching APIs).
- Without this, `dotnet watch` crashes with: `System.IO.IOException: The configured user limit (128) on the number of inotify instances has been reached`.

#### `trust-dev-cert.sh` / `trust-dev-cert.ps1` — Trust HTTPS dev certificate

The api-crm runs on `https://localhost:5005`. This script generates a dev certificate and trusts it permanently so browsers and other services don't reject HTTPS connections.

```bash
# macOS / Linux
./scripts/trust-dev-cert.sh

# Windows (PowerShell)
.\scripts\trust-dev-cert.ps1
```

**How it persists per OS:**

| OS | Mechanism | Survives reboots? |
|----|-----------|-------------------|
| macOS | Adds cert to login Keychain | ✓ |
| Windows | Adds cert to CurrentUser certificate store | ✓ |
| Linux | Appends `SSL_CERT_DIR` and `NODE_EXTRA_CA_CERTS` to shell profile (`~/.zshrc` or `~/.bashrc`) | ✓ |

- Idempotent — running again won't duplicate shell profile entries.
- Certificate valid for 1 year. Re-run if it expires.
- On Linux, open a new terminal (or `source ~/.zshrc`) after first run to activate.

#### `migrate-crm.sh` — Database migrations

Manage EF Core migrations for the api-crm PostgreSQL database.

```bash
./scripts/migrate-crm.sh              # Apply pending migrations
./scripts/migrate-crm.sh add <Name>   # Create a new migration
./scripts/migrate-crm.sh remove       # Remove the last migration
./scripts/migrate-crm.sh status       # Show migration status
./scripts/migrate-crm.sh reset        # Drop and recreate the database (interactive)
```

## Project Structure

```
SentraCX/
├── apps/
│   ├── web-crm/              # Next.js 16 frontend (port 3005)
│   │   └── src/              # All source code lives here
│   ├── api-crm/              # .NET 10 Web API (port 5005)
│   └── api-ai-analytics/     # FastAPI service (port 4005)
├── packages/
│   ├── ui/                   # Shared UI components
│   ├── config/               # Shared configuration
│   └── types/                # Shared TypeScript types
├── docs/
│   ├── architecture/         # Data model docs + Mermaid diagrams
│   ├── api/                  # API endpoint documentation
│   ├── plans/implementations/# Feature implementation plans
│   ├── fix-reports/          # Bug fix reports
│   └── implementation-reports/ # Feature completion reports
├── .design-ref/              # UI/UX design reference material
├── .github/workflows/        # CI build verification
├── scripts/                  # One-time setup and migration scripts
├── pnpm-workspace.yaml       # Workspace configuration
├── turbo.json                # Turborepo pipeline config
└── package.json              # Root scripts
```

## License

This project is licensed under the [MIT License](LICENSE).
