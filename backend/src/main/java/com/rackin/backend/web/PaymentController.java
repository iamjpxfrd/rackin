package com.rackin.backend.web;

import com.rackin.backend.service.PaymentService;
import com.rackin.backend.web.dto.ExpiringMemberResponse;
import com.rackin.backend.web.dto.PaymentRequest;
import com.rackin.backend.web.dto.PaymentResponse;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    private final PaymentService paymentService;
    private final int defaultExpiringDays;

    public PaymentController(PaymentService paymentService,
                              @Value("${rackin.expiring-days-default}") int defaultExpiringDays) {
        this.paymentService = paymentService;
        this.defaultExpiringDays = defaultExpiringDays;
    }

    @PostMapping
    public ResponseEntity<PaymentResponse> recordPayment(@Valid @RequestBody PaymentRequest request) {
        PaymentResponse response = paymentService.recordPayment(
                request.memberId(), request.amount(), request.method(), request.clientUuid());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/expiring")
    public List<ExpiringMemberResponse> getExpiring(@RequestParam(required = false) Integer days) {
        return paymentService.getExpiring(days != null ? days : defaultExpiringDays);
    }
}
