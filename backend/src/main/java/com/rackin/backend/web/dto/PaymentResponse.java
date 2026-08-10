package com.rackin.backend.web.dto;

import com.rackin.backend.model.MembershipStatus;

import java.time.Instant;

public record PaymentResponse(Instant coversUntil, MembershipStatus status) {
}
