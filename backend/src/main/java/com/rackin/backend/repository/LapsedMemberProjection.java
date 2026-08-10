package com.rackin.backend.repository;

import com.rackin.backend.model.CheckInMethod;

import java.time.OffsetDateTime;

// OffsetDateTime, not Instant: Spring Data's native-query projection proxy has
// no built-in converter from the driver's TIMESTAMPTZ type to Instant.
public interface LapsedMemberProjection {
    String getId();

    String getName();

    String getPhone();

    OffsetDateTime getLastCheckInTimestamp();

    CheckInMethod getLastCheckInMethod();
}
