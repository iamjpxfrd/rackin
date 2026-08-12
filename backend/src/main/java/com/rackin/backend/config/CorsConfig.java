package com.rackin.backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.List;

// The tablet runs the frontend as a browser page on its own origin and pushes
// its sync queue here. Same-origin policy blocks that by default, so the API
// has to name the origins it will accept — and only those. A wildcard would
// let any page the tablet visits post check-ins to the gym's records.
//
// The origins arrive by @Value rather than through RackinProperties because
// this is a web-layer bean: @WebMvcTest slices instantiate it but do not load
// @ConfigurationProperties, so depending on that record fails every slice test.
@Configuration
public class CorsConfig implements WebMvcConfigurer {

    private final List<String> allowedOrigins;

    public CorsConfig(@Value("${rackin.cors-allowed-origins:}") List<String> allowedOrigins) {
        // A property present but blank binds as [""], which is not a valid
        // origin and would be rejected at registration rather than ignored.
        this.allowedOrigins = allowedOrigins.stream().map(String::trim).filter(origin -> !origin.isEmpty()).toList();
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        if (allowedOrigins.isEmpty()) {
            // No origins configured means no browser client is expected — a
            // backend reached only by server-side callers needs no CORS at all.
            return;
        }
        registry.addMapping("/api/**")
                .allowedOrigins(allowedOrigins.toArray(String[]::new))
                .allowedMethods("GET", "POST")
                // Named explicitly rather than left to the "*" default: the
                // tablet's key travels on Authorization, and a browser silently
                // strips a header the preflight did not allow — which would
                // surface as a 401 with no clue that CORS was the cause.
                .allowedHeaders("Authorization", "Content-Type")
                // The key is a bearer token on a header, not a cookie, so the
                // credentials flag buys nothing and would only widen this.
                .allowCredentials(false)
                .maxAge(3600);
    }
}
