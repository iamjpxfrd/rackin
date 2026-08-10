package com.rackin.backend.web;

import com.rackin.backend.service.PaymentService;
import com.rackin.backend.web.dto.ErrorMessage;
import com.rackin.backend.web.dto.ExpiringMemberResponse;
import com.rackin.backend.web.dto.FieldError;
import com.rackin.backend.web.dto.PaymentRequest;
import com.rackin.backend.web.dto.PaymentResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/payments")
@Tag(name = "Payments", description = "Recording renewals and finding memberships about to expire")
public class PaymentController {

    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @Operation(
            summary = "Record a payment",
            description = "Extends coverage to now + the member's plan duration (weekly = 7 days, "
                    + "monthly = a flat 30 days). `clientUuid` is the tablet's idempotency key, "
                    + "stored under a unique index; omit it and the server generates one.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Payment recorded"),
            @ApiResponse(responseCode = "400", description = "Validation failed",
                    content = @Content(mediaType = "application/json",
                            array = @ArraySchema(schema = @Schema(implementation = FieldError.class)))),
            @ApiResponse(responseCode = "404", description = "No member with that id",
                    content = @Content(mediaType = "application/json",
                            schema = @Schema(implementation = ErrorMessage.class)))
    })
    @PostMapping
    public ResponseEntity<PaymentResponse> recordPayment(@Valid @RequestBody PaymentRequest request) {
        PaymentResponse response = paymentService.recordPayment(
                request.memberId(), request.amount(), request.method(), request.clientUuid());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @Operation(
            summary = "List expiring memberships",
            description = "Members whose latest payment stops covering them between now and `days` "
                    + "from now, soonest first. Already-expired members are not included.")
    @ApiResponse(responseCode = "200", description = "Expiring members, may be empty")
    @GetMapping("/expiring")
    public List<ExpiringMemberResponse> getExpiring(
            @Parameter(description = "Look-ahead window in days. Omit to use the configured "
                    + "`rackin.expiring-days-default`.", example = "7")
            @RequestParam(required = false) Integer days) {
        return paymentService.getExpiring(days);
    }
}
