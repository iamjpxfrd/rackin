package com.rackin.backend.web;

import com.rackin.backend.service.MemberService;
import com.rackin.backend.web.dto.ErrorMessage;
import com.rackin.backend.web.dto.FieldError;
import com.rackin.backend.web.dto.RegisterMemberRequest;
import com.rackin.backend.web.dto.RegisterMemberResponse;
import com.rackin.backend.web.dto.RosterMemberResponse;
import com.rackin.backend.web.dto.StatusResponse;
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
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/members")
@Tag(name = "Members", description = "Registration and membership status")
public class MemberController {

    private final MemberService memberService;

    public MemberController(MemberService memberService) {
        this.memberService = memberService;
    }

    @Operation(
            summary = "Register a member",
            description = "Creates a member together with their first payment, assigning the next "
                    + "sequential member id unless the tablet supplies one it already assigned "
                    + "offline. `clientUuid` is the tablet's idempotency key: replaying one returns "
                    + "the original registration rather than creating a second member.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Member registered, or the original "
                    + "registration replayed for a repeated clientUuid"),
            @ApiResponse(responseCode = "400", description = "Validation failed",
                    content = @Content(mediaType = "application/json",
                            array = @ArraySchema(schema = @Schema(implementation = FieldError.class)))),
            @ApiResponse(responseCode = "409", description = "The supplied memberId belongs to a "
                    + "different member",
                    content = @Content(mediaType = "application/json",
                            schema = @Schema(implementation = ErrorMessage.class)))
    })
    @PostMapping
    public ResponseEntity<RegisterMemberResponse> register(@Valid @RequestBody RegisterMemberRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(memberService.registerMember(request));
    }

    @Operation(
            summary = "Get membership status",
            description = "Status is derived from payment coverage at request time — `active` while "
                    + "the latest payment still covers today, otherwise `expired`.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Current derived status"),
            @ApiResponse(responseCode = "404", description = "No member with that id",
                    content = @Content(mediaType = "application/json",
                            schema = @Schema(implementation = ErrorMessage.class)))
    })
    @GetMapping("/{id}/status")
    public StatusResponse getStatus(
            @Parameter(description = "Member id", example = "1217") @PathVariable("id") String id) {
        return memberService.getStatus(id);
    }

    @Operation(
            summary = "List all members",
            description = "The full roster, name-ascending. Each row carries its derived status and "
                    + "whether it's expiring soon, using the same coverage-based rules as "
                    + "`/{id}/status` and `/api/payments/expiring`.")
    @ApiResponse(responseCode = "200", description = "The roster, may be empty")
    @GetMapping
    public List<RosterMemberResponse> listMembers() {
        return memberService.listMembers();
    }
}
