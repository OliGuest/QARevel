-- QARevel Database Initialization
-- Generated from ARCHITECTURE.md schema definitions

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- users
-- ============================================================================
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    display_name    VARCHAR(100) NOT NULL,
    role            VARCHAR(20) NOT NULL DEFAULT 'tester',
    is_active       BOOLEAN DEFAULT true,
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- devices
-- ============================================================================
CREATE TABLE devices (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(100) NOT NULL,
    platform        VARCHAR(20) NOT NULL,
    os_version      VARCHAR(50),
    model           VARCHAR(100),
    serial_number   VARCHAR(100) UNIQUE,
    ip_address      INET,
    agent_version   VARCHAR(20),
    status          VARCHAR(20) DEFAULT 'offline',
    capabilities    JSONB DEFAULT '{}',
    last_heartbeat  TIMESTAMPTZ,
    registered_by   UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_devices_status ON devices(status);
CREATE INDEX idx_devices_platform ON devices(platform);

-- ============================================================================
-- environments
-- ============================================================================
CREATE TABLE environments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(100) NOT NULL,
    type            VARCHAR(20) NOT NULL,
    base_url        VARCHAR(500) NOT NULL,
    description     TEXT,
    health_check_url VARCHAR(500),
    auth_config     JSONB DEFAULT '{}',
    is_active       BOOLEAN DEFAULT true,
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- app_targets
-- ============================================================================
CREATE TABLE app_targets (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(100) NOT NULL,
    platform        VARCHAR(20) NOT NULL,
    package_name    VARCHAR(200),
    executable_path VARCHAR(500),
    url_pattern     VARCHAR(500),
    version         VARCHAR(50),
    apk_storage_key VARCHAR(200),
    config          JSONB DEFAULT '{}',
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- test_cases
-- ============================================================================
CREATE TABLE test_cases (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title           VARCHAR(300) NOT NULL,
    description     TEXT,
    app_target_id   UUID REFERENCES app_targets(id),
    platform        VARCHAR(20) NOT NULL,
    priority        VARCHAR(10) DEFAULT 'medium',
    type            VARCHAR(20) DEFAULT 'manual',
    tags            TEXT[] DEFAULT '{}',
    preconditions   TEXT,
    automation_code TEXT,
    estimated_duration_sec INT,
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_test_cases_tags ON test_cases USING GIN(tags);
CREATE INDEX idx_test_cases_platform ON test_cases(platform);

-- ============================================================================
-- test_steps
-- ============================================================================
CREATE TABLE test_steps (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_case_id    UUID NOT NULL REFERENCES test_cases(id) ON DELETE CASCADE,
    step_number     INT NOT NULL,
    action          TEXT NOT NULL,
    expected_result TEXT,
    selector        VARCHAR(500),
    selector_type   VARCHAR(20),
    input_data      JSONB,
    timeout_ms      INT DEFAULT 10000,
    is_optional     BOOLEAN DEFAULT false,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(test_case_id, step_number)
);

-- ============================================================================
-- test_suites
-- ============================================================================
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

-- ============================================================================
-- test_suite_cases (junction)
-- ============================================================================
CREATE TABLE test_suite_cases (
    suite_id        UUID NOT NULL REFERENCES test_suites(id) ON DELETE CASCADE,
    test_case_id    UUID NOT NULL REFERENCES test_cases(id) ON DELETE CASCADE,
    execution_order INT NOT NULL,
    PRIMARY KEY (suite_id, test_case_id)
);

-- ============================================================================
-- test_runs
-- ============================================================================
CREATE TABLE test_runs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    suite_id        UUID REFERENCES test_suites(id),
    test_case_id    UUID REFERENCES test_cases(id),
    device_id       UUID NOT NULL REFERENCES devices(id),
    environment_id  UUID NOT NULL REFERENCES environments(id),
    app_target_id   UUID NOT NULL REFERENCES app_targets(id),
    triggered_by    UUID NOT NULL REFERENCES users(id),
    type            VARCHAR(20) NOT NULL,
    status          VARCHAR(20) DEFAULT 'pending',
    correlation_id  VARCHAR(50) UNIQUE NOT NULL,
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    duration_ms     INT,
    summary         JSONB,
    config          JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_test_runs_status ON test_runs(status);
CREATE INDEX idx_test_runs_correlation ON test_runs(correlation_id);
CREATE INDEX idx_test_runs_created ON test_runs(created_at DESC);

-- ============================================================================
-- test_step_results
-- ============================================================================
CREATE TABLE test_step_results (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_run_id     UUID NOT NULL REFERENCES test_runs(id) ON DELETE CASCADE,
    test_step_id    UUID REFERENCES test_steps(id),
    step_number     INT NOT NULL,
    status          VARCHAR(20) NOT NULL,
    actual_result   TEXT,
    error_message   TEXT,
    screenshot_key  VARCHAR(200),
    duration_ms     INT,
    notes           TEXT,
    executed_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_step_results_run ON test_step_results(test_run_id);

-- ============================================================================
-- log_entries
-- ============================================================================
CREATE TABLE log_entries (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_run_id     UUID REFERENCES test_runs(id),
    correlation_id  VARCHAR(50) NOT NULL,
    source          VARCHAR(50) NOT NULL,
    level           VARCHAR(10) NOT NULL,
    message         TEXT NOT NULL,
    metadata        JSONB DEFAULT '{}',
    device_id       UUID REFERENCES devices(id),
    timestamp       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_logs_correlation ON log_entries(correlation_id);
CREATE INDEX idx_logs_timestamp ON log_entries(timestamp DESC);
CREATE INDEX idx_logs_level ON log_entries(level);

-- ============================================================================
-- api_traces
-- ============================================================================
CREATE TABLE api_traces (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_run_id     UUID REFERENCES test_runs(id),
    test_step_result_id UUID REFERENCES test_step_results(id),
    correlation_id  VARCHAR(50) NOT NULL,
    method          VARCHAR(10) NOT NULL,
    url             VARCHAR(2000) NOT NULL,
    request_headers JSONB,
    request_body    JSONB,
    status_code     INT,
    response_headers JSONB,
    response_body   JSONB,
    response_time_ms INT,
    error           TEXT,
    captured_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_traces_correlation ON api_traces(correlation_id);
CREATE INDEX idx_traces_run ON api_traces(test_run_id);
CREATE INDEX idx_traces_status ON api_traces(status_code);

-- ============================================================================
-- click_events
-- ============================================================================
CREATE TABLE click_events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_run_id     UUID REFERENCES test_runs(id),
    test_step_result_id UUID REFERENCES test_step_results(id),
    correlation_id  VARCHAR(50) NOT NULL,
    event_type      VARCHAR(30) NOT NULL,
    target_element  VARCHAR(500),
    target_text     VARCHAR(200),
    screen_name     VARCHAR(200),
    coordinates     POINT,
    input_value     VARCHAR(500),
    device_id       UUID REFERENCES devices(id),
    timestamp       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_clicks_correlation ON click_events(correlation_id);
CREATE INDEX idx_clicks_run ON click_events(test_run_id);

-- ============================================================================
-- crash_events
-- ============================================================================
CREATE TABLE crash_events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_run_id     UUID REFERENCES test_runs(id),
    correlation_id  VARCHAR(50) NOT NULL,
    device_id       UUID REFERENCES devices(id),
    severity        VARCHAR(10) NOT NULL,
    type            VARCHAR(100),
    message         TEXT NOT NULL,
    stack_trace     TEXT,
    last_actions    JSONB,
    last_api_calls  JSONB,
    device_state    JSONB,
    screenshot_key  VARCHAR(200),
    is_resolved     BOOLEAN DEFAULT false,
    resolved_by     UUID REFERENCES users(id),
    resolved_at     TIMESTAMPTZ,
    occurred_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_crashes_correlation ON crash_events(correlation_id);
CREATE INDEX idx_crashes_severity ON crash_events(severity);
CREATE INDEX idx_crashes_resolved ON crash_events(is_resolved);

-- ============================================================================
-- attachments
-- ============================================================================
CREATE TABLE attachments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_run_id     UUID REFERENCES test_runs(id),
    test_step_result_id UUID REFERENCES test_step_results(id),
    type            VARCHAR(20) NOT NULL,
    filename        VARCHAR(255) NOT NULL,
    storage_key     VARCHAR(500) NOT NULL,
    mime_type       VARCHAR(100),
    size_bytes      BIGINT,
    uploaded_by     UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_attachments_run ON attachments(test_run_id);

-- ============================================================================
-- reports
-- ============================================================================
CREATE TABLE reports (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_run_id     UUID NOT NULL REFERENCES test_runs(id),
    type            VARCHAR(20) DEFAULT 'standard',
    status          VARCHAR(20) DEFAULT 'generating',
    summary         JSONB NOT NULL,
    storage_key     VARCHAR(500),
    generated_by    UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
