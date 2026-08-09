package com.rackin.backend.web.dto;

import com.rackin.backend.model.PaymentMethod;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.UUID;

public record PaymentRequest(
        @NotBlank(message = "memberId is required") String memberId,
        @NotNull(message = "amount is required") @DecimalMin(value = "0.01", message = "amount must be greater than 0") BigDecimal amount,
        @NotNull(message = "method is required") PaymentMethod method,
        UUID clientUuid
) {
}
