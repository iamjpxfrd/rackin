package com.rackin.backend.web.dto;

import com.rackin.backend.model.MembershipStatus;

public record RosterMemberResponse(RosterMemberSummary member, MembershipStatus status, boolean isExpiringSoon) {
}
