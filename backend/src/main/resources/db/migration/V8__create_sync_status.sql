-- The tablet's own outbox depth/age, self-reported after every sync attempt,
-- so the owner dashboard can tell a caught-up tablet from one that has gone
-- quiet (ADR-002 Action Item 8). One row, always id 1: one tablet in the
-- pilot (ADR-001), nothing to key a second row on.

CREATE TABLE sync_status (
    id                BIGINT PRIMARY KEY,
    pending_count     INT         NOT NULL,
    oldest_pending_at TIMESTAMPTZ,
    reported_at       TIMESTAMPTZ NOT NULL
);
