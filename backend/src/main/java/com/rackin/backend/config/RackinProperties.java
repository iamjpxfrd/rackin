package com.rackin.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

// Lapsed / expiring thresholds, fixed per the pilot decision. These are domain
// policy, so the service layer applies them — a controller must never decide
// what "lapsed" means.
//
// Deployment settings such as the allowed CORS origins deliberately do not live
// here: this record is injected into services, and @WebMvcTest slices do not
// load it, so anything a web-layer bean needs must be read some other way.
@ConfigurationProperties(prefix = "rackin")
public record RackinProperties(int lapsedDaysDefault, int expiringDaysDefault) {
}
