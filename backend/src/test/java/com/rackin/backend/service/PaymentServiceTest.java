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
import com.rackin.backend.web.dto.RosterMemberResponse;
import jakarta.persistence.Tuple;
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

        PaymentResponse response = paymentService.recordPayment(
                "1001", new BigDecimal("1200.00"), PaymentMethod.cash, null, null, null, null, null, null);

        assertThat(response.status()).isEqualTo(MembershipStatus.active);
        assertThat(response.coversUntil()).isAfter(Instant.now());
    }

    @Test
    void recordPayment_whenMemberNotFound_shouldThrowAndNeverSave() {
        when(memberRepository.findById("9999")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> paymentService.recordPayment(
                "9999", new BigDecimal("1200.00"), PaymentMethod.cash, null, null, null, null, null, null))
                .isInstanceOf(MemberNotFoundException.class)
                .hasMessage("No member found for #9999");
        verify(paymentRepository, never()).save(any());
    }

    @Test
    void recordPayment_whenWeeklyPlan_shouldCoverSevenDaysFromPaidAt() {
        Member member = member("1001", PlanType.weekly);
        when(memberRepository.findById("1001")).thenReturn(Optional.of(member));
        when(paymentRepository.findFirstByMember_IdOrderByPaidAtDesc("1001")).thenReturn(Optional.empty());
        when(paymentRepository.save(any(Payment.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Instant before = Instant.now();
        PaymentResponse response = paymentService.recordPayment(
                "1001", new BigDecimal("300.00"), PaymentMethod.cash, null, null, null, null, null, null);
        Instant after = Instant.now();

        assertThat(response.coversUntil()).isBetween(before.plus(7, ChronoUnit.DAYS), after.plus(7, ChronoUnit.DAYS));
    }

    @Test
    void recordPayment_whenMonthlyPlan_shouldCoverThirtyDaysFromPaidAt() {
        Member member = member("1001", PlanType.monthly);
        when(memberRepository.findById("1001")).thenReturn(Optional.of(member));
        when(paymentRepository.findFirstByMember_IdOrderByPaidAtDesc("1001")).thenReturn(Optional.empty());
        when(paymentRepository.save(any(Payment.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Instant before = Instant.now();
        PaymentResponse response = paymentService.recordPayment(
                "1001", new BigDecimal("1200.00"), PaymentMethod.cash, null, null, null, null, null, null);
        Instant after = Instant.now();

        assertThat(response.coversUntil()).isBetween(before.plus(30, ChronoUnit.DAYS), after.plus(30, ChronoUnit.DAYS));
    }

    @Test
    void recordPayment_whenAnnualPlan_shouldCoverThreeSixtyFiveDaysFromPaidAt() {
        Member member = member("1001", PlanType.annually);
        when(memberRepository.findById("1001")).thenReturn(Optional.of(member));
        when(paymentRepository.findFirstByMember_IdOrderByPaidAtDesc("1001")).thenReturn(Optional.empty());
        when(paymentRepository.save(any(Payment.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Instant before = Instant.now();
        PaymentResponse response = paymentService.recordPayment(
                "1001", new BigDecimal("1200.00"), PaymentMethod.cash, null, null, null, null, null, null);
        Instant after = Instant.now();

        assertThat(response.coversUntil()).isBetween(before.plus(365, ChronoUnit.DAYS), after.plus(365, ChronoUnit.DAYS));
    }

    @Test
    void recordPayment_whenStillCovered_shouldStackOnExistingCoverageRatherThanResetFromToday() {
        Member member = member("1001", PlanType.monthly);
        when(memberRepository.findById("1001")).thenReturn(Optional.of(member));
        Instant existingCoversUntil = Instant.now().plus(20, ChronoUnit.DAYS);
        Payment existing = new Payment();
        existing.setCoversUntil(existingCoversUntil);
        when(paymentRepository.findFirstByMember_IdOrderByPaidAtDesc("1001")).thenReturn(Optional.of(existing));
        when(paymentRepository.save(any(Payment.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // A second Monthly payment while 20 days of the first are still left:
        // 20 (remaining) + 30 (new plan) = 50 days out, not just 30 from today —
        // the exact "2 monthly payments = 60 days, not 30" bug (PR #14/#15 on
        // the tablet) mirrored here on the backend.
        PaymentResponse response = paymentService.recordPayment(
                "1001", new BigDecimal("800.00"), PaymentMethod.cash, null, null, null, null, null, null);

        assertThat(response.coversUntil()).isCloseTo(
                existingCoversUntil.plus(30, ChronoUnit.DAYS), org.assertj.core.api.Assertions.within(2, ChronoUnit.SECONDS));
    }

    @Test
    void recordPayment_whenLapsed_shouldStartFreshFromPaidAtRatherThanStackOnAnExpiredDate() {
        Member member = member("1001", PlanType.monthly);
        when(memberRepository.findById("1001")).thenReturn(Optional.of(member));
        Instant lapsedCoversUntil = Instant.now().minus(10, ChronoUnit.DAYS);
        Payment existing = new Payment();
        existing.setCoversUntil(lapsedCoversUntil);
        when(paymentRepository.findFirstByMember_IdOrderByPaidAtDesc("1001")).thenReturn(Optional.of(existing));
        when(paymentRepository.save(any(Payment.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Instant before = Instant.now();
        PaymentResponse response = paymentService.recordPayment(
                "1001", new BigDecimal("800.00"), PaymentMethod.cash, null, null, null, null, null, null);
        Instant after = Instant.now();

        // Not lapsedCoversUntil + 30 - a membership that already ended doesn't
        // get to stack on top of a date in the past.
        assertThat(response.coversUntil()).isBetween(before.plus(30, ChronoUnit.DAYS), after.plus(30, ChronoUnit.DAYS));
    }

    @Test
    void recordPayment_whenClientUuidOmitted_shouldGenerateOne() {
        Member member = member("1001", PlanType.monthly);
        when(memberRepository.findById("1001")).thenReturn(Optional.of(member));
        when(paymentRepository.findFirstByMember_IdOrderByPaidAtDesc("1001")).thenReturn(Optional.empty());
        when(paymentRepository.save(any(Payment.class))).thenAnswer(invocation -> invocation.getArgument(0));

        paymentService.recordPayment(
                "1001", new BigDecimal("1200.00"), PaymentMethod.cash, null, null, null, null, null, null);

        ArgumentCaptor<Payment> captor = ArgumentCaptor.forClass(Payment.class);
        verify(paymentRepository).save(captor.capture());
        assertThat(captor.getValue().getClientUuid()).isNotNull();
    }

    @Test
    void recordPayment_whenClientUuidProvided_shouldUseIt() {
        Member member = member("1001", PlanType.monthly);
        when(memberRepository.findById("1001")).thenReturn(Optional.of(member));
        when(paymentRepository.findFirstByMember_IdOrderByPaidAtDesc("1001")).thenReturn(Optional.empty());
        when(paymentRepository.save(any(Payment.class))).thenAnswer(invocation -> invocation.getArgument(0));
        UUID clientUuid = UUID.randomUUID();

        paymentService.recordPayment(
                "1001", new BigDecimal("1200.00"), PaymentMethod.cash, null, null, clientUuid, null, null, null);

        ArgumentCaptor<Payment> captor = ArgumentCaptor.forClass(Payment.class);
        verify(paymentRepository).save(captor.capture());
        assertThat(captor.getValue().getClientUuid()).isEqualTo(clientUuid);
    }

    @Test
    void recordPayment_whenClientUuidAlreadyRecorded_shouldReturnOriginalWithoutSavingAgain() {
        Member member = member("1001", PlanType.monthly);
        UUID clientUuid = UUID.randomUUID();
        Instant originalCoverage = Instant.now().plus(30, ChronoUnit.DAYS);
        Payment original = new Payment();
        original.setCoversUntil(originalCoverage);
        original.setClientUuid(clientUuid);
        when(memberRepository.findById("1001")).thenReturn(Optional.of(member));
        when(paymentRepository.findByClientUuid(clientUuid)).thenReturn(Optional.of(original));

        PaymentResponse response = paymentService.recordPayment(
                "1001", new BigDecimal("1200.00"), PaymentMethod.cash, null, null, clientUuid, null, null, null);

        // The whole point of TRD 7's idempotency: a retried sync must not hand
        // the member another 30 days nobody paid for.
        assertThat(response.coversUntil()).isEqualTo(originalCoverage);
        verify(paymentRepository, never()).save(any());
    }

    @Test
    void recordPayment_whenPaidAtProvided_shouldCountCoverageFromThenNotFromNow() {
        Member member = member("1001", PlanType.weekly);
        when(memberRepository.findById("1001")).thenReturn(Optional.of(member));
        when(paymentRepository.findFirstByMember_IdOrderByPaidAtDesc("1001")).thenReturn(Optional.empty());
        when(paymentRepository.save(any(Payment.class))).thenAnswer(invocation -> invocation.getArgument(0));
        // Paid at the desk four days ago, on a tablet that only just found wifi.
        Instant paidAt = Instant.now().minus(4, ChronoUnit.DAYS);

        PaymentResponse response = paymentService.recordPayment(
                "1001", new BigDecimal("300.00"), PaymentMethod.cash, null, null, null, paidAt, null, null);

        // Three days of coverage left, not seven — syncing late must not silently
        // extend a membership past what the member actually bought.
        assertThat(response.coversUntil()).isEqualTo(paidAt.plus(7, ChronoUnit.DAYS));
        assertThat(response.coversUntil()).isBefore(Instant.now().plus(4, ChronoUnit.DAYS));
    }

    @Test
    void recordPayment_shouldStoreWhoTookTheMoney() {
        Member member = member("1001", PlanType.monthly);
        when(memberRepository.findById("1001")).thenReturn(Optional.of(member));
        when(paymentRepository.findFirstByMember_IdOrderByPaidAtDesc("1001")).thenReturn(Optional.empty());
        when(paymentRepository.save(any(Payment.class))).thenAnswer(invocation -> invocation.getArgument(0));

        paymentService.recordPayment("1001", new BigDecimal("1200.00"), PaymentMethod.cash,
                null, null, null, null, "staff-ana", "Ana Reyes");

        ArgumentCaptor<Payment> captor = ArgumentCaptor.forClass(Payment.class);
        verify(paymentRepository).save(captor.capture());
        // The name is stored alongside the id, not looked up from it: correcting
        // a spelling later must not rewrite who took this payment.
        assertThat(captor.getValue().getRecordedById()).isEqualTo("staff-ana");
        assertThat(captor.getValue().getRecordedByName()).isEqualTo("Ana Reyes");
    }

    @Test
    void recordPayment_whenNobodyIsSignedIn_shouldRecordItUnattributedRatherThanRefuse() {
        Member member = member("1001", PlanType.monthly);
        when(memberRepository.findById("1001")).thenReturn(Optional.of(member));
        when(paymentRepository.findFirstByMember_IdOrderByPaidAtDesc("1001")).thenReturn(Optional.empty());
        when(paymentRepository.save(any(Payment.class))).thenAnswer(invocation -> invocation.getArgument(0));

        paymentService.recordPayment("1001", new BigDecimal("1200.00"), PaymentMethod.cash,
                null, null, null, null, null, null);

        // Refusing would mean the app declines to record money the gym has
        // already taken, which is a worse record than an unattributed one.
        ArgumentCaptor<Payment> captor = ArgumentCaptor.forClass(Payment.class);
        verify(paymentRepository).save(captor.capture());
        assertThat(captor.getValue().getRecordedById()).isNull();
    }

    @Test
    void recordPayment_whenPlanTypeProvidedAndDifferent_shouldSwitchTheMembersPlanAndUseItsDuration() {
        Member member = member("1001", PlanType.session);
        when(memberRepository.findById("1001")).thenReturn(Optional.of(member));
        when(paymentRepository.findFirstByMember_IdOrderByPaidAtDesc("1001")).thenReturn(Optional.empty());
        when(paymentRepository.save(any(Payment.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // A Session drop-in converting to Monthly at the point of payment
        // (RecordPaymentSheet.jsx's Plan picker).
        Instant before = Instant.now();
        PaymentResponse response = paymentService.recordPayment(
                "1001", new BigDecimal("800.00"), PaymentMethod.cash, PlanType.monthly, null, null, null, null, null);
        Instant after = Instant.now();

        assertThat(member.getPlanType()).isEqualTo(PlanType.monthly);
        assertThat(response.coversUntil()).isBetween(before.plus(30, ChronoUnit.DAYS), after.plus(30, ChronoUnit.DAYS));
    }

    @Test
    void recordPayment_whenPlanTypeOmitted_shouldLeaveTheMembersPlanUnchanged() {
        Member member = member("1001", PlanType.monthly);
        when(memberRepository.findById("1001")).thenReturn(Optional.of(member));
        when(paymentRepository.findFirstByMember_IdOrderByPaidAtDesc("1001")).thenReturn(Optional.empty());
        when(paymentRepository.save(any(Payment.class))).thenAnswer(invocation -> invocation.getArgument(0));

        paymentService.recordPayment(
                "1001", new BigDecimal("800.00"), PaymentMethod.cash, null, null, null, null, null, null);

        assertThat(member.getPlanType()).isEqualTo(PlanType.monthly);
    }

    @Test
    void recordPayment_whenIsStudentProvidedAndDifferent_shouldCorrectTheMembersMembershipType() {
        Member member = member("1001", PlanType.monthly);
        member.setStudent(false);
        when(memberRepository.findById("1001")).thenReturn(Optional.of(member));
        when(paymentRepository.findFirstByMember_IdOrderByPaidAtDesc("1001")).thenReturn(Optional.empty());
        when(paymentRepository.save(any(Payment.class))).thenAnswer(invocation -> invocation.getArgument(0));

        paymentService.recordPayment(
                "1001", new BigDecimal("700.00"), PaymentMethod.cash, null, true, null, null, null, null);

        assertThat(member.isStudent()).isTrue();
    }

    @Test
    void recordPayment_whenIsStudentOmitted_shouldLeaveTheMembersMembershipTypeUnchanged() {
        Member member = member("1001", PlanType.monthly);
        member.setStudent(true);
        when(memberRepository.findById("1001")).thenReturn(Optional.of(member));
        when(paymentRepository.findFirstByMember_IdOrderByPaidAtDesc("1001")).thenReturn(Optional.empty());
        when(paymentRepository.save(any(Payment.class))).thenAnswer(invocation -> invocation.getArgument(0));

        paymentService.recordPayment(
                "1001", new BigDecimal("700.00"), PaymentMethod.cash, null, null, null, null, null, null);

        assertThat(member.isStudent()).isTrue();
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

    // A hand-written fake rather than a Mockito mock: Tuple's get(String,
    // Class<X>) is generic, and stubbing it through when(...) hits Mockito's
    // strict-stubbing detection ("UnfinishedStubbing") on this JDK/Mockito
    // combination. A Map-backed fake sidesteps that entirely. Mirrors what
    // findRoster()'s native query aliases each column as — see
    // PaymentRepository#findRoster.
    private Tuple rosterTuple(String id, String name, PlanType planType, String phone, Instant coversUntil) {
        java.util.Map<String, Object> values = new java.util.HashMap<>();
        values.put("id", id);
        values.put("name", name);
        values.put("planType", planType.name());
        values.put("phone", phone);
        values.put("coversUntil", coversUntil);
        return new Tuple() {
            public <X> X get(jakarta.persistence.TupleElement<X> tupleElement) {
                throw new UnsupportedOperationException();
            }

            public Object get(String alias) {
                return values.get(alias);
            }

            @SuppressWarnings("unchecked")
            public <X> X get(String alias, Class<X> type) {
                return (X) values.get(alias);
            }

            public Object get(int i) {
                throw new UnsupportedOperationException();
            }

            public <X> X get(int i, Class<X> type) {
                throw new UnsupportedOperationException();
            }

            public Object[] toArray() {
                throw new UnsupportedOperationException();
            }

            public List<jakarta.persistence.TupleElement<?>> getElements() {
                throw new UnsupportedOperationException();
            }
        };
    }

    @Test
    void getRoster_shouldMapProjectionsToResponses() {
        Instant coversUntil = Instant.now().plus(20, ChronoUnit.DAYS);
        when(paymentRepository.findRoster()).thenReturn(List.of(
                rosterTuple("1098", "Mika Perez", PlanType.monthly, "555", coversUntil)));

        List<RosterMemberResponse> result = paymentService.getRoster();

        assertThat(result).hasSize(1);
        RosterMemberResponse response = result.get(0);
        assertThat(response.member().id()).isEqualTo("1098");
        assertThat(response.member().name()).isEqualTo("Mika Perez");
        assertThat(response.member().planType()).isEqualTo(PlanType.monthly);
        assertThat(response.member().phone()).isEqualTo("555");
        assertThat(response.status()).isEqualTo(MembershipStatus.active);
    }

    @Test
    void getRoster_whenNoPaymentAtAll_shouldReturnExpiredAndNotExpiringSoon() {
        when(paymentRepository.findRoster()).thenReturn(List.of(
                rosterTuple("1098", "Mika Perez", PlanType.monthly, null, null)));

        List<RosterMemberResponse> result = paymentService.getRoster();

        assertThat(result.get(0).status()).isEqualTo(MembershipStatus.expired);
        assertThat(result.get(0).isExpiringSoon()).isFalse();
    }

    @Test
    void getRoster_whenCoverageAlreadyPast_shouldReturnExpiredAndNotExpiringSoon() {
        when(paymentRepository.findRoster()).thenReturn(List.of(
                rosterTuple("1098", "Mika Perez", PlanType.monthly, null,
                        Instant.now().minus(1, ChronoUnit.DAYS))));

        List<RosterMemberResponse> result = paymentService.getRoster();

        assertThat(result.get(0).status()).isEqualTo(MembershipStatus.expired);
        assertThat(result.get(0).isExpiringSoon()).isFalse();
    }

    @Test
    void getRoster_whenActiveAndWithinConfiguredExpiringWindow_shouldMarkExpiringSoon() {
        // RackinProperties(14, 7) in setUp: expiringDaysDefault is 7.
        when(paymentRepository.findRoster()).thenReturn(List.of(
                rosterTuple("1098", "Mika Perez", PlanType.monthly, null,
                        Instant.now().plus(3, ChronoUnit.DAYS))));

        List<RosterMemberResponse> result = paymentService.getRoster();

        assertThat(result.get(0).status()).isEqualTo(MembershipStatus.active);
        assertThat(result.get(0).isExpiringSoon()).isTrue();
    }

    @Test
    void getRoster_whenActiveButOutsideConfiguredExpiringWindow_shouldNotMarkExpiringSoon() {
        when(paymentRepository.findRoster()).thenReturn(List.of(
                rosterTuple("1098", "Mika Perez", PlanType.monthly, null,
                        Instant.now().plus(20, ChronoUnit.DAYS))));

        List<RosterMemberResponse> result = paymentService.getRoster();

        assertThat(result.get(0).status()).isEqualTo(MembershipStatus.active);
        assertThat(result.get(0).isExpiringSoon()).isFalse();
    }
}
