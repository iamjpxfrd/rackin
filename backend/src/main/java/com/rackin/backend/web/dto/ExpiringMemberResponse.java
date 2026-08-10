package com.rackin.backend.web.dto;

import com.rackin.backend.repository.ExpiringMemberProjection;

import java.time.Instant;

public record ExpiringMemberResponse(MemberSummary member, Instant coversUntil) {

    public static ExpiringMemberResponse from(ExpiringMemberProjection projection) {
        return new ExpiringMemberResponse(
                new MemberSummary(projection.getId(), projection.getName()),
                projection.getCoversUntil().toInstant());
    }
}
