package com.rackin.backend.web;

import com.rackin.backend.config.SecurityConfig;
import com.rackin.backend.model.MembershipStatus;
import com.rackin.backend.service.MemberService;
import com.rackin.backend.web.dto.RegisterMemberResponse;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// The only slice that runs the real filter chain. Everything the sync API
// exposes is the gym's membership and payment history, so "can an anonymous
// request reach it" deserves its own test rather than an assertion buried in a
// controller test's setup.
//
// SecurityConfig must be imported explicitly. @WebMvcTest auto-configures
// Spring Security but does not scan @Configuration classes, so without this the
// slice silently exercises Boot's default chain instead of ours — which also
// rejects, and would have made this file pass while proving nothing about the
// key. The import is what makes these assertions about our rules.
@WebMvcTest(MemberController.class)
@Import(SecurityConfig.class)
class ApiKeySecurityTest {

    private static final String VALID_KEY = "test-api-key";

    private static final String REGISTRATION = """
            {"name":"Maria Santos","planType":"monthly","amount":1200,"method":"cash"}
            """;

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private MemberService memberService;

    @Test
    void writeWithoutAKey_shouldBeRejected() throws Exception {
        mockMvc.perform(post("/api/members")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(REGISTRATION))
                .andExpect(status().isUnauthorized());

        // Rejected before the service, not after: an unauthenticated request
        // must not reach the point of writing anything.
        verify(memberService, never()).registerMember(any());
    }

    @Test
    void readWithoutAKey_shouldBeRejected() throws Exception {
        mockMvc.perform(get("/api/members/1001/status"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void wrongKey_shouldBeRejected() throws Exception {
        mockMvc.perform(post("/api/members")
                        .header("Authorization", "Bearer not-the-key")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(REGISTRATION))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void keyWithoutTheBearerPrefix_shouldBeRejected() throws Exception {
        // The header format is part of the contract; accepting a bare key too
        // would mean two things to keep working and one more to get wrong.
        mockMvc.perform(post("/api/members")
                        .header("Authorization", VALID_KEY)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(REGISTRATION))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void aKeyThatSharesAPrefix_shouldBeRejected() throws Exception {
        // Guards the constant-time comparison: a check that stopped at the first
        // mismatch would leak the key one byte at a time through its timing.
        mockMvc.perform(post("/api/members")
                        .header("Authorization", "Bearer test-api-ke")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(REGISTRATION))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void correctKey_shouldBeLetThrough() throws Exception {
        when(memberService.registerMember(any())).thenReturn(
                new RegisterMemberResponse("1001", MembershipStatus.active, Instant.now()));

        mockMvc.perform(post("/api/members")
                        .header("Authorization", "Bearer " + VALID_KEY)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(REGISTRATION))
                .andExpect(status().isCreated());
    }

    @Test
    void swaggerUi_shouldStayOpenForTheApiExplorer() throws Exception {
        // Permitted rather than 401: the explorer describes the shape of the
        // API, not its contents, and prod disables springdoc outright. Not
        // mapped in a controller slice, so 404 is the proof it got past
        // security — a denial would have been 401 before reaching the handler.
        mockMvc.perform(get("/v3/api-docs"))
                .andExpect(status().isNotFound());
    }
}
