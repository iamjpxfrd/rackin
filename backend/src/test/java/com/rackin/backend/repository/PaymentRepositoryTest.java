package com.rackin.backend.repository;

import com.rackin.backend.model.Member;
import com.rackin.backend.model.Payment;
import com.rackin.backend.model.PaymentMethod;
import com.rackin.backend.model.PlanType;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

@DataJpaTest
class PaymentRepositoryTest {

    @Autowired
    private MemberRepository memberRepository;

    @Autowired
    private PaymentRepository paymentRepository;

    private Member persistMember(String id) {
        return persistMember(id, "Maria Santos");
    }

    private Member persistMember(String id, String name) {
        Member member = new Member();
        member.setId(id);
        member.setName(name);
        member.setPlanType(PlanType.monthly);
        member.setCreatedAt(Instant.now());
        member.setClientUuid(UUID.randomUUID());
        return memberRepository.saveAndFlush(member);
    }

    private Payment payment(Member member, Instant paidAt, Instant coversUntil) {
        Payment payment = new Payment();
        payment.setMember(member);
        payment.setAmount(new BigDecimal("1200.00"));
        payment.setMethod(PaymentMethod.cash);
        payment.setPaidAt(paidAt);
        payment.setCoversUntil(coversUntil);
        payment.setClientUuid(UUID.randomUUID());
        return payment;
    }

    @Test
    void findFirstByMemberIdOrderByPaidAtDesc_shouldReturnMostRecentPayment() {
        Member member = persistMember("1001");
        Instant now = Instant.now();
        paymentRepository.saveAndFlush(payment(member, now.minus(60, ChronoUnit.DAYS), now.minus(30, ChronoUnit.DAYS)));
        paymentRepository.saveAndFlush(payment(member, now.minus(30, ChronoUnit.DAYS), now));
        paymentRepository.saveAndFlush(payment(member, now.minus(90, ChronoUnit.DAYS), now.minus(60, ChronoUnit.DAYS)));

        Optional<Payment> latest = paymentRepository.findFirstByMember_IdOrderByPaidAtDesc("1001");

        assertThat(latest).isPresent();
        assertThat(latest.get().getPaidAt()).isCloseTo(now.minus(30, ChronoUnit.DAYS), within(1, ChronoUnit.SECONDS));
    }

    @Test
    void findFirstByMemberIdOrderByPaidAtDesc_whenNoPayments_shouldReturnEmpty() {
        persistMember("1001");

        assertThat(paymentRepository.findFirstByMember_IdOrderByPaidAtDesc("1001")).isEmpty();
    }

    @Test
    void findExpiring_shouldOnlyReturnMembersWhoseLatestPaymentFallsInWindow() {
        Instant now = Instant.now();

        Member expiringSoon = persistMember("1001");
        paymentRepository.saveAndFlush(payment(expiringSoon, now, now.plus(3, ChronoUnit.DAYS)));

        Member notExpiringYet = persistMember("1002");
        paymentRepository.saveAndFlush(payment(notExpiringYet, now, now.plus(20, ChronoUnit.DAYS)));

        Member alreadyExpired = persistMember("1003");
        paymentRepository.saveAndFlush(payment(alreadyExpired, now.minus(60, ChronoUnit.DAYS), now.minus(30, ChronoUnit.DAYS)));

        List<ExpiringMemberProjection> expiring =
                paymentRepository.findExpiring(now, now.plus(7, ChronoUnit.DAYS));

        assertThat(expiring).hasSize(1);
        assertThat(expiring.get(0).getId()).isEqualTo("1001");
    }

    @Test
    void findExpiring_shouldUseOnlyTheLatestPaymentPerMember() {
        Instant now = Instant.now();
        Member member = persistMember("1001");
        // Older payment would fall inside the window; latest payment does not.
        paymentRepository.saveAndFlush(payment(member, now.minus(40, ChronoUnit.DAYS), now.plus(2, ChronoUnit.DAYS)));
        paymentRepository.saveAndFlush(payment(member, now, now.plus(30, ChronoUnit.DAYS)));

        List<ExpiringMemberProjection> expiring =
                paymentRepository.findExpiring(now, now.plus(7, ChronoUnit.DAYS));

        assertThat(expiring).isEmpty();
    }

    @Test
    void findExpiring_shouldOrderSoonestFirst() {
        Instant now = Instant.now();
        Member soon = persistMember("1001");
        paymentRepository.saveAndFlush(payment(soon, now, now.plus(6, ChronoUnit.DAYS)));
        Member sooner = persistMember("1002");
        paymentRepository.saveAndFlush(payment(sooner, now, now.plus(1, ChronoUnit.DAYS)));

        List<ExpiringMemberProjection> expiring =
                paymentRepository.findExpiring(now, now.plus(7, ChronoUnit.DAYS));

        assertThat(expiring).extracting(ExpiringMemberProjection::getId).containsExactly("1002", "1001");
    }

    @Test
    void findRoster_shouldReturnEveryMemberNameAscending() {
        persistMember("1001", "Zara Cruz");
        persistMember("1002", "Ana Reyes");

        List<RosterMemberProjection> roster = paymentRepository.findRoster();

        assertThat(roster).extracting(RosterMemberProjection::getName).containsExactly("Ana Reyes", "Zara Cruz");
    }

    @Test
    void findRoster_whenMemberHasNoPayment_shouldStillIncludeThemWithNullCoverage() {
        persistMember("1001", "Ana Reyes");

        List<RosterMemberProjection> roster = paymentRepository.findRoster();

        assertThat(roster).hasSize(1);
        assertThat(roster.get(0).getId()).isEqualTo("1001");
        assertThat(roster.get(0).getCoversUntil()).isNull();
    }

    @Test
    void findRoster_shouldUseOnlyTheLatestPaymentPerMember() {
        Instant now = Instant.now();
        Member member = persistMember("1001", "Ana Reyes");
        paymentRepository.saveAndFlush(payment(member, now.minus(40, ChronoUnit.DAYS), now.minus(10, ChronoUnit.DAYS)));
        paymentRepository.saveAndFlush(payment(member, now, now.plus(30, ChronoUnit.DAYS)));

        List<RosterMemberProjection> roster = paymentRepository.findRoster();

        assertThat(roster).hasSize(1);
        assertThat(roster.get(0).getCoversUntil().toInstant())
                .isCloseTo(now.plus(30, ChronoUnit.DAYS), within(1, ChronoUnit.SECONDS));
    }

    @Test
    void findRoster_shouldIncludePlanTypeAndPhone() {
        Member member = persistMember("1001", "Ana Reyes");
        member.setPhone("09171234567");
        memberRepository.saveAndFlush(member);

        List<RosterMemberProjection> roster = paymentRepository.findRoster();

        assertThat(roster.get(0).getPlanType()).isEqualTo("monthly");
        assertThat(roster.get(0).getPhone()).isEqualTo("09171234567");
    }
}
