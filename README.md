# QARevel

Internal QA testing platform for POS applications. Record browser sessions, capture network requests, detect errors, and build automated tests from recordings.

## How It Works

1. **Start Testing** — pick an environment, click Launch Browser. A real Chrome window opens.
2. **Browse manually** — test the POS app. QARevel captures everything in the background: API calls, page loads, clicks, console errors.
3. **Stop** — get a full report with timeline, network analysis, performance insights, and error screenshots.
4. **Automate** — convert recorded clicks into automated Playwright test cases, group them by category, run them randomly or in load-test loops.

## Stack

| Layer | Tech |
|-------|------|
| API | NestJS, TypeORM, PostgreSQL, BullMQ, Redis |
| Runner | Playwright (Chromium), BullMQ workers, MinIO |
| Frontend | Next.js 15, React 19, Tailwind CSS, Zustand |
| Real-time | Socket.IO WebSocket |
| Storage | MinIO (S3-compatible) for screenshots |
| Queue | Redis + BullMQ for job processing |

## Project Structure

```
QARevel/
├── apps/
│   ├── api/          # NestJS backend (port 3000)
│   ├── web/          # Next.js frontend (port 3001)
│   └── runner/       # Playwright test execution service
├── packages/
│   ├── shared-types/ # TypeScript interfaces shared across apps
│   └── eslint-config/
├── infrastructure/
│   └── docker/       # Docker Compose for Postgres, Redis, MinIO
└── package.json      # Turborepo monorepo root
```

## Setup

### Prerequisites

- Node.js 20+
- Docker Desktop (for PostgreSQL, Redis, MinIO)
- Playwright browsers: `npx playwright install chromium`

### Start

```bash
# 1. Install dependencies
npm install

# 2. Start infrastructure
docker compose -f infrastructure/docker/docker-compose.yml up -d postgres redis minio

# 3. Generate JWT keys
npm run generate:keys

# 4. Seed admin user
npm run db:seed

# 5. Start all services
npm run dev
```

Open http://localhost:3001 and login with `admin@qarevel.local` / `Admin123!`

## Pages

| Page | Route | Description |
|------|-------|-------------|
| Dashboard | `/dashboard` | Stats, recent recordings, quick start |
| Start Testing | `/record` | Pick environment, launch Chrome, live recording stats |
| Recordings | `/recordings` | List all past recordings |
| Recording Report | `/recordings/:id` | Timeline, Network, Performance, Errors, Automation tabs |
| Automation | `/automation` | Manage test cases by category, run randomly, load testing |
| Settings | `/settings` | Profile, environments, configuration |

## Recording Features

- **Network capture** — every HTTP request with method, URL, status code, response time, size
- **Page load timing** — DOM content loaded and full load times via Performance API
- **Click tracking** — records CSS selectors for automation replay
- **Console errors** — captures browser console errors with screenshots
- **Error screenshots** — automatic screenshots only on errors (not periodic)
- **Smart suggestions** — auto-detects failed requests, slow responses, slow page loads, console errors, large payloads

## Automation

- Record a session and go to the **Automation** tab in the report
- Click **Create Automated Test** to convert your clicks into a Playwright test case
- Group test cases into categories (tags)
- **Single Run** — run selected tests once in random order
- **Load Test** — loop tests continuously for 15m / 30m / 1h / 2h with live pass/fail tracking

## API Endpoints

### Recordings
```
POST   /api/recordings/start     — Start recording session
POST   /api/recordings/:id/stop  — Stop recording
GET    /api/recordings            — List recordings
GET    /api/recordings/:id        — Get recording details
DELETE /api/recordings/:id        — Delete recording
GET    /api/recordings/:id/events — Get captured events (filterable by type)
```

### Test Runs (Automation)
```
POST   /api/test-runs/start      — Start automated test run
POST   /api/test-runs/:id/stop   — Stop test run
GET    /api/test-runs/:id         — Get test run details
GET    /api/test-runs              — List test runs
```

### Test Cases
```
GET    /api/test-cases            — List test cases
POST   /api/test-cases            — Create test case
GET    /api/test-cases/:id        — Get test case with steps
PATCH  /api/test-cases/:id        — Update test case
DELETE /api/test-cases/:id        — Delete test case
```

### Environments
```
GET    /api/environments          — List environments
POST   /api/environments          — Create environment
DELETE /api/environments/:id      — Delete environment
```

## Environment Variables

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=qarevel
DB_PASSWORD=qarevel
DB_DATABASE=qarevel

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# MinIO
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=qarevel
MINIO_SECRET_KEY=qarevel123

# JWT
JWT_PRIVATE_KEY_PATH=./keys/private.pem
JWT_PUBLIC_KEY_PATH=./keys/public.pem

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_WS_URL=ws://localhost:3000
```

## License

Internal use only.
