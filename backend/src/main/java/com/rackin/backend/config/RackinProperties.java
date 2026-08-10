package com.rackin.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

// Lapsed / expiring thresholds, fixed per the pilot decision. These are domain
// policy, so the service layer applies them — a controller must never decide
// what "lapsed" means.
@ConfigurationProperties(prefix = "rackin")
public record RackinProperties(int lapsedDaysDefault, int expiringDaysDefault) {
}
