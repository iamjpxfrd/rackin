package com.rackin.backend.service;

import com.rackin.backend.model.MembershipStatus;
import com.rackin.backend.model.PaymentMethod;
import com.rackin.backend.model.PlanType;
import com.rackin.backend.web.dto.RegisterMemberRequest;
import com.rackin.backend.web.dto.RegisterMemberResponse;
import com.rackin.backend.web.dto.StatusResponse;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;

import java.math.BigDecimal;
import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MemberServiceTest {

    @Mock
    private MemberRegistrar registrar;

    @Mock
    private PaymentService paymentService;

    private final RegisterMemberRequest request = new RegisterMemberRequest(
            "Maria Santos", PlanType.monthly, new BigDecimal("1200.00"), PaymentMethod.cash, null, null);

    @Test
    void registerMember_whenNoConflict_shouldReturnOnFirstAttempt() {
        MemberService memberService = new MemberService(registrar, paymentService);
        RegisterMemberResponse expected = new RegisterMemberResponse("1001", MembershipStatus.active, Instant.now());
        when(registrar.register(request)).thenReturn(expected);

        RegisterMemberResponse response = memberService.registerMember(request);

        assertThat(response).isEqualTo(expected);
        verify(registrar, times(1)).register(request);
    }

    @Test
    void registerMember_whenIdRaceThenClears_shouldRetryAndSucceed() {
        MemberService memberService = new MemberService(registrar, paymentService);
        RegisterMemberResponse expected = new RegisterMemberResponse("1002", MembershipStatus.active, Instant.now());
        when(registrar.register(request))
                .thenThrow(new DataIntegrityViolationException("duplicate key"))
                .thenReturn(expected);

        RegisterMemberResponse response = memberService.registerMember(request);

        assertThat(response).isEqualTo(expected);
        verify(registrar, times(2)).register(request);
    }

    @Test
    void registerMember_whenConflictNeverClears_shouldThrowAfterMaxAttempts() {
        MemberService memberService = new MemberService(registrar, paymentService);
        DataIntegrityViolationException persistentConflict = new DataIntegrityViolationException("duplicate key");
        when(registrar.register(request)).thenThrow(persistentConflict);

        assertThatThrownBy(() -> memberService.registerMember(request))
                .isSameAs(persistentConflict);
        verify(registrar, times(20)).register(request);
    }

    @Test
    void getStatus_shouldDelegateToPaymentService() {
        MemberService memberService = new MemberService(registrar, paymentService);
        when(paymentService.getStatus("1001")).thenReturn(MembershipStatus.expired);

        StatusResponse response = memberService.getStatus("1001");

        assertThat(response.status()).isEqualTo(MembershipStatus.expired);
    }
}
