package com.rackin.backend.web;

import com.rackin.backend.service.StoreTransactionService;
import com.rackin.backend.web.dto.FieldError;
import com.rackin.backend.web.dto.StoreTransactionRequest;
import com.rackin.backend.web.dto.StoreTransactionResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/store")
@Tag(name = "Store", description = "The front-desk cash ledger: sales and expenses outside membership")
public class StoreController {

    private final StoreTransactionService storeTransactionService;

    public StoreController(StoreTransactionService storeTransactionService) {
        this.storeTransactionService = storeTransactionService;
    }

    @Operation(
            summary = "Record a Store transaction",
            description = "A fixed-price sale (Water), a timed sale (Treadmill/Stair Incline), or a "
                    + "freeform income/expense entry (Log a Transaction). Not member-scoped — "
                    + "membership payments are joined into the tablet's own Store totals separately "
                    + "and are not duplicated here. `clientUuid` is the tablet's idempotency key: "
                    + "replaying one returns the original transaction rather than recording it twice.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Transaction recorded, or the original "
                    + "replayed for a repeated clientUuid"),
            @ApiResponse(responseCode = "400", description = "Validation failed",
                    content = @Content(mediaType = "application/json",
                            array = @ArraySchema(schema = @Schema(implementation = FieldError.class))))
    })
    @PostMapping
    public ResponseEntity<StoreTransactionResponse> record(@Valid @RequestBody StoreTransactionRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(storeTransactionService.record(request));
    }
}
