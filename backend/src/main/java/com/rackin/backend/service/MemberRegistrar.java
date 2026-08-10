package com.rackin.backend.service;

import com.rackin.backend.model.Member;
import com.rackin.backend.model.MembershipStatus;
import com.rackin.backend.model.Payment;
import com.rackin.backend.repository.MemberRepository;
import com.rackin.backend.web.dto.RegisterMemberRequest;
import com.rackin.backend.web.dto.RegisterMemberResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

// One transactional attempt at registration. Split out of MemberService so its
// retry loop sits outside this transaction — retrying inside a rollback-only
// transaction would just reuse the doomed one.
@Service
public class MemberRegistrar {

    private final MemberRepository memberRepository;
    private final PaymentService paymentService;

    public MemberRegistrar(MemberRepository memberRepository, PaymentService paymentService) {
        this.memberRepository = memberRepository;
        this.paymentService = paymentService;
    }

    @Transactional
    public RegisterMemberResponse register(RegisterMemberRequest request) {
        Member member = new Member();
        member.setId(nextMemberId());
        member.setName(request.name().trim());
        member.setPlanType(request.planType());
        member.setCreatedAt(Instant.now());
        member.setPhone(request.phone());
        member.setClientUuid(request.clientUuid() != null ? request.clientUuid() : UUID.randomUUID());

        // Flush here rather than at commit: a lost id race then surfaces as a
        // DataIntegrityViolationException before the payment row is written, and
        // while the exception can still be translated by the repository proxy.
        memberRepository.saveAndFlush(member);

        Payment payment = paymentService.recordPayment(member, request.amount(), request.method(), null);
        MembershipStatus status = paymentService.deriveStatus(payment.getCoversUntil());

        return new RegisterMemberResponse(member.getId(), status, payment.getCoversUntil());
    }

    // MAX(id)+1 rather than a DB sequence, deliberately: a sequence knows nothing
    // about ids a tablet assigned offline, so it would eventually hand out one
    // that is already taken. MAX+1 can only ever collide with a concurrent
    // registration, which the caller's retry resolves.
    private String nextMemberId() {
        return String.valueOf(memberRepository.findMaxNumericId() + 1);
    }
}
