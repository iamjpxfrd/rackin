package com.rackin.backend.service;

import com.rackin.backend.exception.MemberIdConflictException;
import com.rackin.backend.model.Member;
import com.rackin.backend.model.MembershipStatus;
import com.rackin.backend.model.Payment;
import com.rackin.backend.model.PaymentMethod;
import com.rackin.backend.model.PlanType;
import com.rackin.backend.repository.MemberRepository;
import com.rackin.backend.web.dto.RegisterMemberRequest;
import com.rackin.backend.web.dto.RegisterMemberResponse;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MemberRegistrarTest {

    @Mock
    private MemberRepository memberRepository;

    @Mock
    private PaymentService paymentService;

    private MemberRegistrar registrar;

    @Test
    void register_whenNoExistingMembers_shouldAssignFirstSequentialId() {
        registrar = new MemberRegistrar(memberRepository, paymentService);
        when(memberRepository.findMaxNumericId()).thenReturn(1000);
        Instant coversUntil = Instant.now().plusSeconds(3600);
        Payment payment = new Payment();
        payment.setCoversUntil(coversUntil);
        when(paymentService.recordPayment(any(Member.class), any(BigDecimal.class), any(PaymentMethod.class), isNull(), any(Instant.class), isNull(), isNull()))
                .thenReturn(payment);
        when(paymentService.deriveStatus(coversUntil)).thenReturn(MembershipStatus.active);

        RegisterMemberRequest request = new RegisterMemberRequest(
                "Maria Santos", PlanType.monthly, new BigDecimal("1200.00"), PaymentMethod.cash, null, null, null, null, null, null, null);

        RegisterMemberResponse response = registrar.register(request);

        assertThat(response.memberId()).isEqualTo("1001");
        assertThat(response.status()).isEqualTo(MembershipStatus.active);
        assertThat(response.coversUntil()).isEqualTo(coversUntil);
    }

    @Test
    void register_whenExistingMembers_shouldAssignMaxPlusOne() {
        registrar = new MemberRegistrar(memberRepository, paymentService);
        when(memberRepository.findMaxNumericId()).thenReturn(1217);
        Payment payment = new Payment();
        payment.setCoversUntil(Instant.now());
        when(paymentService.recordPayment(any(Member.class), any(BigDecimal.class), any(PaymentMethod.class), isNull(), any(Instant.class), isNull(), isNull()))
                .thenReturn(payment);
        when(paymentService.deriveStatus(any(Instant.class))).thenReturn(MembershipStatus.active);

        RegisterMemberRequest request = new RegisterMemberRequest(
                "Diego Santos", PlanType.weekly, new BigDecimal("300.00"), PaymentMethod.transfer, null, null, null, null, null, null, null);

        RegisterMemberResponse response = registrar.register(request);

        assertThat(response.memberId()).isEqualTo("1218");
    }

    @Test
    void register_whenNameHasSurroundingWhitespace_shouldTrimBeforeSaving() {
        registrar = new MemberRegistrar(memberRepository, paymentService);
        when(memberRepository.findMaxNumericId()).thenReturn(1000);
        Payment payment = new Payment();
        payment.setCoversUntil(Instant.now());
        when(paymentService.recordPayment(any(Member.class), any(BigDecimal.class), any(PaymentMethod.class), isNull(), any(Instant.class), isNull(), isNull()))
                .thenReturn(payment);
        when(paymentService.deriveStatus(any(Instant.class))).thenReturn(MembershipStatus.active);

        RegisterMemberRequest request = new RegisterMemberRequest(
                "  Maria Santos  ", PlanType.monthly, new BigDecimal("1200.00"), PaymentMethod.cash, null, null, null, null, null, null, null);

        registrar.register(request);

        ArgumentCaptor<Member> captor = ArgumentCaptor.forClass(Member.class);
        verify(memberRepository).saveAndFlush(captor.capture());
        assertThat(captor.getValue().getName()).isEqualTo("Maria Santos");
    }

    @Test
    void register_whenClientUuidProvided_shouldUseIt() {
        registrar = new MemberRegistrar(memberRepository, paymentService);
        when(memberRepository.findMaxNumericId()).thenReturn(1000);
        Payment payment = new Payment();
        payment.setCoversUntil(Instant.now());
        when(paymentService.recordPayment(any(Member.class), any(BigDecimal.class), any(PaymentMethod.class), isNull(), any(Instant.class), isNull(), isNull()))
                .thenReturn(payment);
        when(paymentService.deriveStatus(any(Instant.class))).thenReturn(MembershipStatus.active);
        UUID clientUuid = UUID.randomUUID();

        RegisterMemberRequest request = new RegisterMemberRequest(
                "Maria Santos", PlanType.monthly, new BigDecimal("1200.00"), PaymentMethod.cash, null, clientUuid, null, null, null, null, null);

        registrar.register(request);

        ArgumentCaptor<Member> captor = ArgumentCaptor.forClass(Member.class);
        verify(memberRepository).saveAndFlush(captor.capture());
        assertThat(captor.getValue().getClientUuid()).isEqualTo(clientUuid);
    }

    @Test
    void register_whenClientUuidOmitted_shouldGenerateOne() {
        registrar = new MemberRegistrar(memberRepository, paymentService);
        when(memberRepository.findMaxNumericId()).thenReturn(1000);
        Payment payment = new Payment();
        payment.setCoversUntil(Instant.now());
        when(paymentService.recordPayment(any(Member.class), any(BigDecimal.class), any(PaymentMethod.class), isNull(), any(Instant.class), isNull(), isNull()))
                .thenReturn(payment);
        when(paymentService.deriveStatus(any(Instant.class))).thenReturn(MembershipStatus.active);

        RegisterMemberRequest request = new RegisterMemberRequest(
                "Maria Santos", PlanType.monthly, new BigDecimal("1200.00"), PaymentMethod.cash, null, null, null, null, null, null, null);

        registrar.register(request);

        ArgumentCaptor<Member> captor = ArgumentCaptor.forClass(Member.class);
        verify(memberRepository).saveAndFlush(captor.capture());
        assertThat(captor.getValue().getClientUuid()).isNotNull();
    }

    @Test
    void register_whenTabletSuppliesMemberId_shouldKeepItRatherThanAssignItsOwn() {
        registrar = new MemberRegistrar(memberRepository, paymentService);
        when(memberRepository.existsById("1042")).thenReturn(false);
        Payment payment = new Payment();
        payment.setCoversUntil(Instant.now());
        when(paymentService.recordPayment(any(Member.class), any(BigDecimal.class), any(PaymentMethod.class),
                isNull(), any(Instant.class), isNull(), isNull())).thenReturn(payment);
        when(paymentService.deriveStatus(any(Instant.class))).thenReturn(MembershipStatus.active);

        RegisterMemberRequest request = new RegisterMemberRequest(
                "Maria Santos", PlanType.monthly, new BigDecimal("1200.00"), PaymentMethod.cash, null, null,
                "1042", null, null, null, null);

        RegisterMemberResponse response = registrar.register(request);

        // The tablet already printed #1042 on this member's QR card; renumbering
        // them here would silently invalidate it (backend-schema.md 7).
        assertThat(response.memberId()).isEqualTo("1042");
        verify(memberRepository, never()).findMaxNumericId();
    }

    @Test
    void register_whenSuppliedMemberIdIsTaken_shouldThrowConflictRatherThanRetryForever() {
        registrar = new MemberRegistrar(memberRepository, paymentService);
        when(memberRepository.existsById("1042")).thenReturn(true);

        RegisterMemberRequest request = new RegisterMemberRequest(
                "Maria Santos", PlanType.monthly, new BigDecimal("1200.00"), PaymentMethod.cash, null, null,
                "1042", null, null, null, null);

        // Distinct from the id race MemberService retries: this id belongs to
        // someone else and no number of attempts will free it.
        assertThatThrownBy(() -> registrar.register(request))
                .isInstanceOf(MemberIdConflictException.class)
                .hasMessageContaining("#1042");
        verify(memberRepository, never()).saveAndFlush(any());
    }

    @Test
    void register_whenCreatedAtProvided_shouldUseItForBothMemberAndPayment() {
        registrar = new MemberRegistrar(memberRepository, paymentService);
        when(memberRepository.findMaxNumericId()).thenReturn(1000);
        Payment payment = new Payment();
        payment.setCoversUntil(Instant.now());
        when(paymentService.recordPayment(any(Member.class), any(BigDecimal.class), any(PaymentMethod.class),
                isNull(), any(Instant.class), isNull(), isNull())).thenReturn(payment);
        when(paymentService.deriveStatus(any(Instant.class))).thenReturn(MembershipStatus.active);
        Instant registeredOnTablet = Instant.parse("2026-08-11T02:15:00Z");

        RegisterMemberRequest request = new RegisterMemberRequest(
                "Maria Santos", PlanType.monthly, new BigDecimal("1200.00"), PaymentMethod.cash, null, null,
                null, registeredOnTablet, null, null, null);

        registrar.register(request);

        ArgumentCaptor<Member> memberCaptor = ArgumentCaptor.forClass(Member.class);
        verify(memberRepository).saveAndFlush(memberCaptor.capture());
        assertThat(memberCaptor.getValue().getCreatedAt()).isEqualTo(registeredOnTablet);

        // The same instant, not two calls to now(): coverage starting before the
        // member existed would be incoherent.
        ArgumentCaptor<Instant> paidAtCaptor = ArgumentCaptor.forClass(Instant.class);
        verify(paymentService).recordPayment(any(Member.class), any(BigDecimal.class), any(PaymentMethod.class),
                isNull(), paidAtCaptor.capture(), isNull(), isNull());
        assertThat(paidAtCaptor.getValue()).isEqualTo(registeredOnTablet);
    }

    @Test
    void register_shouldRequestPaymentUsingRegisteredMemberAndRequestDetails() {
        registrar = new MemberRegistrar(memberRepository, paymentService);
        when(memberRepository.findMaxNumericId()).thenReturn(1000);
        Payment payment = new Payment();
        payment.setCoversUntil(Instant.now());
        when(paymentService.recordPayment(any(Member.class), eq(new BigDecimal("1200.00")), eq(PaymentMethod.cash), isNull(), any(Instant.class), isNull(), isNull()))
                .thenReturn(payment);
        when(paymentService.deriveStatus(any(Instant.class))).thenReturn(MembershipStatus.active);

        RegisterMemberRequest request = new RegisterMemberRequest(
                "Maria Santos", PlanType.monthly, new BigDecimal("1200.00"), PaymentMethod.cash, "09171234567", null, null, null, null, null, null);

        registrar.register(request);

        ArgumentCaptor<Member> captor = ArgumentCaptor.forClass(Member.class);
        verify(paymentService).recordPayment(captor.capture(), eq(new BigDecimal("1200.00")), eq(PaymentMethod.cash), isNull(), any(Instant.class), isNull(), isNull());
        assertThat(captor.getValue().getId()).isEqualTo("1001");
        assertThat(captor.getValue().getPhone()).isEqualTo("09171234567");
        assertThat(captor.getValue().getPlanType()).isEqualTo(PlanType.monthly);
    }
}
