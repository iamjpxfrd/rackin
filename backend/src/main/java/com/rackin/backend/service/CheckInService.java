package com.rackin.backend.service;

import com.rackin.backend.exception.MemberNotFoundException;
import com.rackin.backend.model.CheckIn;
import com.rackin.backend.model.Member;
import com.rackin.backend.repository.CheckInRepository;
import com.rackin.backend.repository.LapsedMemberProjection;
import com.rackin.backend.repository.MemberRepository;
import com.rackin.backend.web.dto.CheckInRequest;
import com.rackin.backend.web.dto.CheckInResponse;
import com.rackin.backend.web.dto.LapsedMemberResponse;
import com.rackin.backend.web.dto.LastCheckIn;
import com.rackin.backend.web.dto.MemberBrief;
import com.rackin.backend.web.dto.MemberSummary;
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

    public CheckInService(CheckInRepository checkInRepository, MemberRepository memberRepository) {
        this.checkInRepository = checkInRepository;
        this.memberRepository = memberRepository;
    }

    @Transactional
    public CheckInResponse checkIn(CheckInRequest request) {
        Member member = memberRepository.findById(request.memberId())
                .orElseThrow(() -> new MemberNotFoundException(request.memberId()));

        CheckIn checkIn = new CheckIn();
        checkIn.setMember(member);
        checkIn.setTimestamp(Instant.now());
        checkIn.setMethod(request.method());
        checkIn.setClientUuid(request.clientUuid() != null ? request.clientUuid() : UUID.randomUUID());
        checkInRepository.save(checkIn);

        Instant monthStart = Instant.now().atZone(ZoneOffset.UTC)
                .toLocalDate().withDayOfMonth(1)
                .atStartOfDay(ZoneOffset.UTC).toInstant();
        long visitCount = checkInRepository.countByMember_IdAndTimestampGreaterThanEqual(member.getId(), monthStart);

        MemberBrief memberBrief = new MemberBrief(member.getId(), member.getName(), member.getPlanType());
        return new CheckInResponse(memberBrief, visitCount);
    }

    @Transactional(readOnly = true)
    public List<LapsedMemberResponse> getLapsed(int days) {
        Instant cutoff = Instant.now().minus(days, ChronoUnit.DAYS);
        return checkInRepository.findLapsed(cutoff).stream()
                .map(this::toLapsedResponse)
                .toList();
    }

    private LapsedMemberResponse toLapsedResponse(LapsedMemberProjection p) {
        LastCheckIn lastCheckIn = p.getLastCheckInTimestamp() != null
                ? new LastCheckIn(p.getLastCheckInTimestamp().toInstant(), p.getLastCheckInMethod())
                : null;
        return new LapsedMemberResponse(new MemberSummary(p.getId(), p.getName()), lastCheckIn);
    }
}
