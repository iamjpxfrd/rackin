package com.rackin.backend.service;

import com.rackin.backend.web.dto.RegisterMemberRequest;
import com.rackin.backend.web.dto.RegisterMemberResponse;
import com.rackin.backend.web.dto.RosterMemberResponse;
import com.rackin.backend.web.dto.StatusResponse;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.concurrent.ThreadLocalRandom;

@Service
public class MemberService {

    // Two registrations racing can compute the same MAX(id)+1; the primary key
    // rejects the loser, which then retries against the now-committed maximum.
    // Every loser of a round recomputes the same next id, so without jitter they
    // collide again and only one request clears per round. A few ms of spread
    // breaks that up; measured at 30-way concurrency this clears all of them.
    private static final int MAX_REGISTRATION_ATTEMPTS = 20;
    private static final int RETRY_JITTER_MAX_MILLIS = 20;

    private final MemberRegistrar registrar;
    private final PaymentService paymentService;

    public MemberService(MemberRegistrar registrar, PaymentService paymentService) {
        this.registrar = registrar;
        this.paymentService = paymentService;
    }

    // Deliberately not @Transactional: each attempt must run in its own
    // transaction, and the call goes through the registrar's proxy so it does.
    public RegisterMemberResponse registerMember(RegisterMemberRequest request) {
        for (int attempt = 1; ; attempt++) {
            // Checked before every attempt, not just the first: a replay racing
            // its own original loses the clientUuid unique index below, and on
            // the next pass the winner is committed and visible here. Without
            // this the loser would retry until it exhausted its attempts and
            // then fail a registration that had in fact succeeded.
            Optional<RegisterMemberResponse> alreadyRegistered = registrar.findAlreadyRegistered(request);
            if (alreadyRegistered.isPresent()) {
                return alreadyRegistered.get();
            }
            try {
                return registrar.register(request);
            } catch (DataIntegrityViolationException ex) {
                if (attempt == MAX_REGISTRATION_ATTEMPTS) {
                    throw ex;
                }
                pauseBeforeRetry();
            }
        }
    }

    private void pauseBeforeRetry() {
        try {
            Thread.sleep(ThreadLocalRandom.current().nextInt(1, RETRY_JITTER_MAX_MILLIS));
        } catch (InterruptedException interrupted) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Interrupted while retrying registration", interrupted);
        }
    }

    @Transactional(readOnly = true)
    public StatusResponse getStatus(String memberId) {
        return new StatusResponse(paymentService.getStatus(memberId));
    }

    // Status/expiring-soon derivation is payment policy, not member data, so
    // this delegates to PaymentService rather than carrying a second copy —
    // same split as getStatus above.
    @Transactional(readOnly = true)
    public List<RosterMemberResponse> listMembers() {
        return paymentService.getRoster();
    }
}
