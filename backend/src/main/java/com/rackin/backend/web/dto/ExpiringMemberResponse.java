package com.rackin.backend.web.dto;

import java.time.Instant;

public record ExpiringMemberResponse(MemberSummary member, Instant coversUntil) {
}
