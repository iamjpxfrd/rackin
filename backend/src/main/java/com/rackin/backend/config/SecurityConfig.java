package com.rackin.backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

/**
 * Locks /api/** behind a shared key held by the tablet.
 *
 * What this protects against: anyone who can reach the host reading the gym's
 * entire membership and payment history, or writing to it. Before this, that
 * was every unauthenticated request.
 *
 * What it does NOT protect against: someone holding the tablet. The key ships
 * inside a browser bundle, so devtools reveals it. That is a real limit, not an
 * oversight — a browser app cannot hold a secret from its own user — and it is
 * why this is described as closing the API to the internet rather than securing
 * it outright (ADR-002).
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final String apiKey;

    // No default. The project already refuses to start on a missing DB_PASSWORD
    // rather than guessing one, and a guessed API key is worse: the app would
    // come up looking protected while accepting a key an attacker can read here.
    public SecurityConfig(@Value("${rackin.api-key}") String apiKey) {
        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException(
                    "rackin.api-key is not set. Supply RACKIN_API_KEY, or set it in "
                            + "backend/config/local.properties for local development. The sync API "
                            + "answers with the gym's full payment history and must not start open.");
        }
        this.apiKey = apiKey;
    }

    @Bean
    public SecurityFilterChain apiSecurity(HttpSecurity http) throws Exception {
        http
                // Enabled by CorsConfig's mapping. Without this line Spring
                // Security rejects the browser's preflight before CORS is
                // consulted, and every sync request fails with no useful error.
                .cors(Customizer.withDefaults())
                // No cookies and no browser-rendered forms, so there is no
                // session for a cross-site request to ride on.
                .csrf(csrf -> csrf.disable())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        // Liveness only, no gym data — and it must stay reachable
                        // for a deploy to be able to tell whether this is up.
                        .requestMatchers("/actuator/health/**").permitAll()
                        // The API explorer describes the shape of the API, not
                        // its contents, and is disabled outright in prod.
                        .requestMatchers("/swagger-ui/**", "/swagger-ui.html", "/v3/api-docs/**").permitAll()
                        .requestMatchers("/api/**").authenticated()
                        .anyRequest().denyAll())
                // 401 with an empty body rather than a redirect to a login page:
                // the caller is a sync queue, and an HTML page in response to a
                // POST is worse than useless to it.
                .exceptionHandling(handling -> handling
                        .authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)))
                .addFilterBefore(new ApiKeyAuthFilter(apiKey), UsernamePasswordAuthenticationFilter.class)
                .httpBasic(basic -> basic.disable())
                .formLogin(form -> form.disable());

        return http.build();
    }
}
