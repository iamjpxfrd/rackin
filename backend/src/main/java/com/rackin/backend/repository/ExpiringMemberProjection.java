package com.rackin.backend.repository;

import java.time.OffsetDateTime;

// OffsetDateTime, not Instant: Spring Data's native-query projection proxy has
// no built-in converter from the driver's TIMESTAMPTZ type to Instant.
public interface ExpiringMemberProjection {
    String getId();

    String getName();

    OffsetDateTime getCoversUntil();
}
