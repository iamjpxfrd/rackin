package com.rackin.backend.service;

import com.rackin.backend.model.PlanType;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class PlanDurationsTest {

    @Test
    void days_session_shouldReturnOne() {
        assertThat(PlanDurations.days(PlanType.session)).isEqualTo(1);
    }

    @Test
    void days_everyPlanType_shouldHaveADuration() {
        // The switch is exhaustive, so a fourth plan added to the enum without a
        // case here fails to compile rather than at a member's renewal.
        for (PlanType planType : PlanType.values()) {
            assertThat(PlanDurations.days(planType)).isPositive();
        }
    }

    @Test
    void days_weekly_shouldReturnSeven() {
        assertThat(PlanDurations.days(PlanType.weekly)).isEqualTo(7);
    }

    @Test
    void days_monthly_shouldReturnThirty() {
        assertThat(PlanDurations.days(PlanType.monthly)).isEqualTo(30);
    }
}
