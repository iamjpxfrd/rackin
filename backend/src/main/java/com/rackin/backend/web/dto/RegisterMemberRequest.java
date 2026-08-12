package com.rackin.backend.web.dto;

import com.rackin.backend.model.PaymentMethod;
import com.rackin.backend.model.PlanType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.Instant;
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
        UUID clientUuid,

        // The three fields below exist for the tablet's sync push (TRD 7). A
        // human registering through Swagger or a future admin UI omits all
        // three and the server fills them in, which is the pre-sync behaviour
        // unchanged.

        @Schema(description = "Id the tablet already assigned this member offline. Omit and the "
                + "server assigns the next sequential id. Supplying one is how a synced member "
                + "keeps the number printed on their QR card (backend-schema.md 7).",
                example = "1217")
        @Size(max = 20, message = "memberId must be at most 20 chars") String memberId,
        @Schema(description = "When the member actually registered on the tablet, which may be hours "
                + "before this request if the gym was offline. Omit for the current time.")
        Instant createdAt,
        @Schema(description = "Idempotency key of the initial payment, distinct from the member's. "
                + "Omit and the server generates one.")
        UUID paymentClientUuid
) {
}
