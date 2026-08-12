package com.rackin.backend.web;

import com.rackin.backend.exception.MemberNotFoundException;
import com.rackin.backend.model.MembershipStatus;
import com.rackin.backend.service.PaymentService;
import com.rackin.backend.web.dto.ExpiringMemberResponse;
import com.rackin.backend.web.dto.MemberSummary;
import com.rackin.backend.web.dto.PaymentResponse;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(PaymentController.class)
class PaymentControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private PaymentService paymentService;

    @Test
    void recordPayment_withValidRequest_shouldReturn201() throws Exception {
        Instant coversUntil = Instant.parse("2026-08-11T00:00:00Z");
        when(paymentService.recordPayment(eq("1114"), any(), any(), isNull(), isNull(), isNull(), isNull()))
                .thenReturn(new PaymentResponse(coversUntil, MembershipStatus.active));

        String body = """
                {"memberId":"1114","amount":1200,"method":"transfer"}
                """;

        mockMvc.perform(post("/api/payments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.coversUntil").value("2026-08-11T00:00:00Z"))
                .andExpect(jsonPath("$.status").value("active"));
    }

    @Test
    void recordPayment_whenMemberNotFound_shouldReturn404() throws Exception {
        when(paymentService.recordPayment(eq("9999"), any(), any(), isNull(), isNull(), isNull(), isNull()))
                .thenThrow(new MemberNotFoundException("9999"));

        String body = """
                {"memberId":"9999","amount":1200,"method":"cash"}
                """;

        mockMvc.perform(post("/api/payments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("No member found for #9999"));
    }

    @Test
    void recordPayment_withMissingFields_shouldReturn400() throws Exception {
        mockMvc.perform(post("/api/payments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$[?(@.field=='memberId')]").exists())
                .andExpect(jsonPath("$[?(@.field=='amount')]").exists())
                .andExpect(jsonPath("$[?(@.field=='method')]").exists());
    }

    @Test
    void getExpiring_withoutDaysParam_shouldReturn200AndUseDefault() throws Exception {
        when(paymentService.getExpiring(null)).thenReturn(
                List.of(new ExpiringMemberResponse(new MemberSummary("1098", "Mika Perez"),
                        Instant.parse("2026-07-14T00:00:00Z"))));

        mockMvc.perform(get("/api/payments/expiring"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].member.id").value("1098"))
                .andExpect(jsonPath("$[0].coversUntil").value("2026-07-14T00:00:00Z"));
    }

    @Test
    void getExpiring_withDaysParam_shouldPassThrough() throws Exception {
        when(paymentService.getExpiring(3)).thenReturn(List.of());

        mockMvc.perform(get("/api/payments/expiring").param("days", "3"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());
    }
}
