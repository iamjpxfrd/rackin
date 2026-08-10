package com.rackin.backend.web.dto;

import com.rackin.backend.model.MembershipStatus;

import java.time.Instant;

public record RegisterMemberResponse(String memberId, MembershipStatus status, Instant coversUntil) {
}
