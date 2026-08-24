package com.rackin.backend.web.dto;

import com.rackin.backend.model.StoreTransactionType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record StoreTransactionRequest(
        @Schema(description = "Income (a sale) or expense (stock, repairs, ...)", example = "income")
        @NotNull(message = "type is required") StoreTransactionType type,
        @Schema(description = "One of the tablet's STORE_ITEMS/TIMED_ITEMS keys (water, treadmill, "
                + "stairIncline), or omitted for a freeform Log a Transaction entry.",
                example = "water")
        @Size(max = 40, message = "itemKey must be at most 40 chars") String itemKey,
        @Schema(description = "What was sold or spent on", example = "Water")
        @NotBlank(message = "description is required")
        @Size(max = 200, message = "description must be at most 200 chars") String description,
        @Schema(description = "Amount, always positive regardless of income/expense", example = "20.00")
        @NotNull(message = "amount is required") @DecimalMin(value = "0.01", message = "amount must be greater than 0") BigDecimal amount,
        @Schema(description = "When the sale/expense actually happened, which may predate this "
                + "request if the gym was offline. Omit for the current time.")
        Instant occurredAt,
        @Schema(description = "Tablet-generated idempotency key. Leave blank to let the server generate one.")
        UUID clientUuid,
        @Schema(description = "Stable id of the staff member on the desk. Attribution, not "
                + "authentication. Null is valid.")
        @Size(max = 64, message = "recordedById must be at most 64 chars") String recordedById,
        @Schema(description = "That staff member's name as it stood at the time.")
        @Size(max = 100, message = "recordedByName must be at most 100 chars") String recordedByName
) {
}
