# QARevel — Internal QA Testing Platform
## Complete Technical Implementation Plan

---

# 1. SYSTEM ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Next.js)                         │
│  Dashboard │ Test Runner │ Device Mgmt │ Reports │ Live Monitor    │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ HTTPS / WSS
┌──────────────────────────────▼──────────────────────────────────────┐
│                        BACKEND API (NestJS)                        │
│  Auth │ Devices │ Environments │ TestRuns │ Logs │ Reports │ WS    │
├───────────┬───────────┬───────────┬────────────┬───────────────────┤
│ PostgreSQL│   Redis   │  BullMQ   │   MinIO    │  OpenTelemetry   │
│  (data)   │ (cache/   │ (job      │ (files/    │  Collector       │
│           │  pubsub)  │  queue)   │  screens)  │  → Loki          │
└───────────┴───────────┴─────┬─────┴────────────┴───────────────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
    ┌─────────▼──┐   ┌───────▼────┐   ┌──────▼───────┐
    │  Android   │   │  Windows   │   │   Browser    │
    │   Agent    │   │   Agent    │   │   Runner     │
    │ (Appium +  │   │ (WinApp    │   │ (Playwright  │
    │  adb)      │   │  Driver +  │   │  service)    │
    │            │   │  native)   │   │              │
    └────────────┘   └────────────┘   └──────────────┘
```

## Communication Patterns

| Flow | Protocol | Pattern |
|------|----------|---------|
| Frontend ↔ Backend | REST + WebSocket | Sync for CRUD, WS for live updates |
| Backend → Agents | WebSocket (persistent) | Backend pushes tasks to connected agents |
| Agents → Backend | WebSocket + REST | WS for streaming logs/events, REST for bulk uploads |
| Backend → Queue | BullMQ (Redis) | Async: report gen, test orchestration, video processing |
| Backend → Storage | S3 API (MinIO) | Screenshots, videos, APKs, attachments |
| Backend → Logging | OTLP/gRPC | All structured logs piped to collector |

## Sync vs Async

**Synchronous (request/response):**
- Auth, CRUD operations, device registration, fetching reports
- Starting/stopping test runs (the command is sync; execution is async)

**Asynchronous (queued):**
- Test suite execution across devices
- Report PDF generation
- Video/screenshot processing
- Log aggregation and indexing
- Load test orchestration

**Real-time (WebSocket):**
- Live test progress (step-by-step updates)
- Log streaming during active sessions
- Device status heartbeats
- Manual test session mirroring

---

# 2. TECH STACK

## Frontend: Next.js 15 + React 19 + Tailwind CSS 4 + shadcn/ui

**Why:** Next.js gives us SSR for the dashboard (fast initial loads), API routes as a BFF layer if needed, and App Router for clean layouts. shadcn/ui provides production-grade components without vendor lock. Tailwind keeps styling fast and consistent.

## Backend: Node.js 22 + NestJS 11 + TypeScript

**Why:** NestJS provides enterprise-grade structure (modules, guards, interceptors, pipes) that a QA platform needs. TypeScript shared with frontend means shared types. NestJS has first-class WebSocket support (needed for live agent communication), built-in Swagger generation, and BullMQ integration via `@nestjs/bullmq`.

## Database: PostgreSQL 16

**Why:** JSONB for flexible test step data, excellent indexing for time-series log queries, mature ecosystem, rock-solid reliability. No need for NoSQL — our data is inherently relational.

## Queue: Redis 7 + BullMQ

**Why:** BullMQ is the most mature Node.js queue. Handles job scheduling, retries, rate limiting, and priority queues. Redis doubles as our pub/sub layer for real-time events and caching layer for device status.

## Automation

| Platform | Tool | Why |
|----------|------|-----|
| Android | Appium 2 + UiAutomator2 | Industry standard, supports real devices and emulators, cross-app testing |
| Web/Chrome | Playwright | Fastest, most reliable browser automation. Built-in tracing, screenshots, video recording, network interception |
| Windows | WinAppDriver + FlaUI | WinAppDriver for UI automation, FlaUI as fallback for modern WinUI3 apps |

## Logging: OpenTelemetry Collector → Grafana Loki + Grafana

**Why:** OTEL is vendor-neutral. Loki is log-native (unlike ELK which is search-native), cheaper to run, and integrates perfectly with Grafana for dashboards. No need for Elasticsearch complexity for an internal tool.

## Storage: MinIO (S3-compatible)

**Why:** Self-hosted, S3-compatible API, no cloud dependency. Stores screenshots, video recordings, APKs, reports. Can swap to AWS S3 later with zero code changes.

## Proxy/API Tracing: mitmproxy (programmatic)

**Why:** mitmproxy has a Python API for programmatic interception, supports HTTPS with custom CA certs, and can be embedded as a sidecar. Captures full request/response with timing.

---

# 3. REPOSITORY STRUCTURE

```
qarevel/                          # Turborepo monorepo
├── apps/
│   ├── web/                      # Next.js frontend dashboard
│   │   ├── src/
│   │   │   ├── app/              # App Router pages
│   │   │   ├── components/       # UI components
│   │   │   ├── hooks/            # React hooks
│   │   │   ├── lib/              # Utilities, API client
│   │   │   └── stores/           # Zustand stores
│   │   ├── public/
│   │   ├── next.config.ts
│   │   ├── tailwind.config.ts
│   │   └── package.json
│   │
│   ├── api/                      # NestJS backend
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── auth/         # JWT auth, guards
│   │   │   │   ├── users/        # User management
│   │   │   │   ├── devices/      # Device registry
│   │   │   │   ├── environments/ # Environment configs
│   │   │   │   ├── tests/        # Test cases, suites, runs
│   │   │   │   ├── sessions/     # Manual test sessions
│   │   │   │   ├── automation/   # Automation orchestration
│   │   │   │   ├── logs/         # Log ingestion
│   │   │   │   ├── traces/       # API trace ingestion
│   │   │   │   ├── events/       # Click/crash events
│   │   │   │   ├── reports/      # Report generation
│   │   │   │   ├── loadtest/     # Load test orchestration
│   │   │   │   └── gateway/      # WebSocket gateway
│   │   │   ├── common/           # Guards, filters, interceptors
│   │   │   ├── database/         # TypeORM entities, migrations
│   │   │   └── main.ts
│   │   ├── test/
│   │   └── package.json
│   │
│   ├── runner/                   # Automation runner service
│   │   ├── src/
│   │   │   ├── executors/
│   │   │   │   ├── playwright.executor.ts
│   │   │   │   ├── appium.executor.ts
│   │   │   │   └── winappdriver.executor.ts
│   │   │   ├── reporters/
│   │   │   ├── workers/          # BullMQ workers
│   │   │   └── main.ts
│   │   └── package.json
│   │
│   ├── agent-windows/            # Windows device agent
│   │   ├── src/
│   │   │   ├── collector/        # Log/event collector
│   │   │   ├── executor/         # Local test execution
│   │   │   ├── transport/        # WebSocket client
│   │   │   └── main.ts
│   │   └── package.json
│   │
│   └── proxy/                    # API trace proxy (mitmproxy wrapper)
│       ├── proxy_addon.py        # mitmproxy addon script
│       ├── Dockerfile
│       └── requirements.txt
│
├── packages/
│   ├── shared-types/             # TypeScript types shared across apps
│   │   ├── src/
│   │   │   ├── device.ts
│   │   │   ├── test.ts
│   │   │   ├── event.ts
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── api-client/               # Generated API client (from OpenAPI)
│   │   ├── src/
│   │   └── package.json
│   │
│   └── eslint-config/            # Shared ESLint config
│       └── package.json
│
├── infrastructure/
│   ├── docker/
│   │   ├── docker-compose.yml    # Full local stack
│   │   ├── docker-compose.dev.yml
│   │   ├── Dockerfile.api
│   │   ├── Dockerfile.web
│   │   ├── Dockerfile.runner
│   │   └── Dockerfile.proxy
│   ├── grafana/
│   │   ├── provisioning/
│   │   └── dashboards/
│   ├── otel/
│   │   └── otel-collector-config.yaml
│   └── db/
│       └── init.sql
│
├── turbo.json
├── package.json
├── tsconfig.base.json
└── .env.example
```

**Why monorepo with Turborepo:** Shared types compile once, consistent tooling, single CI pipeline, atomic changes across frontend+backend. Turborepo handles build caching and task orchestration.

**Why separate `runner` from `api`:** The runner is CPU-intensive (spinning up browsers, processing video). Separating it means we can scale runners independently and a runaway test doesn't crash the API.

---

# 4. DATABASE SCHEMA

## Entity Relationship Diagram

```
users ──┐
        ├──< test_runs ──< test_step_results ──< attachments
        │       │                  │
roles ──┘       │                  ├──< log_entries
                │                  ├──< api_traces
devices ────────┤                  ├──< click_events
                │                  └──< crash_events
environments ───┤
                │
app_targets ────┘

test_suites ──< test_suite_cases >── test_cases ──< test_steps
```

## Tables

### users
```sql
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    display_name    VARCHAR(100) NOT NULL,
    role            VARCHAR(20) NOT NULL DEFAULT 'tester',  -- 'admin', 'lead', 'tester', 'viewer'
    is_active       BOOLEAN DEFAULT true,
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### devices
```sql
CREATE TABLE devices (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(100) NOT NULL,
    platform        VARCHAR(20) NOT NULL,        -- 'android', 'windows', 'browser'
    os_version      VARCHAR(50),
    model           VARCHAR(100),                -- 'Samsung Galaxy Tab A8', 'Windows 11 Pro', 'Chrome 125'
    serial_number   VARCHAR(100) UNIQUE,         -- ADB serial or machine ID
    ip_address      INET,
    agent_version   VARCHAR(20),
    status          VARCHAR(20) DEFAULT 'offline', -- 'online', 'offline', 'busy', 'error'
    capabilities    JSONB DEFAULT '{}',          -- {"hasCamera": true, "screenSize": "1920x1080"}
    last_heartbeat  TIMESTAMPTZ,
    registered_by   UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_devices_status ON devices(status);
CREATE INDEX idx_devices_platform ON devices(platform);
```

### environments
```sql
CREATE TABLE environments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(100) NOT NULL,       -- 'Local Dev', 'Staging', 'Production'
    type            VARCHAR(20) NOT NULL,        -- 'local', 'remote'
    base_url        VARCHAR(500) NOT NULL,       -- 'http://192.168.1.50:8080' or 'https://staging.app.com'
    description     TEXT,
    health_check_url VARCHAR(500),               -- endpoint to verify environment is up
    auth_config     JSONB DEFAULT '{}',          -- {"type": "bearer", "token": "***"} (encrypted at rest)
    is_active       BOOLEAN DEFAULT true,
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### app_targets
```sql
CREATE TABLE app_targets (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(100) NOT NULL,       -- 'POS App Android', 'POS Web'
    platform        VARCHAR(20) NOT NULL,        -- 'android', 'windows', 'web'
    package_name    VARCHAR(200),                -- 'com.company.pos' (Android)
    executable_path VARCHAR(500),                -- 'C:\Program Files\POS\pos.exe' (Windows)
    url_pattern     VARCHAR(500),                -- 'https://{env}/pos' (Web) — {env} replaced at runtime
    version         VARCHAR(50),
    apk_storage_key VARCHAR(200),                -- MinIO key for APK if applicable
    config          JSONB DEFAULT '{}',
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### test_cases
```sql
CREATE TABLE test_cases (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title           VARCHAR(300) NOT NULL,       -- 'Login with valid credentials'
    description     TEXT,
    app_target_id   UUID REFERENCES app_targets(id),
    platform        VARCHAR(20) NOT NULL,        -- which platform this case targets
    priority        VARCHAR(10) DEFAULT 'medium', -- 'critical', 'high', 'medium', 'low'
    type            VARCHAR(20) DEFAULT 'manual', -- 'manual', 'automated', 'hybrid'
    tags            TEXT[] DEFAULT '{}',          -- {'smoke', 'regression', 'checkout'}
    preconditions   TEXT,
    automation_code TEXT,                         -- Playwright/Appium script (for automated)
    estimated_duration_sec INT,
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_test_cases_tags ON test_cases USING GIN(tags);
CREATE INDEX idx_test_cases_platform ON test_cases(platform);
```

### test_steps
```sql
CREATE TABLE test_steps (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_case_id    UUID NOT NULL REFERENCES test_cases(id) ON DELETE CASCADE,
    step_number     INT NOT NULL,
    action          TEXT NOT NULL,               -- 'Click login button' or automation selector
    expected_result TEXT,                        -- 'Dashboard loads within 3s'
    selector        VARCHAR(500),                -- '#login-btn' or '//android.widget.Button[@text="Login"]'
    selector_type   VARCHAR(20),                 -- 'css', 'xpath', 'accessibility_id', 'id'
    input_data      JSONB,                       -- {"username": "test@co.com", "password": "{{env.PASSWORD}}"}
    timeout_ms      INT DEFAULT 10000,
    is_optional     BOOLEAN DEFAULT false,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(test_case_id, step_number)
);
```

### test_suites
```sql
CREATE TABLE test_suites (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(200) NOT NULL,
    description     TEXT,
    app_target_id   UUID REFERENCES app_targets(id),
    tags            TEXT[] DEFAULT '{}',
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### test_suite_cases (junction)
```sql
CREATE TABLE test_suite_cases (
    suite_id        UUID NOT NULL REFERENCES test_suites(id) ON DELETE CASCADE,
    test_case_id    UUID NOT NULL REFERENCES test_cases(id) ON DELETE CASCADE,
    execution_order INT NOT NULL,
    PRIMARY KEY (suite_id, test_case_id)
);
```

### test_runs
```sql
CREATE TABLE test_runs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    suite_id        UUID REFERENCES test_suites(id),       -- NULL for single test case runs
    test_case_id    UUID REFERENCES test_cases(id),        -- NULL for suite runs
    device_id       UUID NOT NULL REFERENCES devices(id),
    environment_id  UUID NOT NULL REFERENCES environments(id),
    app_target_id   UUID NOT NULL REFERENCES app_targets(id),
    triggered_by    UUID NOT NULL REFERENCES users(id),
    type            VARCHAR(20) NOT NULL,                  -- 'manual', 'automated', 'load'
    status          VARCHAR(20) DEFAULT 'pending',         -- 'pending','running','passed','failed','error','cancelled'
    correlation_id  VARCHAR(50) UNIQUE NOT NULL,           -- links all logs/traces for this run
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    duration_ms     INT,
    summary         JSONB,                                 -- {"total": 10, "passed": 8, "failed": 1, "skipped": 1}
    config          JSONB DEFAULT '{}',                    -- runtime overrides, proxy settings, etc.
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_test_runs_status ON test_runs(status);
CREATE INDEX idx_test_runs_correlation ON test_runs(correlation_id);
CREATE INDEX idx_test_runs_created ON test_runs(created_at DESC);
```

### test_step_results
```sql
CREATE TABLE test_step_results (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_run_id     UUID NOT NULL REFERENCES test_runs(id) ON DELETE CASCADE,
    test_step_id    UUID REFERENCES test_steps(id),        -- NULL for ad-hoc manual steps
    step_number     INT NOT NULL,
    status          VARCHAR(20) NOT NULL,                  -- 'passed','failed','skipped','blocked','error'
    actual_result   TEXT,
    error_message   TEXT,
    screenshot_key  VARCHAR(200),                          -- MinIO object key
    duration_ms     INT,
    notes           TEXT,                                  -- tester notes (manual)
    executed_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_step_results_run ON test_step_results(test_run_id);
```

### log_entries
```sql
CREATE TABLE log_entries (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_run_id     UUID REFERENCES test_runs(id),
    correlation_id  VARCHAR(50) NOT NULL,
    source          VARCHAR(50) NOT NULL,                  -- 'app', 'device', 'automation', 'proxy', 'agent'
    level           VARCHAR(10) NOT NULL,                  -- 'debug','info','warn','error','fatal'
    message         TEXT NOT NULL,
    metadata        JSONB DEFAULT '{}',
    device_id       UUID REFERENCES devices(id),
    timestamp       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_logs_correlation ON log_entries(correlation_id);
CREATE INDEX idx_logs_timestamp ON log_entries(timestamp DESC);
CREATE INDEX idx_logs_level ON log_entries(level);
-- Partition by month for performance:
-- CREATE TABLE log_entries ... PARTITION BY RANGE (timestamp);
```

### api_traces
```sql
CREATE TABLE api_traces (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_run_id     UUID REFERENCES test_runs(id),
    test_step_result_id UUID REFERENCES test_step_results(id),
    correlation_id  VARCHAR(50) NOT NULL,
    method          VARCHAR(10) NOT NULL,                  -- 'GET','POST','PUT','DELETE','PATCH'
    url             VARCHAR(2000) NOT NULL,
    request_headers JSONB,                                 -- sensitive headers masked
    request_body    JSONB,                                 -- sensitive fields masked
    status_code     INT,
    response_headers JSONB,
    response_body   JSONB,                                 -- truncated if > 100KB
    response_time_ms INT,
    error           TEXT,
    captured_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_traces_correlation ON api_traces(correlation_id);
CREATE INDEX idx_traces_run ON api_traces(test_run_id);
CREATE INDEX idx_traces_status ON api_traces(status_code);
```

### click_events
```sql
CREATE TABLE click_events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_run_id     UUID REFERENCES test_runs(id),
    test_step_result_id UUID REFERENCES test_step_results(id),
    correlation_id  VARCHAR(50) NOT NULL,
    event_type      VARCHAR(30) NOT NULL,                  -- 'tap','click','long_press','swipe','type','scroll','navigate'
    target_element  VARCHAR(500),                          -- selector or description
    target_text     VARCHAR(200),                          -- visible text of element
    screen_name     VARCHAR(200),                          -- current screen/page
    coordinates     POINT,                                 -- (x, y)
    input_value     VARCHAR(500),                          -- masked if sensitive
    device_id       UUID REFERENCES devices(id),
    timestamp       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_clicks_correlation ON click_events(correlation_id);
CREATE INDEX idx_clicks_run ON click_events(test_run_id);
```

### crash_events
```sql
CREATE TABLE crash_events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_run_id     UUID REFERENCES test_runs(id),
    correlation_id  VARCHAR(50) NOT NULL,
    device_id       UUID REFERENCES devices(id),
    severity        VARCHAR(10) NOT NULL,                  -- 'crash','anr','error','warning'
    type            VARCHAR(100),                          -- 'NullPointerException', 'BSOD', 'JSError'
    message         TEXT NOT NULL,
    stack_trace     TEXT,
    last_actions    JSONB,                                 -- last 10 click_events before crash
    last_api_calls  JSONB,                                 -- last 5 api_traces before crash
    device_state    JSONB,                                 -- {"battery": 45, "memory_mb": 120, "cpu_pct": 95}
    screenshot_key  VARCHAR(200),
    is_resolved     BOOLEAN DEFAULT false,
    resolved_by     UUID REFERENCES users(id),
    resolved_at     TIMESTAMPTZ,
    occurred_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_crashes_correlation ON crash_events(correlation_id);
CREATE INDEX idx_crashes_severity ON crash_events(severity);
CREATE INDEX idx_crashes_resolved ON crash_events(is_resolved);
```

### attachments
```sql
CREATE TABLE attachments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_run_id     UUID REFERENCES test_runs(id),
    test_step_result_id UUID REFERENCES test_step_results(id),
    type            VARCHAR(20) NOT NULL,                  -- 'screenshot','video','log_file','har','other'
    filename        VARCHAR(255) NOT NULL,
    storage_key     VARCHAR(500) NOT NULL,                 -- MinIO object key
    mime_type       VARCHAR(100),
    size_bytes      BIGINT,
    uploaded_by     UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_attachments_run ON attachments(test_run_id);
```

### reports
```sql
CREATE TABLE reports (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_run_id     UUID NOT NULL REFERENCES test_runs(id),
    type            VARCHAR(20) DEFAULT 'standard',        -- 'standard','load_test','comparison'
    status          VARCHAR(20) DEFAULT 'generating',      -- 'generating','ready','error'
    summary         JSONB NOT NULL,                        -- aggregated stats
    storage_key     VARCHAR(500),                          -- MinIO key for PDF/HTML report
    generated_by    UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

---

# 5. BACKEND API DESIGN

REST API with OpenAPI 3.1 spec auto-generated by NestJS Swagger.

## Auth Module

```
POST   /api/auth/login
  Body:    { "email": "user@co.com", "password": "..." }
  Returns: { "access_token": "eyJ...", "refresh_token": "...", "user": { id, email, display_name, role } }
  Notes:   access_token expires in 1h, refresh_token in 7d

POST   /api/auth/refresh
  Body:    { "refresh_token": "..." }
  Returns: { "access_token": "..." }

GET    /api/auth/me
  Headers: Authorization: Bearer <token>
  Returns: { id, email, display_name, role }
```

## Users Module (admin only)

```
GET    /api/users                  → paginated list
POST   /api/users                  → create user
PATCH  /api/users/:id              → update user
DELETE /api/users/:id              → deactivate user
```

## Devices Module

```
GET    /api/devices                → list all devices (filterable by platform, status)
GET    /api/devices/:id            → device detail + last heartbeat
POST   /api/devices/register       → register new device
  Body:    { "name": "Tab-A8-001", "platform": "android", "serial_number": "R52N...", "ip_address": "192.168.1.50" }
  Returns: { "id": "uuid", "agent_token": "..." }  ← token for agent auth
  Notes:   agent_token is a long-lived JWT scoped to device operations only

PATCH  /api/devices/:id            → update device info
DELETE /api/devices/:id            → deregister
POST   /api/devices/:id/heartbeat  → agent sends status update
  Body:    { "status": "online", "battery": 85, "memory_free_mb": 512 }
```

## Environments Module

```
GET    /api/environments           → list environments
POST   /api/environments           → create environment
  Body:    { "name": "Local Dev", "type": "local", "base_url": "http://192.168.1.10:3000", "health_check_url": "http://192.168.1.10:3000/health" }
PATCH  /api/environments/:id       → update
DELETE /api/environments/:id       → deactivate
POST   /api/environments/:id/check → health check (backend pings the URL)
  Returns: { "healthy": true, "response_time_ms": 45 }
```

## App Targets Module

```
GET    /api/app-targets
POST   /api/app-targets
PATCH  /api/app-targets/:id
DELETE /api/app-targets/:id
POST   /api/app-targets/:id/upload-apk   → multipart upload → MinIO
```

## Test Cases & Suites

```
GET    /api/test-cases              → list (filter by platform, tags, type)
POST   /api/test-cases              → create
GET    /api/test-cases/:id          → detail with steps
PATCH  /api/test-cases/:id          → update
DELETE /api/test-cases/:id          → soft delete

POST   /api/test-cases/:id/steps    → add step
PATCH  /api/test-cases/:id/steps/:stepId → update step
DELETE /api/test-cases/:id/steps/:stepId → remove step
POST   /api/test-cases/:id/steps/reorder → reorder steps
  Body:    { "order": ["step-uuid-1", "step-uuid-3", "step-uuid-2"] }

GET    /api/test-suites
POST   /api/test-suites
GET    /api/test-suites/:id         → detail with cases
PATCH  /api/test-suites/:id
POST   /api/test-suites/:id/cases   → add case to suite
DELETE /api/test-suites/:id/cases/:caseId → remove case from suite
```

## Test Runs

```
POST   /api/test-runs/start
  Body: {
    "type": "automated",           // 'manual' | 'automated' | 'load'
    "suite_id": "uuid",            // or "test_case_id" for single case
    "device_id": "uuid",
    "environment_id": "uuid",
    "app_target_id": "uuid",
    "config": {                    // optional overrides
      "enable_proxy": true,
      "record_video": true,
      "parallel_count": 1          // for load tests
    }
  }
  Returns: {
    "id": "uuid",
    "correlation_id": "run-20260401-abc123",
    "status": "pending",
    "ws_channel": "test-run:uuid"  // WebSocket channel to subscribe for live updates
  }

POST   /api/test-runs/:id/stop     → cancel running test
GET    /api/test-runs/:id           → full run detail with step results
GET    /api/test-runs                → list runs (paginated, filterable)
GET    /api/test-runs/:id/timeline  → ordered events (steps + logs + traces + clicks)
```

## Manual Session Endpoints

```
POST   /api/sessions/start
  Body: { "device_id": "uuid", "environment_id": "uuid", "app_target_id": "uuid" }
  Returns: { "test_run_id": "uuid", "correlation_id": "...", "ws_channel": "..." }

POST   /api/sessions/:runId/step
  Body: { "step_number": 1, "action": "Opened login page", "status": "passed", "notes": "Loaded in 2s" }

POST   /api/sessions/:runId/screenshot
  Body: multipart/form-data with image + optional step_result_id

POST   /api/sessions/:runId/complete
  Body: { "overall_notes": "All critical flows working" }
```

## Logs, Traces, Events (Agent Ingestion)

```
POST   /api/logs/batch
  Headers: X-Agent-Token: <device-agent-token>
  Body: { "entries": [
    { "correlation_id": "run-...", "source": "app", "level": "error", "message": "...", "metadata": {}, "timestamp": "..." }
  ]}

POST   /api/traces/batch
  Headers: X-Agent-Token: <device-agent-token>
  Body: { "traces": [
    { "correlation_id": "run-...", "method": "POST", "url": "/api/orders", "status_code": 201, "response_time_ms": 340, ... }
  ]}

POST   /api/events/click
  Body: { "correlation_id": "...", "event_type": "tap", "target_element": "#pay-btn", "screen_name": "Checkout", ... }

POST   /api/events/crash
  Body: { "correlation_id": "...", "severity": "crash", "type": "NullPointerException", "stack_trace": "...", "device_state": {...} }
```

## Reports

```
POST   /api/reports/generate
  Body: { "test_run_id": "uuid", "type": "standard" }
  Returns: { "report_id": "uuid", "status": "generating" }
  Notes: Queued via BullMQ. Client polls or listens on WS.

GET    /api/reports/:id             → report detail + download link
GET    /api/reports/:id/download    → redirect to MinIO presigned URL
```

## WebSocket Gateway

```
Namespace: /ws
Events:
  → client subscribes:    { "event": "subscribe", "channel": "test-run:<uuid>" }
  ← server emits:         { "event": "step:complete", "data": { step_number, status, duration_ms } }
  ← server emits:         { "event": "log", "data": { level, message, timestamp } }
  ← server emits:         { "event": "run:complete", "data": { status, summary } }
  ← server emits:         { "event": "device:status", "data": { device_id, status } }

Authentication: token passed as query param on connect → validated in WS guard
```

---

# 6. DEVICE AGENT DESIGN

## Agent Architecture (Common)

All agents share a common communication pattern:

```
┌─────────────────────────────────┐
│          Device Agent           │
│  ┌───────────┐  ┌────────────┐ │
│  │ Transport  │  │ Collector  │ │
│  │ (WS Client)│  │ (logs,     │ │
│  │            │  │  events,   │ │
│  │            │  │  metrics)  │ │
│  └─────┬─────┘  └─────┬──────┘ │
│        │              │         │
│  ┌─────▼──────────────▼──────┐  │
│  │      Task Executor        │  │
│  │  (runs automation steps)  │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

### Connection Flow

1. Agent starts → reads config (backend URL, agent token from registration)
2. Connects to backend via WebSocket with `?token=<agent_token>`
3. Sends initial handshake: `{ type: "agent:register", device_id, capabilities }`
4. Enters heartbeat loop (every 30s): `{ type: "agent:heartbeat", status, metrics }`
5. Listens for task assignments: `{ type: "task:assign", test_run_id, steps, config }`
6. Executes steps, streaming results back:
   - `{ type: "step:start", step_number }`
   - `{ type: "log", ... }`
   - `{ type: "step:complete", step_number, status, duration_ms }`
7. Uploads artifacts (screenshots, videos) via REST with multipart

### Windows Agent

**Runtime:** Node.js compiled to single executable via `pkg` or distributed as `.msi` installer.

**Components:**
- **WinAppDriver bridge:** Starts WinAppDriver process, communicates via its REST API (localhost:4723)
- **Log collector:** Tails Windows Event Log + app-specific log files, forwards to backend
- **Process monitor:** Watches target app process for crashes (exit code != 0), memory/CPU usage
- **Screen capture:** Uses native Windows API via `screenshot-desktop` npm package

**Installation:** MSI installer that:
1. Installs agent as Windows Service
2. Creates config at `C:\ProgramData\QARevel\config.json`
3. Registers with backend on first run

### Android Agent Strategy

**Approach: Appium Server + ADB Bridge (hybrid)**

We do NOT install an agent app on Android devices. Instead:

1. An **Appium server** runs on the QARevel runner machine (or a dedicated machine with USB connections)
2. Android devices connect via **USB or WiFi ADB**
3. The runner communicates with Appium, which communicates with the device via UiAutomator2

**For log collection:**
- `adb logcat` streams are captured by the runner and forwarded to the backend
- The runner uses `adb shell dumpsys` for device state (battery, memory, etc.)

**For API tracing:**
- The device's WiFi proxy is configured to point to our mitmproxy instance
- mitmproxy's CA cert is installed on the device (one-time setup)

**Why not an on-device agent:** Android kiosk/POS devices are often locked down. Installing a custom agent adds complexity. ADB + Appium gives us full control without modifying the target device's software.

### Browser Runner

**Runtime:** Playwright service running as BullMQ worker.

**How it works:**
1. Runner receives task from queue
2. Launches browser with Playwright (Chromium, Firefox, or WebKit)
3. Configures proxy settings to route through mitmproxy
4. Navigates to target URL (from environment config)
5. Executes test steps using Playwright's API
6. Captures: screenshots (per step), video (full session), HAR file (network), trace file (Playwright trace)
7. Uploads all artifacts to MinIO
8. Reports results back via REST + WS

**Playwright-specific advantages used:**
- `page.route()` for request interception (alternative to proxy for web-only tests)
- `browser.newContext({ recordVideo: { dir: '...' } })` for video recording
- `tracing.start()` / `tracing.stop()` for Playwright Trace Viewer files
- `page.on('console')` for JS console log capture
- `page.on('pageerror')` for uncaught exception capture

---

# 7. AUTOMATION ENGINE

## Test Case Format

Test cases are stored in the database (not files) with two execution modes:

### Mode 1: Step-based (declarative)

Steps stored in `test_steps` table. The executor interprets them:

```json
{
  "test_case_id": "uuid",
  "steps": [
    {
      "step_number": 1,
      "action": "navigate",
      "selector": null,
      "input_data": { "url": "{{env.base_url}}/login" }
    },
    {
      "step_number": 2,
      "action": "fill",
      "selector": "#email",
      "selector_type": "css",
      "input_data": { "value": "cashier@store.com" }
    },
    {
      "step_number": 3,
      "action": "fill",
      "selector": "#password",
      "selector_type": "css",
      "input_data": { "value": "{{env.TEST_PASSWORD}}" }
    },
    {
      "step_number": 4,
      "action": "click",
      "selector": "button[type=submit]",
      "selector_type": "css"
    },
    {
      "step_number": 5,
      "action": "assert_visible",
      "selector": "[data-testid=dashboard]",
      "selector_type": "css",
      "expected_result": "Dashboard is visible",
      "timeout_ms": 5000
    }
  ]
}
```

**Supported actions:** `navigate`, `click`, `fill`, `select`, `check`, `uncheck`, `hover`, `scroll`, `swipe` (mobile), `wait`, `assert_visible`, `assert_text`, `assert_url`, `screenshot`, `custom_script`

### Mode 2: Script-based (imperative)

For complex scenarios, the `automation_code` field contains TypeScript:

```typescript
// Stored in test_cases.automation_code
export default async function(ctx: TestContext) {
  const { page, device, env, assert, step } = ctx;

  await step(1, 'Navigate to login', async () => {
    await page.goto(`${env.base_url}/login`);
  });

  await step(2, 'Login as cashier', async () => {
    await page.fill('#email', 'cashier@store.com');
    await page.fill('#password', env.TEST_PASSWORD);
    await page.click('button[type=submit]');
    await assert.visible('[data-testid=dashboard]');
  });

  await step(3, 'Create new order', async () => {
    await page.click('[data-testid=new-order]');
    await page.click('[data-testid=product-1]');
    await page.click('[data-testid=add-to-cart]');
    const total = await page.textContent('[data-testid=cart-total]');
    assert.equal(total, '$12.99');
  });
}
```

**Script execution:** Scripts are sandboxed via `vm2` (or `isolated-vm`) with a 60s default timeout. The `TestContext` provides platform-specific APIs (Playwright page for web, Appium driver for mobile).

## Execution Flow

```
1. POST /api/test-runs/start
   └→ Backend creates test_run record (status: pending)
   └→ Backend enqueues job to BullMQ "test-execution" queue

2. Runner worker picks up job
   └→ Resolves device (checks online, not busy)
   └→ Resolves environment (health check)
   └→ Initializes executor (Playwright / Appium / WinAppDriver)
   └→ Sets up proxy if config.enable_proxy
   └→ Updates test_run status → 'running'

3. For each step:
   └→ Emits WS event: step:start
   └→ Executes action with retry logic:
       - Attempt 1: execute with normal timeout
       - On ElementNotFound: wait 2s, retry (up to 2 retries)
       - On timeout: screenshot + fail step
       - On crash detected: screenshot + fail step + create crash_event
   └→ Takes screenshot if configured
   └→ Records step result to DB
   └→ Emits WS event: step:complete

4. After all steps:
   └→ Collects artifacts (video, HAR, trace)
   └→ Uploads to MinIO
   └→ Calculates summary
   └→ Updates test_run status → 'passed' / 'failed'
   └→ Emits WS event: run:complete
```

## Parallel Execution

For running a suite across multiple devices:

```
POST /api/test-runs/start
  Body: {
    "type": "automated",
    "suite_id": "uuid",
    "device_ids": ["uuid-1", "uuid-2", "uuid-3"],  ← multiple devices
    "environment_id": "uuid",
    ...
  }
```

Backend creates one `test_run` per device, all sharing a parent `correlation_id`. Each is queued independently. The frontend shows a matrix view of all parallel runs.

## Scheduling

BullMQ supports cron-based repeatable jobs:

```typescript
await testExecutionQueue.add('scheduled-smoke', {
  suite_id: 'uuid',
  device_id: 'uuid',
  environment_id: 'uuid',
}, {
  repeat: { cron: '0 6 * * 1-5' }  // 6 AM weekdays
});
```

---

# 8. MANUAL TEST SESSION SYSTEM

## UI Flow

```
┌──────────────────────────────────────────┐
│  New Manual Test Session                 │
│                                          │
│  Device:     [▼ Tab-A8-001 (online)]     │
│  Environment:[▼ Local Dev (192.168.1.10)]│
│  App Target: [▼ POS App Android]         │
│  Test Case:  [▼ Checkout Flow (optional)]│
│                                          │
│  [Start Session]                         │
└──────────────────────────────────────────┘

         ↓ After starting ↓

┌──────────────────────────────────────────┐
│  Session: run-20260401-xyz789            │
│  Device: Tab-A8-001 | Env: Local Dev    │
│  Duration: 00:04:23          [■ Stop]    │
├──────────────────────────────────────────┤
│  Steps                                   │
│  ┌────┬───────────────────┬──────┬─────┐ │
│  │ #  │ Action            │Status│Notes│ │
│  ├────┼───────────────────┼──────┼─────┤ │
│  │ 1  │ Open login screen │  ✓   │     │ │
│  │ 2  │ Enter credentials │  ✓   │     │ │
│  │ 3  │ Tap login button  │  ✗   │ 500 │ │
│  │ +  │ [Add step...]     │      │     │ │
│  └────┴───────────────────┴──────┴─────┘ │
│                                          │
│  [📷 Screenshot] [📝 Add Note]           │
│                                          │
│  Live Logs ──────────────────────────     │
│  12:04:01 [INFO] POST /api/auth 200      │
│  12:04:02 [ERROR] POST /api/orders 500   │
│  12:04:02 [ERROR] OrderService: null ref  │
└──────────────────────────────────────────┘
```

## Backend Flow

1. `POST /api/sessions/start` → creates `test_run` with type='manual', returns `correlation_id`
2. Frontend opens WS connection to `test-run:<uuid>` for live log streaming
3. If a pre-defined test case was selected, steps are pre-populated; otherwise tester adds ad-hoc steps
4. For each step, tester: describes action → executes on device → marks pass/fail → optionally attaches screenshot
5. `POST /api/sessions/:runId/step` for each step result
6. Screenshots uploaded via `POST /api/sessions/:runId/screenshot`
7. Backend correlates any agent-streamed logs/traces to this run via `correlation_id`
8. `POST /api/sessions/:runId/complete` finalizes the run, triggers report generation

## Optional: Action Recording

If the device agent is connected and the app is instrumented (or running through Appium):
- Agent captures tap events → streams to backend → displayed in real-time in the session UI
- These recorded events can be exported as a new test case (record & replay)

---

# 9. API TRACE COLLECTION

## Architecture

```
┌──────────┐     ┌──────────────┐     ┌───────────┐
│  Device   │────▶│  mitmproxy   │────▶│  Target   │
│  (SUT)    │◀────│  (port 8080) │◀────│  Server   │
└──────────┘     └──────┬───────┘     └───────────┘
                        │
                   Python addon
                   streams to
                        │
                 ┌──────▼───────┐
                 │  QARevel API  │
                 │  POST /traces │
                 └──────────────┘
```

## mitmproxy Addon

```python
# proxy_addon.py
import json
import httpx
from mitmproxy import http

BACKEND_URL = "http://api:3000/api/traces/batch"
SENSITIVE_FIELDS = {"password", "token", "secret", "authorization", "cookie", "api_key"}
buffer = []

def mask_sensitive(data: dict) -> dict:
    if not isinstance(data, dict):
        return data
    return {
        k: "***MASKED***" if any(s in k.lower() for s in SENSITIVE_FIELDS) else v
        for k, v in data.items()
    }

def response(flow: http.HTTPFlow):
    # Extract correlation_id from custom header (injected by app/test)
    correlation_id = flow.request.headers.get("X-Correlation-Id", "unknown")

    trace = {
        "correlation_id": correlation_id,
        "method": flow.request.method,
        "url": flow.request.pretty_url,
        "request_headers": mask_sensitive(dict(flow.request.headers)),
        "request_body": mask_sensitive(parse_body(flow.request.content)),
        "status_code": flow.response.status_code,
        "response_headers": dict(flow.response.headers),
        "response_body": truncate(flow.response.content, max_kb=100),
        "response_time_ms": int((flow.response.timestamp_end - flow.request.timestamp_start) * 1000),
        "captured_at": flow.request.timestamp_start,
    }
    buffer.append(trace)

    if len(buffer) >= 10:  # batch flush
        flush()

def flush():
    global buffer
    if not buffer:
        return
    httpx.post(BACKEND_URL, json={"traces": buffer}, headers={"X-Agent-Token": AGENT_TOKEN})
    buffer = []
```

## Linking Traces to Test Steps

1. Before each test step executes, the automation sets a custom header `X-Correlation-Id: <correlation_id>` and `X-Step-Number: <n>` on the device/browser
2. For Playwright: use `page.route('**/*', route => { route.continue({ headers: { ...route.request().headers(), 'X-Correlation-Id': correlationId } }); })`
3. For Android: configure the app's HTTP client to inject the header (requires app cooperation or use mitmproxy's script to tag by timing correlation)
4. Backend links `api_traces` to `test_step_results` via `correlation_id` + timestamp proximity

## Sensitive Data Protection

- **Header masking:** `Authorization`, `Cookie`, `X-Api-Key` values replaced with `***MASKED***`
- **Body masking:** Fields containing `password`, `secret`, `token`, `ssn`, `card_number` masked
- **Configurable:** Masking rules stored in environment config, expandable per project
- **No storage of raw auth tokens:** Only masked versions persisted

---

# 10. CLICK / EVENT TRACKING

## Capture Methods by Platform

### Web (Playwright)
```typescript
// Injected into page via page.addInitScript()
window.__qarevel_events = [];
document.addEventListener('click', (e) => {
  const target = e.target as HTMLElement;
  window.__qarevel_events.push({
    event_type: 'click',
    target_element: getCSSSelector(target),
    target_text: target.textContent?.slice(0, 200),
    screen_name: document.title,
    coordinates: { x: e.clientX, y: e.clientY },
    timestamp: new Date().toISOString(),
  });
}, true);

// Also capture: input, change, popstate (navigation)
```

The runner periodically collects `window.__qarevel_events` and flushes to the backend.

### Android (Appium + Accessibility)
- Appium's UiAutomator2 logs all actions taken via the driver
- The runner wraps each Appium action to emit a click_event:
```typescript
async tap(selector: string) {
  const element = await driver.$(selector);
  const text = await element.getText();
  const location = await element.getLocation();
  await element.click();
  this.emitEvent({ event_type: 'tap', target_element: selector, target_text: text, coordinates: location });
}
```

### Windows (WinAppDriver)
- Similar wrapping around WinAppDriver actions
- Process monitor captures window title changes as navigation events

## Storage & Debugging

Events are stored in `click_events` with full indexing on `correlation_id` and `test_run_id`.

**Debugging use cases:**
- **Crash replay:** When a crash occurs, query last 20 click_events before crash timestamp → shows exact user path
- **Test failure analysis:** Click trail shows what the tester/automation actually did vs. expected
- **Heatmaps:** Aggregate click coordinates per screen for UX analysis (future feature)

---

# 11. CRASH & ERROR MONITORING

## Detection by Platform

### Android
- **App crash:** `adb logcat *:E` filtered for `FATAL EXCEPTION`, `AndroidRuntime`
- **ANR:** `adb logcat` filtered for `ANR in`
- **Detection script in runner:**
```typescript
const logcat = spawn('adb', ['-s', serial, 'logcat', '-v', 'time']);
logcat.stdout.on('data', (data) => {
  const line = data.toString();
  if (line.includes('FATAL EXCEPTION')) {
    // Accumulate stack trace lines until next timestamp
    // Create crash_event with severity: 'crash'
  }
  if (line.includes('ANR in')) {
    // Create crash_event with severity: 'anr'
  }
});
```

### Windows
- **Process exit monitoring:** Watch target process, capture exit code
- **Windows Error Reporting:** Parse `%LOCALAPPDATA%\CrashDumps` for minidumps
- **Event Log:** Monitor Application event log for Error entries from target app

### Browser
- **JS errors:** `page.on('pageerror', error => ...)` captures uncaught exceptions
- **Console errors:** `page.on('console', msg => { if (msg.type() === 'error') ... })`
- **Network failures:** `page.on('requestfailed', request => ...)` captures failed requests

## Crash Event Enrichment

When a crash is detected:

1. Capture screenshot immediately (if possible)
2. Query last 10 `click_events` for this `correlation_id` → store as `last_actions`
3. Query last 5 `api_traces` for this `correlation_id` → store as `last_api_calls`
4. Collect device state: battery, memory, CPU, disk space → store as `device_state`
5. Full stack trace stored in `stack_trace` field

## Severity Levels

| Level | Description | Auto-action |
|-------|-------------|-------------|
| `crash` | App process terminated unexpectedly | Stop test run, screenshot, full dump |
| `anr` | App Not Responding (Android) / hung (Windows) | Screenshot, wait 30s, retry or fail |
| `error` | Unhandled exception (app continues) | Log, continue test, flag step |
| `warning` | Handled error or degraded state | Log only |

---

# 12. LOAD / STRESS TESTING

## Architecture

```
                    ┌──────────────┐
                    │  Backend API  │
                    │  orchestrator │
                    └──────┬───────┘
                           │ BullMQ
            ┌──────────────┼──────────────┐
            │              │              │
     ┌──────▼─────┐ ┌─────▼──────┐ ┌─────▼──────┐
     │  Runner 1  │ │  Runner 2  │ │  Runner N  │
     │ 10 browsers│ │ 10 browsers│ │ 10 browsers│
     └────────────┘ └────────────┘ └────────────┘
            │              │              │
            └──────────────┼──────────────┘
                           │
                    ┌──────▼───────┐
                    │  Target App  │
                    └──────────────┘
```

## Configuration

```json
{
  "type": "load",
  "suite_id": "uuid",
  "environment_id": "uuid",
  "load_config": {
    "concurrent_users": 50,
    "ramp_up_seconds": 60,
    "duration_seconds": 300,
    "think_time_ms": 2000,
    "scenarios": [
      { "name": "checkout_flow", "weight": 70, "test_case_id": "uuid" },
      { "name": "refund_flow", "weight": 20, "test_case_id": "uuid" },
      { "name": "login_only", "weight": 10, "test_case_id": "uuid" }
    ]
  }
}
```

## Orchestration

1. Backend creates a parent `test_run` with type='load'
2. Calculates distribution: 50 users × weights → 35 checkout, 10 refund, 5 login
3. Creates BullMQ jobs with staggered delays (ramp-up)
4. Each runner spins up Playwright browser contexts (not full browsers — lightweight)
5. `think_time_ms` adds realistic delay between steps

## Metrics Collected

- **Throughput:** requests/second over time
- **Response times:** p50, p90, p95, p99 per endpoint
- **Error rate:** % of failed requests over time
- **Concurrent users:** active at each second
- **Resource utilization:** if target server exposes metrics

Metrics stored as time-series JSONB in the `test_run.summary` field and in detailed `api_traces`.

## Limits

- Max concurrent browser contexts per runner: 20 (configurable based on machine resources)
- Max runners: limited by available machines (horizontal scaling)
- Max test duration: 1 hour (prevent runaway tests)
- Circuit breaker: if error rate > 80% for 30s, auto-stop (target is down)

---

# 13. LOGGING & OBSERVABILITY

## Correlation ID Strategy

Every test run gets a `correlation_id` in format: `run-{YYYYMMDD}-{nanoid(8)}`
Example: `run-20260401-a3bx9kf2`

This ID is:
- Set as HTTP header on all requests from the device during the test
- Attached to every log entry, API trace, click event, and crash event
- Used to query ALL data related to a single test execution

## Log Pipeline

```
Sources                    Collection             Storage           Query
──────                    ──────────             ───────           ─────
App logs ─────────┐
Device logs ──────┤      ┌────────────┐      ┌──────────┐     ┌─────────┐
Automation logs ──┼─────▶│ OTEL       │─────▶│ Grafana  │────▶│ Grafana │
Agent logs ───────┤      │ Collector  │      │ Loki     │     │ UI      │
Proxy logs ───────┘      └─────┬──────┘      └──────────┘     └─────────┘
                               │
                         ┌─────▼──────┐
                         │ PostgreSQL │  (also stored for in-app queries)
                         │ log_entries│
                         └────────────┘
```

**Dual storage rationale:** Loki for powerful log querying/alerting via Grafana. PostgreSQL `log_entries` for in-app display (the live log panel in sessions, linking logs to test steps in reports). Logs older than 30 days purged from PostgreSQL but retained in Loki for 90 days.

## Log Entry Structure

```json
{
  "correlation_id": "run-20260401-a3bx9kf2",
  "source": "automation",
  "level": "info",
  "message": "Step 3: Clicked #pay-button",
  "metadata": {
    "test_run_id": "uuid",
    "step_number": 3,
    "device_id": "uuid",
    "executor": "playwright"
  },
  "timestamp": "2026-04-01T12:04:01.234Z"
}
```

## Querying

**In-app (PostgreSQL):**
```sql
SELECT * FROM log_entries
WHERE correlation_id = 'run-20260401-a3bx9kf2'
  AND level IN ('error', 'fatal')
ORDER BY timestamp ASC;
```

**Grafana (Loki):**
```logql
{source="automation"} |= "run-20260401-a3bx9kf2" | json | level = "error"
```

---

# 14. REPORTING SYSTEM

## Report Structure

```json
{
  "report_id": "uuid",
  "test_run_id": "uuid",
  "generated_at": "2026-04-01T12:30:00Z",
  "summary": {
    "title": "Checkout Flow - Local Dev - Tab-A8-001",
    "status": "failed",
    "duration_ms": 45230,
    "total_steps": 12,
    "passed": 10,
    "failed": 1,
    "skipped": 1,
    "error_rate": "8.3%"
  },
  "environment": {
    "name": "Local Dev",
    "base_url": "http://192.168.1.10:3000"
  },
  "device": {
    "name": "Tab-A8-001",
    "platform": "android",
    "os_version": "13"
  },
  "steps": [
    {
      "number": 1,
      "action": "Navigate to login",
      "status": "passed",
      "duration_ms": 1200,
      "screenshot_url": "https://minio/screenshots/run-xxx/step-1.png"
    },
    {
      "number": 7,
      "action": "Submit payment",
      "status": "failed",
      "duration_ms": 10000,
      "error": "Element #confirm-btn not found after 10s timeout",
      "screenshot_url": "https://minio/screenshots/run-xxx/step-7-failure.png",
      "api_calls": [
        { "method": "POST", "url": "/api/payments", "status": 500, "time_ms": 2340 }
      ]
    }
  ],
  "crashes": [],
  "api_summary": {
    "total_calls": 23,
    "failed_calls": 1,
    "avg_response_ms": 180,
    "p95_response_ms": 450,
    "slowest": { "method": "POST", "url": "/api/payments", "time_ms": 2340 }
  },
  "performance": {
    "avg_step_duration_ms": 3769,
    "slowest_step": { "number": 7, "duration_ms": 10000 }
  }
}
```

## Generation Flow

1. `POST /api/reports/generate` → BullMQ job queued
2. Worker aggregates: test_step_results + log_entries + api_traces + crash_events + attachments
3. Generates JSON report (stored in DB `reports.summary`)
4. Optionally renders HTML report → uploads to MinIO
5. Updates `reports.status` → 'ready'
6. Emits WS event so frontend updates in real-time

## Frontend Report View

- **Summary card:** pass/fail badge, duration, device info
- **Step timeline:** expandable accordion, each step shows status + screenshot + logs + API calls
- **API tab:** table of all API calls with status codes, response times, filterable
- **Errors tab:** all errors and crashes with stack traces
- **Performance tab:** charts showing step durations, API response time distribution
- **Download:** HTML report, JSON export, PDF (future)

---

# 15. REAL-TIME VS ASYNC FLOWS

## Real-Time (WebSocket)

| Event | Source | Consumer |
|-------|--------|----------|
| Test step progress | Runner → Backend WS Gateway | Frontend test run view |
| Live log streaming | Agent/Runner → Backend | Frontend session log panel |
| Device status change | Agent heartbeat → Backend | Frontend device list |
| Manual session events | Tester actions → Backend | Session participants |
| Crash notification | Agent → Backend | Frontend alert banner |

**Implementation:** NestJS `@WebSocketGateway()` with Socket.IO. Redis adapter for multi-instance pub/sub:

```typescript
@WebSocketGateway({ namespace: '/ws', cors: true })
export class EventsGateway {
  @SubscribeMessage('subscribe')
  handleSubscribe(client: Socket, channel: string) {
    client.join(channel);  // e.g., 'test-run:uuid'
  }

  emitToRun(runId: string, event: string, data: any) {
    this.server.to(`test-run:${runId}`).emit(event, data);
  }
}
```

## Async (BullMQ Queues)

| Queue | Job | Priority |
|-------|-----|----------|
| `test-execution` | Run automation steps on device | High |
| `report-generation` | Aggregate data + generate report | Medium |
| `log-processing` | Batch insert logs to DB + forward to Loki | Medium |
| `artifact-processing` | Compress videos, generate thumbnails | Low |
| `load-test` | Spin up concurrent browser sessions | High |
| `cleanup` | Purge old logs, expired sessions | Low (scheduled) |

```typescript
// Queue configuration
@Module({
  imports: [
    BullModule.registerQueue(
      { name: 'test-execution', defaultJobOptions: { attempts: 1, timeout: 300000 } },
      { name: 'report-generation', defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: 5000 } } },
      { name: 'log-processing', defaultJobOptions: { attempts: 3 } },
      { name: 'artifact-processing', defaultJobOptions: { attempts: 2 } },
    ),
  ],
})
```

---

# 16. SECURITY

## Authentication

- **JWT with RS256:** Asymmetric signing. Backend holds private key, clients verify with public key.
- **Access token:** 1 hour expiry, stored in memory (frontend)
- **Refresh token:** 7 day expiry, stored in httpOnly cookie
- **Agent token:** Long-lived (90 days), scoped to device-only endpoints (`/logs`, `/traces`, `/events`, `/heartbeat`)

```typescript
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: readFileSync('/keys/public.pem'),
      algorithms: ['RS256'],
    });
  }
}
```

## Role-Based Access Control

| Role | Permissions |
|------|------------|
| `admin` | Everything: user management, device management, all CRUD |
| `lead` | Create/edit tests, run tests, manage devices, view all reports |
| `tester` | Run tests, create manual sessions, view own reports |
| `viewer` | Read-only access to reports and dashboards |

```typescript
@Injectable()
export class RolesGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<string[]>('roles', context.getHandler());
    const user = context.switchToHttp().getRequest().user;
    return requiredRoles.some(role => user.role === role);
  }
}

// Usage:
@Roles('admin', 'lead')
@UseGuards(JwtAuthGuard, RolesGuard)
@Post('devices/register')
registerDevice() { ... }
```

## Sensitive Data

- **API trace masking:** Applied at ingestion time (proxy addon + backend validation)
- **Environment secrets:** `auth_config` field encrypted at rest using AES-256-GCM, key from env var
- **No plaintext passwords:** bcrypt with cost factor 12
- **Audit log:** All destructive actions logged (who deleted what, when)

## Agent Communication Security

- Agent tokens are scoped JWTs with `sub: device:<uuid>`, `scope: ['agent']`
- WebSocket connections validated on handshake
- Agents can only write data for their own `device_id`
- Rate limiting on ingestion endpoints: 100 req/s per agent

---

# 17. DOCKER / DEPLOYMENT

## docker-compose.yml

```yaml
version: "3.8"

services:
  # ── Core Services ──────────────────────────────
  api:
    build:
      context: .
      dockerfile: infrastructure/docker/Dockerfile.api
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://qarevel:qarevel@postgres:5432/qarevel
      - REDIS_URL=redis://redis:6379
      - MINIO_ENDPOINT=minio
      - MINIO_PORT=9000
      - MINIO_ACCESS_KEY=qarevel
      - MINIO_SECRET_KEY=qarevel123
      - JWT_PRIVATE_KEY_PATH=/keys/private.pem
      - JWT_PUBLIC_KEY_PATH=/keys/public.pem
    volumes:
      - ./keys:/keys:ro
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

  web:
    build:
      context: .
      dockerfile: infrastructure/docker/Dockerfile.web
    ports:
      - "3001:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:3000
      - NEXT_PUBLIC_WS_URL=ws://localhost:3000/ws

  runner:
    build:
      context: .
      dockerfile: infrastructure/docker/Dockerfile.runner
    environment:
      - DATABASE_URL=postgresql://qarevel:qarevel@postgres:5432/qarevel
      - REDIS_URL=redis://redis:6379
      - MINIO_ENDPOINT=minio
      - MINIO_PORT=9000
      - MINIO_ACCESS_KEY=qarevel
      - MINIO_SECRET_KEY=qarevel123
      - API_INTERNAL_URL=http://api:3000
    volumes:
      - /dev/bus/usb:/dev/bus/usb  # USB passthrough for Android ADB
    privileged: true                # needed for ADB

  # ── Data Stores ────────────────────────────────
  postgres:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_DB=qarevel
      - POSTGRES_USER=qarevel
      - POSTGRES_PASSWORD=qarevel
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./infrastructure/db/init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U qarevel"]
      interval: 5s
      timeout: 3s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redisdata:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

  # ── Storage ────────────────────────────────────
  minio:
    image: minio/minio:latest
    ports:
      - "9000:9000"
      - "9001:9001"    # MinIO Console
    environment:
      - MINIO_ROOT_USER=qarevel
      - MINIO_ROOT_PASSWORD=qarevel123
    volumes:
      - miniodata:/data
    command: server /data --console-address ":9001"

  # ── API Trace Proxy ────────────────────────────
  proxy:
    build:
      context: .
      dockerfile: infrastructure/docker/Dockerfile.proxy
    ports:
      - "8080:8080"    # HTTP proxy port
    environment:
      - BACKEND_URL=http://api:3000/api/traces/batch
      - AGENT_TOKEN=${PROXY_AGENT_TOKEN}

  # ── Observability ──────────────────────────────
  otel-collector:
    image: otel/opentelemetry-collector-contrib:latest
    ports:
      - "4317:4317"    # OTLP gRPC
      - "4318:4318"    # OTLP HTTP
    volumes:
      - ./infrastructure/otel/otel-collector-config.yaml:/etc/otelcol-contrib/config.yaml

  loki:
    image: grafana/loki:2.9.0
    ports:
      - "3100:3100"
    volumes:
      - lokidata:/loki

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3002:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - ./infrastructure/grafana/provisioning:/etc/grafana/provisioning
      - grafanadata:/var/lib/grafana

volumes:
  pgdata:
  redisdata:
  miniodata:
  lokidata:
  grafanadata:
```

## Running Locally

```bash
# 1. Generate JWT keys
mkdir -p keys
openssl genrsa -out keys/private.pem 2048
openssl rsa -in keys/private.pem -pubout -out keys/public.pem

# 2. Copy env file
cp .env.example .env

# 3. Start everything
docker compose up -d

# 4. Run DB migrations
docker compose exec api npm run migration:run

# 5. Seed admin user
docker compose exec api npm run seed:admin

# 6. Access
# Frontend:  http://localhost:3001
# API:       http://localhost:3000/api
# Swagger:   http://localhost:3000/api/docs
# Grafana:   http://localhost:3002
# MinIO:     http://localhost:9001
```

---

# 18. MVP SCOPE (STRICT)

## MVP Includes

| Feature | Scope |
|---------|-------|
| Auth | Email/password login, JWT, admin + tester roles |
| Users | Admin can create users, basic profile |
| Devices | Register, list, heartbeat, online/offline status |
| Environments | CRUD, health check |
| App Targets | CRUD (web only for MVP) |
| Test Cases | CRUD with steps (manual type only for MVP) |
| Manual Sessions | Start session, record steps, pass/fail, screenshots, notes |
| Browser Automation | Playwright: run step-based test cases on Chrome |
| Logs | Ingest from runner, display in session, filter by level |
| Reports | Basic JSON report: summary, step results, screenshots |
| Dashboard | Device status overview, recent test runs, pass/fail trends |

## MVP Excludes

- Windows agent / WinAppDriver
- Android agent / Appium (added in phase 2)
- Load/stress testing
- API trace proxy (mitmproxy)
- Click event tracking
- Crash monitoring (beyond basic Playwright error capture)
- Grafana/Loki stack (use PostgreSQL logs only)
- Video recording
- Test scheduling (cron)
- PDF report export
- Record & replay
- Advanced RBAC (lead/viewer roles)

## MVP Architecture (Simplified)

```
Frontend (Next.js) ←→ Backend (NestJS) ←→ PostgreSQL
                           ↕                    ↕
                         Redis/BullMQ        MinIO
                           ↕
                     Playwright Runner
```

Only 5 containers: web, api, postgres, redis, minio

---

# 19. IMPLEMENTATION PLAN

## Week 1: Foundation

**Days 1-2: Repository Setup**
- Initialize Turborepo monorepo
- Configure TypeScript, ESLint, Prettier across packages
- Set up `shared-types` package
- Create Dockerfiles and `docker-compose.yml`
- Set up PostgreSQL with TypeORM, create initial migration
- Generate JWT key pair, configure env variables

**Days 3-4: Authentication**
- Implement `users` table + entity
- NestJS auth module: register (admin-only), login, refresh, me
- JWT strategy with RS256
- Roles guard (admin, tester)
- Password hashing with bcrypt
- Seed script for initial admin user
- Frontend: login page, auth context, protected routes

**Day 5: Frontend Shell**
- Next.js app with App Router
- Layout: sidebar navigation, header with user menu
- shadcn/ui setup: Button, Input, Card, Table, Dialog, Toast
- API client setup with fetch + auth interceptor
- Dark/light mode toggle

## Week 2: Core Entities

**Days 1-2: Devices**
- Backend: devices CRUD module, register endpoint, heartbeat endpoint
- Agent token generation (scoped JWT)
- Device status management (online/offline based on heartbeat)
- Frontend: device list page (table with status badges), register device dialog

**Days 3-4: Environments + App Targets**
- Backend: environments CRUD, health check endpoint (backend pings URL)
- Backend: app_targets CRUD
- Frontend: environments page, app targets page
- Health check indicator (green/red dot)

**Day 5: Test Cases + Steps**
- Backend: test_cases CRUD, test_steps CRUD with ordering
- Frontend: test case list, test case editor with step builder
- Drag-and-drop step reordering (dnd-kit)
- Tag management for test cases

## Week 3: Manual Testing

**Days 1-2: Manual Session Backend**
- Sessions module: start, add step, upload screenshot, complete
- Test runs table: create run with type='manual'
- Test step results: record pass/fail per step
- Screenshot upload to MinIO with presigned URL generation

**Days 3-4: Manual Session Frontend**
- Session start wizard: select device, environment, app target, optional test case
- Session view: step list, pass/fail buttons, notes input, screenshot upload
- Pre-populated steps from test case (editable during session)
- Timer showing session duration

**Day 5: WebSocket Live Updates**
- NestJS WebSocket gateway with Socket.IO
- Redis adapter for pub/sub
- Frontend: subscribe to session channel, show live updates
- Device status real-time updates on device list

## Week 4: Browser Automation

**Days 1-2: Playwright Runner**
- Runner service: BullMQ worker consuming `test-execution` queue
- Playwright executor: launch browser, execute step-based test cases
- Step interpretation: navigate, click, fill, assert_visible, assert_text, screenshot
- Variable interpolation: `{{env.base_url}}`, `{{env.PASSWORD}}`

**Days 3-4: Automation Integration**
- Backend: start automated test run → enqueue to BullMQ
- Runner streams step results back via WS
- Frontend: test run progress view (live step updates)
- Error handling: screenshot on failure, timeout handling, retry logic

**Day 5: Test Suites**
- Backend: test_suites CRUD, test_suite_cases junction management
- Run entire suite: sequential execution of all cases
- Frontend: suite builder (add/remove/reorder cases), run suite button

## Week 5: Logging + Reports

**Days 1-2: Logging System**
- Log ingestion endpoint (batch)
- Runner captures Playwright console logs, sends to backend
- Frontend: log viewer component with level filtering (debug/info/warn/error)
- Log panel in session view and test run view
- Correlation ID linking logs to test runs

**Days 3-4: Report Generation**
- Report generation BullMQ worker
- Aggregates: step results + screenshots + logs + errors
- JSON report structure (as defined in section 14)
- Frontend: report view page with summary card, step accordion, error tab
- Report list with status badges and links

**Day 5: Dashboard**
- Dashboard page: device status grid, recent test runs table
- Stats cards: total runs today, pass rate, active sessions
- Simple charts: pass/fail trend over last 7 days (recharts)
- Quick actions: start session, run test

## Week 6: Polish + Hardening

**Days 1-2: Error Handling + Edge Cases**
- Global error handling (NestJS exception filters)
- Frontend error boundaries
- Device disconnect handling (mark test as error)
- Stale session cleanup (mark abandoned sessions after 2h)

**Days 3-4: Testing**
- Backend unit tests: auth, device registration, test run lifecycle
- Backend integration tests: full test run flow
- Frontend component tests: login, session flow
- E2E test: Playwright tests for QARevel itself (meta!)

**Day 5: Documentation + Demo**
- API docs (Swagger auto-generated, review and annotate)
- README with setup instructions
- Demo walkthrough: register device → create test → run manual session → run automation → view report

---

## Phase 2 (Weeks 7-10): Post-MVP Expansion

| Week | Focus |
|------|-------|
| 7 | Android: Appium setup, device connection via ADB, mobile test execution |
| 8 | API tracing: mitmproxy integration, trace ingestion, linking to steps |
| 9 | Click tracking, crash monitoring, enhanced reports with API & event data |
| 10 | Grafana/Loki observability stack, test scheduling, load testing foundations |

---

# 20. SUMMARY

| # | Deliverable | Status |
|---|------------|--------|
| 1 | Architecture | Defined: 5-service system with WS + REST + queue |
| 2 | Tech stack | Next.js, NestJS, PostgreSQL, Redis/BullMQ, Playwright, MinIO |
| 3 | Repo structure | Turborepo monorepo with 5 apps + 2 packages |
| 4 | DB schema | 15 tables with full field definitions and indexes |
| 5 | API design | 30+ endpoints covering all modules, WS gateway |
| 6 | Agent design | Windows agent (Node.js service), Android (Appium+ADB), Browser (Playwright) |
| 7 | Automation engine | Step-based + script-based, with retry logic and parallel execution |
| 8 | Logging & tracing | Correlation ID linking, dual storage (PG + Loki), mitmproxy for API traces |
| 9 | MVP scope | Web-only testing: auth, devices, environments, manual sessions, Playwright automation, logs, basic reports |
| 10 | Implementation plan | 6-week MVP build with daily breakdowns |

This plan is build-ready. Every component has concrete technology choices, data structures, and integration points defined. Start with Week 1, Day 1.
