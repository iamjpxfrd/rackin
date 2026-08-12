package com.rackin.backend.service;

import com.rackin.backend.model.PlanType;

// coversUntil = paidAt + planDurationDays[planType] (TRD 3.4). Monthly is a
// flat 30 days, not a calendar month, per the TRD's own worked example
// (2026-07-12 + 30d = 2026-08-11).
final class PlanDurations {

    private PlanDurations() {
    }

    static int days(PlanType planType) {
        return switch (planType) {
            case session -> 1;
            case weekly -> 7;
            case monthly -> 30;
        };
    }
}
