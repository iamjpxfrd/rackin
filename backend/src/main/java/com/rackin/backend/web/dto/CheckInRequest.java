package com.rackin.backend.web.dto;

import com.rackin.backend.model.CheckInMethod;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record CheckInRequest(
        @NotBlank(message = "memberId is required") String memberId,
        @NotNull(message = "method is required") CheckInMethod method,
        UUID clientUuid
) {
}
