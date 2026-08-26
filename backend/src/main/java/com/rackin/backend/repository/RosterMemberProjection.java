package com.rackin.backend.repository;

import java.time.OffsetDateTime;

// OffsetDateTime, not Instant: Spring Data's native-query projection proxy has
// no built-in converter from the driver's TIMESTAMPTZ type to Instant (see
// ExpiringMemberProjection). getPlanType() is a raw String for the same
// reason — no built-in converter from the enum column to PlanType — and is
// parsed by the caller.
public interface RosterMemberProjection {
    String getId();

    String getName();

    String getPlanType();

    String getPhone();

    // Null when the member has no payment at all (a hand-seeded row;
    // registration always creates one).
    OffsetDateTime getCoversUntil();
}
