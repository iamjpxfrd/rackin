package com.rackin.backend.web;

import com.rackin.backend.service.SyncStatusService;
import com.rackin.backend.web.dto.SyncStatusReportRequest;
import com.rackin.backend.web.dto.SyncStatusResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/sync")
@Tag(name = "Sync status", description = "The tablet's self-reported outbox depth/age, for the owner dashboard")
public class SyncStatusController {

    private final SyncStatusService syncStatusService;

    public SyncStatusController(SyncStatusService syncStatusService) {
        this.syncStatusService = syncStatusService;
    }

    @Operation(
            summary = "Report outbox state",
            description = "Called by the tablet after every sync attempt with its current outbox depth "
                    + "and the age of the oldest still-pending operation. Overwrites the single stored "
                    + "report — there is one tablet in the pilot (ADR-001).")
    @ApiResponse(responseCode = "204", description = "Recorded")
    @PostMapping("/status")
    public ResponseEntity<Void> report(@Valid @RequestBody SyncStatusReportRequest request) {
        syncStatusService.report(request);
        return ResponseEntity.noContent().build();
    }

    @Operation(
            summary = "Read the latest reported outbox state",
            description = "`reportedAt` is null when the tablet has never reported at all.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Latest report, or the never-reported state")
    })
    @GetMapping("/status")
    public SyncStatusResponse current() {
        return syncStatusService.current();
    }
}
