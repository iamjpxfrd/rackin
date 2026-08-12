package com.rackin.backend.web;

import com.rackin.backend.exception.MemberNotFoundException;
import com.rackin.backend.model.CheckInMethod;
import com.rackin.backend.model.PlanType;
import com.rackin.backend.service.CheckInService;
import com.rackin.backend.web.dto.CheckInResponse;
import com.rackin.backend.web.dto.LapsedMemberResponse;
import com.rackin.backend.web.dto.LastCheckIn;
import com.rackin.backend.web.dto.MemberBrief;
import com.rackin.backend.web.dto.MemberSummary;
import org.hamcrest.Matchers;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

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
@WebMvcTest(CheckInController.class)
class CheckInControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private CheckInService checkInService;

    @Test
    void checkIn_withValidRequest_shouldReturn201() throws Exception {
        when(checkInService.checkIn(any())).thenReturn(
                new CheckInResponse(new MemberBrief("1114", "Ana Reyes", PlanType.monthly), 12));

        String body = """
                {"memberId":"1114","method":"numpad"}
                """;

        mockMvc.perform(post("/api/checkins")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.member.id").value("1114"))
                .andExpect(jsonPath("$.member.name").value("Ana Reyes"))
                .andExpect(jsonPath("$.visitCountThisMonth").value(12));
    }

    @Test
    void checkIn_whenMemberNotFound_shouldReturn404WithMatchingMessage() throws Exception {
        when(checkInService.checkIn(any())).thenThrow(new MemberNotFoundException("1114"));

        String body = """
                {"memberId":"1114","method":"numpad"}
                """;

        mockMvc.perform(post("/api/checkins")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("No member found for #1114"));
    }

    @Test
    void checkIn_withMissingFields_shouldReturn400() throws Exception {
        mockMvc.perform(post("/api/checkins")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$[?(@.field=='memberId')]").exists())
                .andExpect(jsonPath("$[?(@.field=='method')]").exists());
    }

    @Test
    void checkIn_withInvalidMethodEnum_shouldReturn400() throws Exception {
        String body = """
                {"memberId":"1114","method":"carrier-pigeon"}
                """;

        mockMvc.perform(post("/api/checkins")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());
    }

    @Test
    void getLapsed_shouldReturnMappedList() throws Exception {
        when(checkInService.getLapsed(null)).thenReturn(List.of(
                new LapsedMemberResponse(new MemberSummary("1045", "Jun Manalo"), null),
                new LapsedMemberResponse(new MemberSummary("1132", "Rica Tan"),
                        new LastCheckIn(Instant.parse("2026-06-20T09:00:00Z"), CheckInMethod.qr))));

        mockMvc.perform(get("/api/checkins/lapsed"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].member.id").value("1045"))
                .andExpect(jsonPath("$[0].lastCheckIn").value(Matchers.nullValue()))
                .andExpect(jsonPath("$[1].member.id").value("1132"))
                .andExpect(jsonPath("$[1].lastCheckIn.method").value("qr"));
    }

    @Test
    void getLapsed_withDaysParam_shouldPassThrough() throws Exception {
        when(checkInService.getLapsed(30)).thenReturn(List.of());

        mockMvc.perform(get("/api/checkins/lapsed").param("days", "30"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());
    }
}
