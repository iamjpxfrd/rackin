package com.rackin.backend.web.dto;

import com.rackin.backend.model.PaymentMethod;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record PaymentRequest(
        @Schema(description = "Id of the member paying", example = "1217")
        @NotBlank(message = "memberId is required") String memberId,
        @Schema(description = "Amount paid", example = "1200.00")
        @NotNull(message = "amount is required") @DecimalMin(value = "0.01", message = "amount must be greater than 0") BigDecimal amount,
        @Schema(description = "How the payment was made", example = "transfer")
        @NotNull(message = "method is required") PaymentMethod method,
        @Schema(description = "Tablet-generated idempotency key. Leave blank to let the server generate one.")
        UUID clientUuid,
        @Schema(description = "When the member actually paid, which may predate this request if the "
                + "gym was offline. Coverage is counted from this moment, not from arrival, so a "
                + "late sync never silently extends a membership (TRD 7).")
        Instant paidAt
) {
}
