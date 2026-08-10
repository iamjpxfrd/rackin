package com.rackin.backend.service;

import com.rackin.backend.config.RackinProperties;
import com.rackin.backend.exception.MemberNotFoundException;
import com.rackin.backend.model.Member;
import com.rackin.backend.model.MembershipStatus;
import com.rackin.backend.model.Payment;
import com.rackin.backend.model.PaymentMethod;
import com.rackin.backend.repository.MemberRepository;
import com.rackin.backend.repository.PaymentRepository;
import com.rackin.backend.web.dto.ExpiringMemberResponse;
import com.rackin.backend.web.dto.PaymentResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
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
    public PaymentResponse recordPayment(String memberId, BigDecimal amount, PaymentMethod method, UUID clientUuid) {
        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new MemberNotFoundException(memberId));
        Payment payment = recordPayment(member, amount, method, clientUuid);
        return new PaymentResponse(payment.getCoversUntil(), deriveStatus(payment.getCoversUntil()));
    }

    // Used by MemberService during registration, where the member was just
    // persisted in the same transaction — avoids a redundant lookup.
    Payment recordPayment(Member member, BigDecimal amount, PaymentMethod method, UUID clientUuid) {
        Instant paidAt = Instant.now();
        Instant coversUntil = paidAt.plus(PlanDurations.days(member.getPlanType()), ChronoUnit.DAYS);

        Payment payment = new Payment();
        payment.setMember(member);
        payment.setAmount(amount);
        payment.setMethod(method);
        payment.setPaidAt(paidAt);
        payment.setCoversUntil(coversUntil);
        payment.setClientUuid(clientUuid != null ? clientUuid : UUID.randomUUID());
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
}
