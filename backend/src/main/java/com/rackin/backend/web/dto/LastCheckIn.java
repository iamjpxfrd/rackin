package com.rackin.backend.web.dto;

import com.rackin.backend.model.CheckInMethod;

import java.time.Instant;

public record LastCheckIn(Instant timestamp, CheckInMethod method) {
}
