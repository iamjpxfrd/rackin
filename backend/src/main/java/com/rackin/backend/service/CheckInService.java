package com.rackin.backend.service;

import com.rackin.backend.config.RackinProperties;
import com.rackin.backend.exception.MemberNotFoundException;
import com.rackin.backend.model.CheckIn;
import com.rackin.backend.model.Member;
import com.rackin.backend.repository.CheckInRepository;
import com.rackin.backend.repository.MemberRepository;
import com.rackin.backend.web.dto.CheckInRequest;
import com.rackin.backend.web.dto.CheckInResponse;
import com.rackin.backend.web.dto.LapsedMemberResponse;
import com.rackin.backend.web.dto.MemberBrief;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

@Service
public class CheckInService {

    private final CheckInRepository checkInRepository;
    private final MemberRepository memberRepository;
    private final RackinProperties properties;

    public CheckInService(CheckInRepository checkInRepository, MemberRepository memberRepository,
                          RackinProperties properties) {
        this.checkInRepository = checkInRepository;
        this.memberRepository = memberRepository;
        this.properties = properties;
    }

    @Transactional
    public CheckInResponse checkIn(CheckInRequest request) {
        Member member = memberRepository.findById(request.memberId())
                .orElseThrow(() -> new MemberNotFoundException(request.memberId()));

        UUID idempotencyKey = request.clientUuid() != null ? request.clientUuid() : UUID.randomUUID();

        // A sync retried after a lost response must not count the same visit
        // twice — the member's monthly count is what staff read off the
        // confirmation card (TRD 7). The count below is recomputed either way,
        // so a replay still answers with the current truth.
        if (checkInRepository.findByClientUuid(idempotencyKey).isEmpty()) {
            CheckIn checkIn = new CheckIn();
            checkIn.setMember(member);
            // The moment the member walked in, not the moment the tablet found
            // a network — a day's offline check-ins would otherwise all land at
            // sync time and read as one simultaneous rush.
            checkIn.setTimestamp(request.timestamp() != null ? request.timestamp() : Instant.now());
            checkIn.setMethod(request.method());
            checkIn.setClientUuid(idempotencyKey);
            checkInRepository.save(checkIn);
        }

        Instant monthStart = Instant.now().atZone(ZoneOffset.UTC)
                .toLocalDate().withDayOfMonth(1)
                .atStartOfDay(ZoneOffset.UTC).toInstant();
        long visitCount = checkInRepository.countByMember_IdAndTimestampGreaterThanEqual(member.getId(), monthStart);

        return new CheckInResponse(MemberBrief.from(member), visitCount);
    }

    // days == null means "use the pilot's configured threshold" — resolving that
    // is a domain decision, so it happens here rather than in the controller.
    @Transactional(readOnly = true)
    public List<LapsedMemberResponse> getLapsed(Integer days) {
        int window = days != null ? days : properties.lapsedDaysDefault();
        Instant cutoff = Instant.now().minus(window, ChronoUnit.DAYS);
        return checkInRepository.findLapsed(cutoff).stream()
                .map(LapsedMemberResponse::from)
                .toList();
    }
}
