package com.rackin.backend.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/**
 * The tablet's self-reported outbox depth/age (ADR-002 Action Item 8).
 *
 * Always exactly one row, id 1 — not {@code @GeneratedValue}. Every report
 * overwrites it in place; there is one tablet in the pilot (ADR-001) and
 * nothing to key a second row on.
 */
@Entity
@Table(name = "sync_status")
@Getter
@Setter
@NoArgsConstructor
public class SyncStatus {

    public static final Long SINGLETON_ID = 1L;

    @Id
    private Long id = SINGLETON_ID;

    @Column(name = "pending_count", nullable = false)
    private int pendingCount;

    @Column(name = "oldest_pending_at")
    private Instant oldestPendingAt;

    // Server-assigned, not client-supplied: a stale reading must reflect
    // when the backend actually last heard from the tablet, immune to the
    // tablet's own clock being wrong.
    @Column(name = "reported_at", nullable = false)
    private Instant reportedAt;
}
