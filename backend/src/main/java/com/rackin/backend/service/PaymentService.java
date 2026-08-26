package com.rackin.backend.service;

import com.rackin.backend.config.RackinProperties;
import com.rackin.backend.exception.MemberNotFoundException;
import com.rackin.backend.model.Member;
import com.rackin.backend.model.MembershipStatus;
import com.rackin.backend.model.Payment;
import com.rackin.backend.model.PaymentMethod;
import com.rackin.backend.model.PlanType;
import com.rackin.backend.repository.MemberRepository;
import com.rackin.backend.repository.PaymentRepository;
import com.rackin.backend.repository.RosterMemberProjection;
import com.rackin.backend.web.dto.ExpiringMemberResponse;
import com.rackin.backend.web.dto.PaymentResponse;
import com.rackin.backend.web.dto.RosterMemberResponse;
import com.rackin.backend.web.dto.RosterMemberSummary;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final MemberRepository memberRepository;
    private final RackinProperties properties;

    public PaymentService(PaymentRepository paymentRepository, MemberRepository memberRepository,
                          RackinProperties properties) {
        this.paymentRepository = paymentRepository;
        this.memberRepository = memberRepository;
        this.properties = properties;
    }

    @Transactional
    public PaymentResponse recordPayment(String memberId, BigDecimal amount, PaymentMethod method,
                                         PlanType planType, Boolean isStudent, UUID clientUuid,
                                         Instant paidAt, String recordedById, String recordedByName) {
        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new MemberNotFoundException(memberId));

        // A renewal can switch the member's plan or correct their Student/Regular
        // type at the point of payment (RecordPaymentSheet.jsx) — applied before
        // recordPayment(Member, ...) below computes coverage, since a plan switch
        // must use the NEW plan's duration, not the one being replaced. Dirty
        // checking flushes this with the same transaction's payment insert; no
        // separate save() needed for a managed entity.
        if (planType != null && planType != member.getPlanType()) {
            member.setPlanType(planType);
        }
        if (isStudent != null && isStudent != member.isStudent()) {
            member.setStudent(isStudent);
        }

        Payment payment = recordPayment(member, amount, method, clientUuid, paidAt, recordedById, recordedByName);
        return new PaymentResponse(payment.getCoversUntil(), deriveStatus(payment.getCoversUntil()));
    }

    // Used by MemberService during registration, where the member was just
    // persisted in the same transaction — avoids a redundant lookup.
    Payment recordPayment(Member member, BigDecimal amount, PaymentMethod method, UUID clientUuid,
                          Instant paidAt, String recordedById, String recordedByName) {
        UUID idempotencyKey = clientUuid != null ? clientUuid : UUID.randomUUID();

        // A sync retried after a lost response must not extend coverage twice —
        // that would hand the member a free period nobody paid for (TRD 7).
        Optional<Payment> alreadyRecorded = paymentRepository.findByClientUuid(idempotencyKey);
        if (alreadyRecorded.isPresent()) {
            return alreadyRecorded.get();
        }

        // Coverage counts from when the member actually paid, not from when the
        // tablet managed to reach the network. A payment taken offline on Monday
        // and synced on Friday still expires on Monday + plan duration.
        Instant paidAtOrNow = paidAt != null ? paidAt : Instant.now();

        // Extends from whichever is later: the member's coverage before this
        // payment (if it hasn't lapsed yet) or the payment date — a renewal made
        // while still covered stacks its plan's days on top of the remaining
        // time rather than resetting it. Mirrors
        // android/src/domain/membership.js's computeCoversUntil, reversing this
        // backend's original "always paidAt + planDays, never extended, even on
        // early renewal" pilot simplification (frontend-spec.md §5.4) to match
        // what the tablet has done since PR #14/#15. Empty for a first-ever
        // payment (registration, or a hand-seeded row with no history), which
        // still starts fresh from paidAt exactly as before.
        Instant currentCoversUntil = paymentRepository.findFirstByMember_IdOrderByPaidAtDesc(member.getId())
                .map(Payment::getCoversUntil)
                .orElse(null);
        Instant base = currentCoversUntil != null && currentCoversUntil.isAfter(paidAtOrNow)
                ? currentCoversUntil : paidAtOrNow;
        Instant coversUntil = base.plus(PlanDurations.days(member.getPlanType()), ChronoUnit.DAYS);

        Payment payment = new Payment();
        payment.setMember(member);
        payment.setAmount(amount);
        payment.setMethod(method);
        payment.setPaidAt(paidAtOrNow);
        payment.setCoversUntil(coversUntil);
        payment.setClientUuid(idempotencyKey);
        // Stored exactly as the tablet reported it, including null. The backend
        // has no staff list to validate against — the tablet owns that (ADR-001)
        // — and rejecting an unattributed payment would refuse to record money
        // the gym has already taken.
        payment.setRecordedById(recordedById);
        payment.setRecordedByName(recordedByName);
        return paymentRepository.save(payment);
    }

    @Transactional(readOnly = true)
    public MembershipStatus getStatus(String memberId) {
        if (!memberRepository.existsById(memberId)) {
            throw new MemberNotFoundException(memberId);
        }
        return paymentRepository.findFirstByMember_IdOrderByPaidAtDesc(memberId)
                .map(payment -> deriveStatus(payment.getCoversUntil()))
                .orElse(MembershipStatus.expired);
    }

    // Coverage end of the member's latest payment, for replaying a registration
    // response. Empty when they have no payment at all, which registration makes
    // impossible but a hand-seeded row could not.
    @Transactional(readOnly = true)
    public Optional<Instant> getCoversUntil(String memberId) {
        return paymentRepository.findFirstByMember_IdOrderByPaidAtDesc(memberId)
                .map(Payment::getCoversUntil);
    }

    // days == null means "use the pilot's configured threshold" — resolving that
    // is a domain decision, so it happens here rather than in the controller.
    @Transactional(readOnly = true)
    public List<ExpiringMemberResponse> getExpiring(Integer days) {
        int window = days != null ? days : properties.expiringDaysDefault();
        Instant now = Instant.now();
        Instant until = now.plus(window, ChronoUnit.DAYS);
        return paymentRepository.findExpiring(now, until).stream()
                .map(ExpiringMemberResponse::from)
                .toList();
    }

    // Package-private, not private: MemberService derives the same status after
    // registration and must not carry a second copy of this rule.
    MembershipStatus deriveStatus(Instant coversUntil) {
        return !coversUntil.isBefore(Instant.now()) ? MembershipStatus.active : MembershipStatus.expired;
    }

    // The full roster (dashboard Members screen). Reuses deriveStatus and the
    // same expiringDaysDefault threshold getExpiring applies, so a controller
    // never has to decide what "active" or "expiring soon" means on its own.
    @Transactional(readOnly = true)
    public List<RosterMemberResponse> getRoster() {
        Instant now = Instant.now();
        Instant expiringUntil = now.plus(properties.expiringDaysDefault(), ChronoUnit.DAYS);
        return paymentRepository.findRoster().stream()
                .map(projection -> toRosterMemberResponse(projection, now, expiringUntil))
                .toList();
    }

    private RosterMemberResponse toRosterMemberResponse(RosterMemberProjection projection, Instant now,
                                                          Instant expiringUntil) {
        // No payment at all (a hand-seeded row; registration always creates
        // one) has nothing to derive coverage from, so it's simply expired.
        Instant coversUntil = projection.getCoversUntil() != null ? projection.getCoversUntil().toInstant() : null;
        MembershipStatus status = coversUntil != null ? deriveStatus(coversUntil) : MembershipStatus.expired;
        boolean isExpiringSoon = status == MembershipStatus.active && !coversUntil.isAfter(expiringUntil);

        RosterMemberSummary summary = new RosterMemberSummary(
                projection.getId(), projection.getName(),
                PlanType.valueOf(projection.getPlanType()), projection.getPhone());
        return new RosterMemberResponse(summary, status, isExpiringSoon);
    }
}
