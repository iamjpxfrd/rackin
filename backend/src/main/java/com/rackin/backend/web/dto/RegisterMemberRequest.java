package com.rackin.backend.web.dto;

import com.rackin.backend.model.PaymentMethod;
import com.rackin.backend.model.PlanType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.UUID;

public record RegisterMemberRequest(
        @Schema(description = "Member's full name, trimmed on save", example = "Maria Santos")
        @NotBlank(message = "name is required") @Size(max = 100, message = "name must be at most 100 chars") String name,
        @Schema(description = "Plan the member is signing up for", example = "monthly")
        @NotNull(message = "planType is required") PlanType planType,
        @Schema(description = "Amount paid at registration", example = "1200.00")
        @NotNull(message = "amount is required") @DecimalMin(value = "0.01", message = "amount must be greater than 0") BigDecimal amount,
        @Schema(description = "How the payment was made", example = "cash")
        @NotNull(message = "method is required") PaymentMethod method,
        @Schema(description = "Optional contact number", example = "09171234567")
        String phone,
        @Schema(description = "Tablet-generated idempotency key. Leave blank to let the server generate one.")
        UUID clientUuid
) {
}
