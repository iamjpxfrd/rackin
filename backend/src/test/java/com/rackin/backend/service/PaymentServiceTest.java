package com.rackin.backend.service;

import com.rackin.backend.config.RackinProperties;
import com.rackin.backend.exception.MemberNotFoundException;
import com.rackin.backend.model.Member;
import com.rackin.backend.model.MembershipStatus;
import com.rackin.backend.model.Payment;
import com.rackin.backend.model.PaymentMethod;
import com.rackin.backend.model.PlanType;
import com.rackin.backend.repository.ExpiringMemberProjection;
import com.rackin.backend.repository.MemberRepository;
import com.rackin.backend.repository.PaymentRepository;
import com.rackin.backend.web.dto.ExpiringMemberResponse;
import com.rackin.backend.web.dto.PaymentResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PaymentServiceTest {

    @Mock
    private PaymentRepository paymentRepository;

    @Mock
    private MemberRepository memberRepository;

    private PaymentService paymentService;

    @BeforeEach
    void setUp() {
        paymentService = new PaymentService(paymentRepository, memberRepository, new RackinProperties(14, 7));
    }

    private Member member(String id, PlanType planType) {
        Member member = new Member();
        member.setId(id);
        member.setName("Maria Santos");
        member.setPlanType(planType);
        member.setCreatedAt(Instant.now());
        member.setClientUuid(UUID.randomUUID());
        return member;
    }

    @Test
    void recordPayment_whenMemberExists_shouldSaveAndReturnCoveragePastNow() {
        Member member = member("1001", PlanType.monthly);
        when(memberRepository.findById("1001")).thenReturn(Optional.of(member));
        when(paymentRepository.save(any(Payment.class))).thenAnswer(invocation -> invocation.getArgument(0));

        PaymentResponse response = paymentService.recordPayment("1001", new BigDecimal("1200.00"), PaymentMethod.cash, null);

        assertThat(response.status()).isEqualTo(MembershipStatus.active);
        assertThat(response.coversUntil()).isAfter(Instant.now());
    }

    @Test
    void recordPayment_whenMemberNotFound_shouldThrowAndNeverSave() {
        when(memberRepository.findById("9999")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> paymentService.recordPayment("9999", new BigDecimal("1200.00"), PaymentMethod.cash, null))
                .isInstanceOf(MemberNotFoundException.class)
                .hasMessage("No member found for #9999");
        verify(paymentRepository, never()).save(any());
    }

    @Test
    void recordPayment_whenWeeklyPlan_shouldCoverSevenDaysFromPaidAt() {
        Member member = member("1001", PlanType.weekly);
        when(memberRepository.findById("1001")).thenReturn(Optional.of(member));
        when(paymentRepository.save(any(Payment.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Instant before = Instant.now();
        PaymentResponse response = paymentService.recordPayment("1001", new BigDecimal("300.00"), PaymentMethod.cash, null);
        Instant after = Instant.now();

        assertThat(response.coversUntil()).isBetween(before.plus(7, ChronoUnit.DAYS), after.plus(7, ChronoUnit.DAYS));
    }

    @Test
    void recordPayment_whenMonthlyPlan_shouldCoverThirtyDaysFromPaidAt() {
        Member member = member("1001", PlanType.monthly);
        when(memberRepository.findById("1001")).thenReturn(Optional.of(member));
        when(paymentRepository.save(any(Payment.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Instant before = Instant.now();
        PaymentResponse response = paymentService.recordPayment("1001", new BigDecimal("1200.00"), PaymentMethod.cash, null);
        Instant after = Instant.now();

        assertThat(response.coversUntil()).isBetween(before.plus(30, ChronoUnit.DAYS), after.plus(30, ChronoUnit.DAYS));
    }

    @Test
    void recordPayment_whenClientUuidOmitted_shouldGenerateOne() {
        Member member = member("1001", PlanType.monthly);
        when(memberRepository.findById("1001")).thenReturn(Optional.of(member));
        when(paymentRepository.save(any(Payment.class))).thenAnswer(invocation -> invocation.getArgument(0));

        paymentService.recordPayment("1001", new BigDecimal("1200.00"), PaymentMethod.cash, null);

        ArgumentCaptor<Payment> captor = ArgumentCaptor.forClass(Payment.class);
        verify(paymentRepository).save(captor.capture());
        assertThat(captor.getValue().getClientUuid()).isNotNull();
    }

    @Test
    void recordPayment_whenClientUuidProvided_shouldUseIt() {
        Member member = member("1001", PlanType.monthly);
        when(memberRepository.findById("1001")).thenReturn(Optional.of(member));
        when(paymentRepository.save(any(Payment.class))).thenAnswer(invocation -> invocation.getArgument(0));
        UUID clientUuid = UUID.randomUUID();

        paymentService.recordPayment("1001", new BigDecimal("1200.00"), PaymentMethod.cash, clientUuid);

        ArgumentCaptor<Payment> captor = ArgumentCaptor.forClass(Payment.class);
        verify(paymentRepository).save(captor.capture());
        assertThat(captor.getValue().getClientUuid()).isEqualTo(clientUuid);
    }

    @Test
    void getStatus_whenMemberNotFound_shouldThrow() {
        when(memberRepository.existsById("9999")).thenReturn(false);

        assertThatThrownBy(() -> paymentService.getStatus("9999"))
                .isInstanceOf(MemberNotFoundException.class)
                .hasMessage("No member found for #9999");
    }

    @Test
    void getStatus_whenNoPayments_shouldReturnExpired() {
        when(memberRepository.existsById("1001")).thenReturn(true);
        when(paymentRepository.findFirstByMember_IdOrderByPaidAtDesc("1001")).thenReturn(Optional.empty());

        assertThat(paymentService.getStatus("1001")).isEqualTo(MembershipStatus.expired);
    }

    @Test
    void getStatus_whenLatestPaymentCoversFuture_shouldReturnActive() {
        when(memberRepository.existsById("1001")).thenReturn(true);
        Payment payment = new Payment();
        payment.setCoversUntil(Instant.now().plusSeconds(3600));
        when(paymentRepository.findFirstByMember_IdOrderByPaidAtDesc("1001")).thenReturn(Optional.of(payment));

        assertThat(paymentService.getStatus("1001")).isEqualTo(MembershipStatus.active);
    }

    @Test
    void getStatus_whenLatestPaymentCoversPast_shouldReturnExpired() {
        when(memberRepository.existsById("1001")).thenReturn(true);
        Payment payment = new Payment();
        payment.setCoversUntil(Instant.now().minusSeconds(3600));
        when(paymentRepository.findFirstByMember_IdOrderByPaidAtDesc("1001")).thenReturn(Optional.of(payment));

        assertThat(paymentService.getStatus("1001")).isEqualTo(MembershipStatus.expired);
    }

    @Test
    void getExpiring_whenDaysOmitted_shouldUseConfiguredDefault() {
        when(paymentRepository.findExpiring(any(Instant.class), any(Instant.class))).thenReturn(List.of());

        paymentService.getExpiring(null);

        ArgumentCaptor<Instant> nowCaptor = ArgumentCaptor.forClass(Instant.class);
        ArgumentCaptor<Instant> untilCaptor = ArgumentCaptor.forClass(Instant.class);
        verify(paymentRepository).findExpiring(nowCaptor.capture(), untilCaptor.capture());
        assertThat(untilCaptor.getValue()).isCloseTo(
                nowCaptor.getValue().plus(7, ChronoUnit.DAYS), org.assertj.core.api.Assertions.within(2, ChronoUnit.SECONDS));
    }

    @Test
    void getExpiring_whenDaysProvided_shouldUseProvidedWindow() {
        when(paymentRepository.findExpiring(any(Instant.class), any(Instant.class))).thenReturn(List.of());

        paymentService.getExpiring(3);

        ArgumentCaptor<Instant> nowCaptor = ArgumentCaptor.forClass(Instant.class);
        ArgumentCaptor<Instant> untilCaptor = ArgumentCaptor.forClass(Instant.class);
        verify(paymentRepository).findExpiring(nowCaptor.capture(), untilCaptor.capture());
        assertThat(untilCaptor.getValue()).isCloseTo(
                nowCaptor.getValue().plus(3, ChronoUnit.DAYS), org.assertj.core.api.Assertions.within(2, ChronoUnit.SECONDS));
    }

    @Test
    void getExpiring_shouldMapProjectionsToResponses() {
        ExpiringMemberProjection projection = new ExpiringMemberProjection() {
            public String getId() {
                return "1098";
            }

            public String getName() {
                return "Mika Perez";
            }

            public OffsetDateTime getCoversUntil() {
                return OffsetDateTime.parse("2026-07-14T00:00:00Z");
            }
        };
        when(paymentRepository.findExpiring(any(Instant.class), any(Instant.class))).thenReturn(List.of(projection));

        List<ExpiringMemberResponse> result = paymentService.getExpiring(7);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).member().id()).isEqualTo("1098");
        assertThat(result.get(0).member().name()).isEqualTo("Mika Perez");
        assertThat(result.get(0).coversUntil()).isEqualTo(Instant.parse("2026-07-14T00:00:00Z"));
    }
}
