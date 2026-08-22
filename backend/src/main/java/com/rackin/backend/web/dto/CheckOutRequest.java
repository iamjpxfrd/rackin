package com.rackin.backend.web.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

import java.time.Instant;
import java.util.UUID;

public record CheckOutRequest(
        @Schema(description = "clientUuid of the check-in being closed out — identifies the visit "
                + "the same way the tablet's other sync writes do, rather than a server-assigned id "
                + "the tablet may not have if it never received the check-in response.")
        @NotNull(message = "checkInClientUuid is required") UUID checkInClientUuid,
        @Schema(description = "When the visit ended — the gym's actual closing time for a force "
                + "logout, or the moment staff tapped LOG OUT for a manual one.")
        @NotNull(message = "checkOutAt is required") Instant checkOutAt
) {
}
