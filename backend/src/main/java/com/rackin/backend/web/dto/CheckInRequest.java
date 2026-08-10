package com.rackin.backend.web.dto;

import com.rackin.backend.model.CheckInMethod;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record CheckInRequest(
        @Schema(description = "Id of the member checking in", example = "1217")
        @NotBlank(message = "memberId is required") String memberId,
        @Schema(description = "How the member was identified at the desk", example = "numpad")
        @NotNull(message = "method is required") CheckInMethod method,
        @Schema(description = "Tablet-generated idempotency key. Leave blank to let the server generate one.")
        UUID clientUuid
) {
}
