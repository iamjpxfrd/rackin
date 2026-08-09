package com.rackin.backend.web.dto;

import com.rackin.backend.model.PaymentMethod;
import com.rackin.backend.model.PlanType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.UUID;

public record RegisterMemberRequest(
        @NotBlank(message = "name is required") @Size(max = 100, message = "name must be at most 100 chars") String name,
        @NotNull(message = "planType is required") PlanType planType,
        @NotNull(message = "amount is required") @DecimalMin(value = "0.01", message = "amount must be greater than 0") BigDecimal amount,
        @NotNull(message = "method is required") PaymentMethod method,
        String phone,
        UUID clientUuid
) {
}
