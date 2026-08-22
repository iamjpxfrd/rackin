package com.rackin.backend.web;

import com.rackin.backend.service.CheckInService;
import com.rackin.backend.web.dto.CheckInRequest;
import com.rackin.backend.web.dto.CheckInResponse;
import com.rackin.backend.web.dto.CheckOutRequest;
import com.rackin.backend.web.dto.ErrorMessage;
import com.rackin.backend.web.dto.FieldError;
import com.rackin.backend.web.dto.LapsedMemberResponse;
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
@RequestMapping("/api/checkins")
@Tag(name = "Check-ins", description = "Recording visits and finding lapsed members")
public class CheckInController {

    private final CheckInService checkInService;

    public CheckInController(CheckInService checkInService) {
        this.checkInService = checkInService;
    }

    @Operation(
            summary = "Record a check-in",
            description = "Stamps the visit at server time and returns the member's visit count for "
                    + "the current calendar month (UTC). `clientUuid` is the tablet's idempotency "
                    + "key, stored under a unique index; omit it and the server generates one.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Check-in recorded"),
            @ApiResponse(responseCode = "400", description = "Validation failed",
                    content = @Content(mediaType = "application/json",
                            array = @ArraySchema(schema = @Schema(implementation = FieldError.class)))),
            @ApiResponse(responseCode = "404", description = "No member with that id",
                    content = @Content(mediaType = "application/json",
                            schema = @Schema(implementation = ErrorMessage.class)))
    })
    @PostMapping
    public ResponseEntity<CheckInResponse> checkIn(@Valid @RequestBody CheckInRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(checkInService.checkIn(request));
    }

    @Operation(
            summary = "Check out a visit",
            description = "Closes out a check-in — a manual staff LOG OUT, or the tablet's force "
                    + "logout past closing. Identified by the check-in's own `clientUuid`, the same "
                    + "idempotency key check-in itself uses, since the tablet may never have received "
                    + "the server-assigned id if the original check-in synced after this. Idempotent: "
                    + "checking out an already-checked-out visit succeeds without overwriting the "
                    + "first checkout time.")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Checked out (or already was)"),
            @ApiResponse(responseCode = "400", description = "Validation failed",
                    content = @Content(mediaType = "application/json",
                            array = @ArraySchema(schema = @Schema(implementation = FieldError.class)))),
            @ApiResponse(responseCode = "404", description = "No check-in with that clientUuid",
                    content = @Content(mediaType = "application/json",
                            schema = @Schema(implementation = ErrorMessage.class)))
    })
    @PostMapping("/checkout")
    public ResponseEntity<Void> checkOut(@Valid @RequestBody CheckOutRequest request) {
        checkInService.checkOut(request);
        return ResponseEntity.noContent().build();
    }

    @Operation(
            summary = "List lapsed members",
            description = "Members whose most recent check-in is older than `days` ago, plus members "
                    + "who have never checked in (their `lastCheckIn` is null).")
    @ApiResponse(responseCode = "200", description = "Lapsed members, may be empty")
    @GetMapping("/lapsed")
    public List<LapsedMemberResponse> getLapsed(
            @Parameter(description = "Days of inactivity that count as lapsed. Omit to use the "
                    + "configured `rackin.lapsed-days-default`.", example = "14")
            @RequestParam(required = false) Integer days) {
        return checkInService.getLapsed(days);
    }
}
