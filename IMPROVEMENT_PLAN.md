# QARevel Advanced Testing & Predictive Error Detection - Improvement Plan

## Context

QARevel currently captures basic test data (clicks, network, screenshots on failure) but lacks intelligent error analysis, pattern detection, and prediction. The user needs the platform to **collect more error signals** and **predict errors before they happen** using historical data analysis.

---

## Phase 1: Enhanced Error Collection (Foundation)

### 1A. Console Error + Crash Capture in Test Executor
**Problem**: `PlaywrightExecutor` doesn't capture console errors or page crashes. `CrashEvent` entity exists but is never populated.

**Files to modify:**
- `apps/runner/src/executors/playwright.executor.ts` - Add `page.on('console')` and `page.on('pageerror')` listeners
- `apps/runner/src/executors/base.executor.ts` - Add `sendLogEntry()` and `sendCrashEvent()` helper methods

**New module:**
- `apps/api/src/modules/crash-events/` - Controller with `POST /api/crash-events` and `GET /api/crash-events`

### 1B. Auto-Screenshot on Console Errors
**Files to modify:**
- `apps/runner/src/executors/playwright.executor.ts` - In console error listener, take screenshot + upload to MinIO

### 1C. DOM Snapshot on Failures
**Files to modify:**
- `apps/runner/src/executors/base.executor.ts` - Add `uploadDomSnapshot()` method
- `apps/runner/src/executors/playwright.executor.ts` - Call `page.content()` in catch block, upload snapshot
- `apps/api/src/database/entities/test-step-result.entity.ts` - Add `domSnapshotKey` column

### 1D. Performance Metrics (Memory, DOM Nodes)
**New entity:** `PerformanceSample` (testRunId, jsHeapUsedMB, jsHeapTotalMB, domNodes, pageUrl, timestamp)

**New module:** `apps/api/src/modules/performance/` - `POST /api/performance-samples`, `GET /api/performance-samples`

**Files to modify:**
- `apps/runner/src/executors/playwright.executor.ts` - Collect `performance.memory` + DOM node count between steps
- `apps/api/src/app.module.ts` - Import PerformanceModule

### 1E. API Response Baselines
**New entity:** `ApiResponseBaseline` (method, urlPattern, statusCode, responseBodyHash, responseBodySchema, sampleCount)

Stores "normal" API response structure to detect drift in Phase 2.

### 1F. Populate CrashEvent from Runner
**Files to modify:**
- `apps/runner/src/executors/playwright.executor.ts` - On `pageerror`, POST CrashEvent with stack trace, last actions, screenshot
- `apps/runner/src/executors/recording.executor.ts` - Same for recordings

---

## Phase 2: Smart Error Analysis

### 2A. Error Fingerprinting & Deduplication
**Problem**: Same error appears hundreds of times across runs with no grouping.

**New entities:**
- `ErrorFingerprint` (fingerprint hash, canonicalMessage, occurrenceCount, status: active/resolved/muted, testCaseIds)
- `ErrorOccurrence` (fingerprintId, testRunId, testStepResultId, occurredAt)

**New module:** `apps/api/src/modules/error-analysis/` with:
- `error-analysis.service.ts` - `processError()` computes fingerprint (SHA-256 of normalized message + top stack frame), upserts fingerprint, inserts occurrence
- `fingerprint.util.ts` - Normalizes error messages (strips UUIDs, numbers, dynamic content)
- Endpoints: `GET /api/error-fingerprints`, `GET /api/error-fingerprints/:id`, `PATCH /api/error-fingerprints/:id`

**Hook into existing flow:**
- `apps/api/src/modules/tests/tests.service.ts` line 336 (`addStepResult`) - Call `processError()` when step has errorMessage

### 2B. Flaky Test Detection
**New entity:** `TestStability` (testCaseId, environmentId, totalRuns, passedRuns, failedRuns, stabilityScore 0-1, isFlaky boolean, consecutiveFailures)

**Hook into existing flow:**
- `apps/api/src/modules/tests/tests.service.ts` line 361 (`updateRunStatus`) - On terminal status, call `stabilityService.recordOutcome()`

**Endpoints:** `GET /api/test-stability`, `GET /api/test-stability/flaky`

### 2C. Post-Run Analysis Worker (API Anomaly Detection)
**New BullMQ worker:** `apps/runner/src/workers/analysis.worker.ts` on `post-run-analysis` queue

Triggered after each test run completes. It:
1. Compares API response times against historical p95 - flags spikes >2x
2. Compares status codes against baselines - flags new error codes
3. Compares response body structure against baseline schema - flags drift
4. Correlates errors with preceding clicks/API calls (time window analysis)

**New entity:** `AnalysisAlert` (testRunId, type, severity, title, details JSONB, isAcknowledged)

Alert types: `response_time_spike`, `status_code_change`, `response_schema_drift`, `error_rate_increase`, `flaky_test`, `performance_degradation`

**Hook into existing flow:**
- `apps/api/src/modules/tests/tests.service.ts` (`updateRunStatus`) - Enqueue `post-run-analysis` job
- `apps/runner/src/main.ts` - Register analysis worker

**Endpoints:** `GET /api/alerts`, `PATCH /api/alerts/:id/acknowledge`, `GET /api/alerts/summary`

### 2D. Error Correlation
**New analyzer:** `apps/runner/src/analyzers/error-correlator.ts`

For each crash/failure, queries clicks and API calls in 10s window before error. Builds causal chain stored in alert details: `{ precedingClicks, precedingApiCalls, suspectedTrigger }`.

### 2E. Health Score
**New entity:** `HealthScore` (entityType: environment/suite/target, entityId, score 0-100, components JSONB: passRate/avgResponseTime/errorRate/flakyTestPct/crashCount)

Computed by analysis worker or hourly cron job.

**Endpoints:** `GET /api/health-scores`, `GET /api/health-scores/dashboard`

---

## Phase 3: Predictive Error Detection

### 3A. Performance Trend Analysis
**New service:** `apps/api/src/modules/error-analysis/trend.service.ts`

- Linear regression over response times per endpoint across last N runs
- Predicts when p95 will cross thresholds
- Uses PostgreSQL window functions for efficient computation

**Endpoints:** `GET /api/trends/response-time`, `GET /api/trends/error-rate`, `GET /api/trends/predictions`

### 3B. Error Rate Trending with Alerts
Rolling error rate (errors/total) over last 20 runs per test case. Creates alerts when crossing thresholds.

**Real-time alerts via WebSocket:**
- `apps/api/src/modules/gateway/events.gateway.ts` - Add `alerts:global` channel, broadcast on new critical alerts

### 3C. Configurable Alert Rules
**New entity:** `AlertRule` (name, entityType, metricType, operator, threshold, windowRuns, severity, isEnabled)

Users define custom alert rules (e.g., "alert when error rate > 30% over last 20 runs").

**Endpoints:** `GET/POST/PATCH/DELETE /api/alert-rules`

### 3D. Root Cause Suggestion
**New analyzer:** `apps/runner/src/analyzers/root-cause.analyzer.ts`

Heuristic-based suggestions:
1. Same fingerprint seen before? Show history
2. API calls returned 4xx/5xx before failure? Suggest "Backend API failure"
3. Response times spiked? Suggest "Performance degradation"
4. Test is flaky? Suggest "Stabilize selectors or add waits"

---

## Phase 4: Visual & Advanced (Future)

### 4A. Visual Regression Testing
- `VisualBaseline` entity (testStepId, screenshotKey, deviceProfile)
- `VisualDiff` entity (baselineId, diffPercentage, diffImageKey, status)
- Use `pixelmatch` npm package in PlaywrightExecutor for pixel comparison

### 4B. Network Mock/Replay (future)
### 4C. Chaos Testing - inject delays/errors (future)

---

## Frontend Changes

### New Pages
- `/insights` - Analytics dashboard: health scores, error trends, flaky tests, alerts
- `/insights/errors` - Error fingerprint list with grouping and status management
- `/insights/alerts` - Alert management and configuration
- `/insights/trends` - Performance trend charts per API endpoint

### Existing Page Updates
- `/dashboard` - Add health score card, active alerts count, flaky test count
- `/reports/[id]` - Fill in "Performance" tab (currently "coming soon") with perf samples, anomalies, root cause
- `/tests/runs/[id]` - Add "Analysis" tab with alerts, correlations, stability info

### New Components
- `TrendChart.tsx` - Line chart (recharts)
- `HealthGauge.tsx` - Circular health score gauge
- `AlertBanner.tsx` - Real-time alert toast notifications
- `ErrorFingerprintCard.tsx` - Grouped error display

### New Hook
- `useAlertSocket.ts` - Subscribe to `alerts:global` WebSocket channel for real-time notifications

---

## New Shared Types
`packages/shared-types/src/analysis.ts` - Export all new interfaces: ErrorFingerprint, AnalysisAlert, TestStability, HealthScore, AlertRule, PerformanceSample, etc.

---

## Critical Files to Modify
| File | Changes |
|------|---------|
| `apps/runner/src/executors/playwright.executor.ts` | Console capture, auto-screenshot, DOM snapshots, perf samples |
| `apps/runner/src/executors/base.executor.ts` | Helper methods for logs, crashes, snapshots |
| `apps/api/src/modules/tests/tests.service.ts` | Hook error analysis into addStepResult + updateRunStatus |
| `apps/runner/src/reporters/report.generator.ts` | Extend report with fingerprints, anomalies, health score |
| `apps/runner/src/main.ts` | Register analysis worker |
| `apps/api/src/modules/gateway/events.gateway.ts` | Add alerts channel |
| `apps/api/src/app.module.ts` | Import new modules |

---

## Verification
1. Run a recording - verify console errors, crashes, and perf samples are captured
2. Run an automated test that fails - verify error fingerprint is created, DOM snapshot stored
3. Run same failing test 5+ times - verify flaky detection triggers, stability score updates
4. Check `/insights` dashboard shows health scores and alerts
5. Intentionally degrade an API endpoint response time - verify anomaly alert fires
6. Check WebSocket delivers real-time alert notifications
