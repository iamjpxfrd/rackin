package com.rackin.backend.service;

import com.rackin.backend.model.Member;
import com.rackin.backend.model.MembershipStatus;
import com.rackin.backend.model.Payment;
import com.rackin.backend.repository.MemberRepository;
import com.rackin.backend.web.dto.RegisterMemberRequest;
import com.rackin.backend.web.dto.RegisterMemberResponse;
import com.rackin.backend.web.dto.StatusResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
public class MemberService {

    private final MemberRepository memberRepository;
    private final PaymentService paymentService;

    public MemberService(MemberRepository memberRepository, PaymentService paymentService) {
        this.memberRepository = memberRepository;
        this.paymentService = paymentService;
    }

    @Transactional
    public RegisterMemberResponse registerMember(RegisterMemberRequest request) {
        Member member = new Member();
        member.setId(nextMemberId());
        member.setName(request.name().trim());
        member.setPlanType(request.planType());
        member.setCreatedAt(Instant.now());
        member.setPhone(request.phone());
        member.setClientUuid(request.clientUuid() != null ? request.clientUuid() : UUID.randomUUID());
        memberRepository.save(member);

        Payment payment = paymentService.recordPayment(member, request.amount(), request.method(), null);
        MembershipStatus status = paymentService.deriveStatus(payment.getCoversUntil());

        return new RegisterMemberResponse(member.getId(), status, payment.getCoversUntil());
    }

    @Transactional(readOnly = true)
    public StatusResponse getStatus(String memberId) {
        return new StatusResponse(paymentService.getStatus(memberId));
    }

    private String nextMemberId() {
        return String.valueOf(memberRepository.findMaxNumericId() + 1);
    }
}
