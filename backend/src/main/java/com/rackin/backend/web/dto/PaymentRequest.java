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

public record PaymentRequest(
        @Schema(description = "Id of the member paying", example = "1217")
        @NotBlank(message = "memberId is required") String memberId,
        @Schema(description = "Amount paid", example = "1200.00")
        @NotNull(message = "amount is required") @DecimalMin(value = "0.01", message = "amount must be greater than 0") BigDecimal amount,
        @Schema(description = "How the payment was made", example = "transfer")
        @NotNull(message = "method is required") PaymentMethod method,
        @Schema(description = "Switches the member's plan at the point of payment (e.g. a Session "
                + "drop-in converting to Monthly) — the natural moment someone changes plans, rather "
                + "than needing a separate edit-member action that doesn't exist. Omit to keep the "
                + "member's current plan; coverage is computed from whichever plan applies.")
        PlanType planType,
        @Schema(description = "Corrects the member's Student/Regular membership type at the point of "
                + "payment. Omit to leave it unchanged. Only meaningful for Monthly/Annually.")
        Boolean isStudent,
        @Schema(description = "Tablet-generated idempotency key. Leave blank to let the server generate one.")
        UUID clientUuid,
        @Schema(description = "When the member actually paid, which may predate this request if the "
                + "gym was offline. Coverage is counted from this moment, not from arrival, so a "
                + "late sync never silently extends a membership (TRD 7).")
        Instant paidAt,
        @Schema(description = "Stable id of the staff member who took the money. Attribution, not "
                + "authentication. Null is valid and means the payment was recorded with nobody "
                + "signed in — an honest gap rather than a rejected payment.")
        @Size(max = 64, message = "recordedById must be at most 64 chars") String recordedById,
        @Schema(description = "That staff member's name as it stood when the money changed hands.")
        @Size(max = 100, message = "recordedByName must be at most 100 chars") String recordedByName
) {
}
