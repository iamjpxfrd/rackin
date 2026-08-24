package com.rackin.backend.service;

import com.rackin.backend.exception.MemberIdConflictException;
import com.rackin.backend.model.Member;
import com.rackin.backend.model.MembershipStatus;
import com.rackin.backend.model.Payment;
import com.rackin.backend.repository.MemberRepository;
import com.rackin.backend.web.dto.RegisterMemberRequest;
import com.rackin.backend.web.dto.RegisterMemberResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Optional;
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

    // The idempotency half of TRD 7. A tablet whose sync request succeeded but
    // whose response was lost retries the same clientUuid; that must answer with
    // the original registration rather than create a second member — the tablet
    // has already printed a card with the first one's number on it.
    @Transactional(readOnly = true)
    public Optional<RegisterMemberResponse> findAlreadyRegistered(RegisterMemberRequest request) {
        if (request.clientUuid() == null) {
            return Optional.empty();
        }
        return memberRepository.findByClientUuid(request.clientUuid())
                .map(member -> new RegisterMemberResponse(
                        member.getId(),
                        paymentService.getStatus(member.getId()),
                        paymentService.getCoversUntil(member.getId()).orElse(null)));
    }

    @Transactional
    public RegisterMemberResponse register(RegisterMemberRequest request) {
        String requestedId = trimToNull(request.memberId());
        if (requestedId != null && memberRepository.existsById(requestedId)) {
            // Not the concurrent-registration race the caller retries: this id
            // belongs to someone else and always will.
            throw new MemberIdConflictException(requestedId);
        }

        // Registration and its first payment share one instant, exactly as the
        // tablet's own registerMember does — a member whose coverage started
        // before they existed would be incoherent.
        Instant createdAt = request.createdAt() != null ? request.createdAt() : Instant.now();

        Member member = new Member();
        // The tablet assigns ids offline in this same space, so a synced member
        // keeps the number already printed on their QR card (backend-schema.md 7).
        member.setId(requestedId != null ? requestedId : nextMemberId());
        member.setName(request.name().trim());
        member.setPlanType(request.planType());
        member.setCreatedAt(createdAt);
        member.setPhone(request.phone());
        member.setStudent(request.isStudent());
        member.setClientUuid(request.clientUuid() != null ? request.clientUuid() : UUID.randomUUID());

        // Flush here rather than at commit: a lost id race then surfaces as a
        // DataIntegrityViolationException before the payment row is written, and
        // while the exception can still be translated by the repository proxy.
        memberRepository.saveAndFlush(member);

        Payment payment = paymentService.recordPayment(
                member, request.amount(), request.method(), request.paymentClientUuid(), createdAt,
                request.recordedById(), request.recordedByName());
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

    private static String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
