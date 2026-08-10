package com.rackin.backend.web.dto;

import com.rackin.backend.repository.LapsedMemberProjection;

public record LapsedMemberResponse(MemberSummary member, LastCheckIn lastCheckIn) {

    public static LapsedMemberResponse from(LapsedMemberProjection projection) {
        // Null when the member has never checked in — the query returns those too.
        LastCheckIn lastCheckIn = projection.getLastCheckInTimestamp() != null
                ? new LastCheckIn(projection.getLastCheckInTimestamp().toInstant(),
                        projection.getLastCheckInMethod())
                : null;
        return new LapsedMemberResponse(
                new MemberSummary(projection.getId(), projection.getName()), lastCheckIn);
    }
}
