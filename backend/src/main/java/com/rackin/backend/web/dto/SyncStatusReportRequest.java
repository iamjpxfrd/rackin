package com.rackin.backend.web.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

import java.time.Instant;

public record SyncStatusReportRequest(
        @Schema(description = "How many operations are still queued in the tablet's outbox.", example = "0")
        @NotNull(message = "pendingCount is required")
        @PositiveOrZero(message = "pendingCount must not be negative") Integer pendingCount,
        @Schema(description = "queuedAt of the oldest still-pending operation, or null when the queue "
                + "was empty at report time.")
        Instant oldestPendingAt
) {
}
