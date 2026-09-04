package com.rackin.backend.web.dto;

import java.time.Instant;

/**
 * {@code reportedAt} is null when the tablet has never reported at all —
 * distinct from a report whose queue happened to be empty, which still
 * carries a real {@code reportedAt}.
 */
public record SyncStatusResponse(int pendingCount, Instant oldestPendingAt, Instant reportedAt) {

    public static SyncStatusResponse neverReported() {
        return new SyncStatusResponse(0, null, null);
    }
}
