package com.rackin.backend.service;

import com.rackin.backend.model.PlanType;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class PlanDurationsTest {

    @Test
    void days_weekly_shouldReturnSeven() {
        assertThat(PlanDurations.days(PlanType.weekly)).isEqualTo(7);
    }

    @Test
    void days_monthly_shouldReturnThirty() {
        assertThat(PlanDurations.days(PlanType.monthly)).isEqualTo(30);
    }
}
