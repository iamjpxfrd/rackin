package com.rackin.backend.web.dto;

import com.rackin.backend.model.CheckInMethod;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.UUID;

public record CheckInRequest(
        @Schema(description = "Id of the member checking in", example = "1217")
        @NotBlank(message = "memberId is required") String memberId,
        @Schema(description = "How the member was identified at the desk", example = "numpad")
        @NotNull(message = "method is required") CheckInMethod method,
        @Schema(description = "Tablet-generated idempotency key. Leave blank to let the server generate one.")
        UUID clientUuid,
        @Schema(description = "When the member actually walked in. A tablet that was offline all day "
                + "syncs each check-in with its true time; without this they would all land at sync "
                + "time and every member would read as visiting at once (TRD 7).")
        Instant timestamp,
        @Schema(description = "Stable id of the staff member on the desk. Attribution, not "
                + "authentication: the tablet reports who it was told was there. Null is valid and "
                + "means nobody was signed in.")
        @Size(max = 64, message = "recordedById must be at most 64 chars") String recordedById,
        @Schema(description = "That staff member's name as it stood at the time.")
        @Size(max = 100, message = "recordedByName must be at most 100 chars") String recordedByName
) {
}
