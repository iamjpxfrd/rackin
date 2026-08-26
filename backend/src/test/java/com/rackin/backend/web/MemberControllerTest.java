package com.rackin.backend.web;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rackin.backend.exception.MemberNotFoundException;
import com.rackin.backend.model.MembershipStatus;
import com.rackin.backend.model.PaymentMethod;
import com.rackin.backend.model.PlanType;
import com.rackin.backend.service.MemberService;
import com.rackin.backend.web.dto.MemberCountResponse;
import com.rackin.backend.web.dto.RegisterMemberRequest;
import com.rackin.backend.web.dto.RegisterMemberResponse;
import com.rackin.backend.web.dto.RosterMemberResponse;
import com.rackin.backend.web.dto.RosterMemberSummary;
import com.rackin.backend.web.dto.StatusResponse;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// Security is exercised by ApiKeySecurityTest. These verify controller and
// DTO behaviour, and threading a key through every request would only make
// each assertion harder to read without testing anything new.
@AutoConfigureMockMvc(addFilters = false)
@WebMvcTest(MemberController.class)
class MemberControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private MemberService memberService;

    @Test
    void register_withValidRequest_shouldReturn201WithBody() throws Exception {
        RegisterMemberRequest request = new RegisterMemberRequest(
                "Maria Santos", PlanType.monthly, new BigDecimal("1200.00"), PaymentMethod.cash, null, false, null, null, null, null, null, null);
        Instant coversUntil = Instant.parse("2026-09-09T00:00:00Z");
        when(memberService.registerMember(any())).thenReturn(
                new RegisterMemberResponse("1001", MembershipStatus.active, coversUntil));

        mockMvc.perform(post("/api/members")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.memberId").value("1001"))
                .andExpect(jsonPath("$.status").value("active"))
                .andExpect(jsonPath("$.coversUntil").value("2026-09-09T00:00:00Z"));
    }

    @Test
    void register_withMissingRequiredFields_shouldReturn400WithFieldErrors() throws Exception {
        mockMvc.perform(post("/api/members")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$[?(@.field=='name')]").exists())
                .andExpect(jsonPath("$[?(@.field=='planType')]").exists())
                .andExpect(jsonPath("$[?(@.field=='amount')]").exists())
                .andExpect(jsonPath("$[?(@.field=='method')]").exists());
    }

    @Test
    void register_withZeroAmount_shouldReturn400() throws Exception {
        String body = """
                {"name":"Maria Santos","planType":"monthly","amount":0,"method":"cash"}
                """;

        mockMvc.perform(post("/api/members")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$[0].field").value("amount"));
    }

    @Test
    void getStatus_whenMemberExists_shouldReturn200() throws Exception {
        when(memberService.getStatus("1001")).thenReturn(new StatusResponse(MembershipStatus.active));

        mockMvc.perform(get("/api/members/1001/status"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("active"));
    }

    @Test
    void getStatus_whenMemberNotFound_shouldReturn404WithErrorMessage() throws Exception {
        when(memberService.getStatus("9999")).thenThrow(new MemberNotFoundException("9999"));

        mockMvc.perform(get("/api/members/9999/status"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("No member found for #9999"));
    }

    @Test
    void listMembers_shouldReturn200WithTheRoster() throws Exception {
        when(memberService.listMembers()).thenReturn(List.of(
                new RosterMemberResponse(
                        new RosterMemberSummary("1001", "Maria Santos", PlanType.monthly, "09171234567"),
                        MembershipStatus.active, true)));

        mockMvc.perform(get("/api/members"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].member.id").value("1001"))
                .andExpect(jsonPath("$[0].member.name").value("Maria Santos"))
                .andExpect(jsonPath("$[0].member.planType").value("monthly"))
                .andExpect(jsonPath("$[0].member.phone").value("09171234567"))
                .andExpect(jsonPath("$[0].status").value("active"))
                .andExpect(jsonPath("$[0].isExpiringSoon").value(true));
    }

    @Test
    void listMembers_whenRosterEmpty_shouldReturn200WithEmptyArray() throws Exception {
        when(memberService.listMembers()).thenReturn(List.of());

        mockMvc.perform(get("/api/members"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());
    }

    @Test
    void getMemberCount_shouldReturn200WithCount() throws Exception {
        when(memberService.getMemberCount()).thenReturn(new MemberCountResponse(42));

        mockMvc.perform(get("/api/members/count"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.count").value(42));
    }
}
