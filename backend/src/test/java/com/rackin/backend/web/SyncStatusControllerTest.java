package com.rackin.backend.web;

import com.rackin.backend.service.SyncStatusService;
import com.rackin.backend.web.dto.SyncStatusResponse;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;

import static org.hamcrest.Matchers.nullValue;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// Security is exercised by ApiKeySecurityTest — see CheckInControllerTest for
// the same reasoning.
@AutoConfigureMockMvc(addFilters = false)
@WebMvcTest(SyncStatusController.class)
class SyncStatusControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private SyncStatusService syncStatusService;

    @Test
    void report_withValidRequest_shouldReturn204() throws Exception {
        String body = """
                {"pendingCount":2,"oldestPendingAt":"2026-08-23T02:00:00Z"}
                """;

        mockMvc.perform(post("/api/sync/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isNoContent());
    }

    @Test
    void report_withEmptyQueue_shouldAllowNullOldestPendingAt() throws Exception {
        String body = """
                {"pendingCount":0,"oldestPendingAt":null}
                """;

        mockMvc.perform(post("/api/sync/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isNoContent());
    }

    @Test
    void report_withMissingPendingCount_shouldReturn400() throws Exception {
        mockMvc.perform(post("/api/sync/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$[?(@.field=='pendingCount')]").exists());
    }

    @Test
    void report_withNegativePendingCount_shouldReturn400() throws Exception {
        String body = """
                {"pendingCount":-1}
                """;

        mockMvc.perform(post("/api/sync/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$[?(@.field=='pendingCount')]").exists());
    }

    @Test
    void current_whenNeverReported_shouldReturnNullReportedAt() throws Exception {
        when(syncStatusService.current()).thenReturn(SyncStatusResponse.neverReported());

        mockMvc.perform(get("/api/sync/status"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.pendingCount").value(0))
                .andExpect(jsonPath("$.reportedAt").value(nullValue()));
    }

    @Test
    void current_whenReportExists_shouldReturnItsFields() throws Exception {
        when(syncStatusService.current()).thenReturn(new SyncStatusResponse(
                4, Instant.parse("2026-08-23T01:00:00Z"), Instant.parse("2026-08-23T02:00:00Z")));

        mockMvc.perform(get("/api/sync/status"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.pendingCount").value(4))
                .andExpect(jsonPath("$.oldestPendingAt").value("2026-08-23T01:00:00Z"))
                .andExpect(jsonPath("$.reportedAt").value("2026-08-23T02:00:00Z"));
    }
}
