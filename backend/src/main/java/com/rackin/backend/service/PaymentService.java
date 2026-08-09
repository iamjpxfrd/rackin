package com.rackin.backend.service;

import com.rackin.backend.exception.MemberNotFoundException;
import com.rackin.backend.model.Member;
import com.rackin.backend.model.MembershipStatus;
import com.rackin.backend.model.Payment;
import com.rackin.backend.model.PaymentMethod;
import com.rackin.backend.repository.ExpiringMemberProjection;
import com.rackin.backend.repository.MemberRepository;
import com.rackin.backend.repository.PaymentRepository;
import com.rackin.backend.web.dto.ExpiringMemberResponse;
import com.rackin.backend.web.dto.MemberSummary;
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

    public PaymentService(PaymentRepository paymentRepository, MemberRepository memberRepository) {
        this.paymentRepository = paymentRepository;
        this.memberRepository = memberRepository;
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

    @Transactional(readOnly = true)
    public List<ExpiringMemberResponse> getExpiring(int days) {
        Instant now = Instant.now();
        Instant until = now.plus(days, ChronoUnit.DAYS);
        return paymentRepository.findExpiring(now, until).stream()
                .map(this::toExpiringResponse)
                .toList();
    }

    private ExpiringMemberResponse toExpiringResponse(ExpiringMemberProjection p) {
        return new ExpiringMemberResponse(new MemberSummary(p.getId(), p.getName()), p.getCoversUntil().toInstant());
    }

    private MembershipStatus deriveStatus(Instant coversUntil) {
        return !coversUntil.isBefore(Instant.now()) ? MembershipStatus.active : MembershipStatus.expired;
    }
}
