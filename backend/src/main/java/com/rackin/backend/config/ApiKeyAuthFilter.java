package com.rackin.backend.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

/**
 * Authenticates the tablet by a shared key on the Authorization header.
 *
 * A key rather than a login because the client is a device, not a person. There
 * is no user model here and staff attribution deliberately is not one — that
 * records who was at the desk, and proves nothing (domain/staff.js). The owner
 * dashboard will need real per-person authentication; this is not it.
 */
public class ApiKeyAuthFilter extends OncePerRequestFilter {

    private static final String BEARER_PREFIX = "Bearer ";

    private final byte[] expectedKey;

    public ApiKeyAuthFilter(String expectedKey) {
        this.expectedKey = expectedKey.getBytes(StandardCharsets.UTF_8);
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {

        String presented = presentedKey(request);
        if (presented != null && matches(presented)) {
            // No roles: there is exactly one caller and one level of access.
            // Anything finer belongs with the dashboard's real user model.
            SecurityContextHolder.getContext().setAuthentication(
                    new UsernamePasswordAuthenticationToken("tablet", null, AuthorityUtils.NO_AUTHORITIES));
        }

        // Deliberately does not reject here. An unauthenticated request falls
        // through with no security context and the authorization rules decide,
        // which keeps public endpoints (health, Swagger in dev) reachable
        // without this filter needing to know which those are.
        chain.doFilter(request, response);
    }

    private static String presentedKey(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith(BEARER_PREFIX)) {
            return header.substring(BEARER_PREFIX.length()).trim();
        }
        return null;
    }

    // Constant-time: a plain String.equals leaks how much of the key matched
    // through its timing, which is enough to recover one byte at a time.
    private boolean matches(String presented) {
        return MessageDigest.isEqual(presented.getBytes(StandardCharsets.UTF_8), expectedKey);
    }
}
