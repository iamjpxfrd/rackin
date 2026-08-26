package com.rackin.backend.web.dto;

import com.rackin.backend.model.PlanType;

// Deliberately separate from MemberSummary (used by ExpiringMemberResponse /
// LapsedMemberResponse) rather than adding these fields there: planType and
// phone are specific to the roster read and would otherwise show up as
// always-null extras on those other responses.
public record RosterMemberSummary(String id, String name, PlanType planType, String phone) {
}
