package com.rackin.backend.repository;

import com.rackin.backend.model.CheckIn;
import com.rackin.backend.model.CheckInMethod;
import com.rackin.backend.model.Member;
import com.rackin.backend.model.PlanType;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
class CheckInRepositoryTest {

    @Autowired
    private MemberRepository memberRepository;

    @Autowired
    private CheckInRepository checkInRepository;

    private Member persistMember(String id) {
        Member member = new Member();
        member.setId(id);
        member.setName("Ana Reyes");
        member.setPlanType(PlanType.monthly);
        member.setCreatedAt(Instant.now());
        member.setClientUuid(UUID.randomUUID());
        return memberRepository.saveAndFlush(member);
    }

    private void persistCheckIn(Member member, Instant timestamp, CheckInMethod method) {
        CheckIn checkIn = new CheckIn();
        checkIn.setMember(member);
        checkIn.setTimestamp(timestamp);
        checkIn.setMethod(method);
        checkIn.setClientUuid(UUID.randomUUID());
        checkInRepository.saveAndFlush(checkIn);
    }

    @Test
    void findLapsed_shouldIncludeMembersNeverCheckedIn() {
        persistMember("1045");

        List<LapsedMemberProjection> lapsed = checkInRepository.findLapsed(Instant.now().minus(14, ChronoUnit.DAYS));

        assertThat(lapsed).hasSize(1);
        assertThat(lapsed.get(0).getId()).isEqualTo("1045");
        assertThat(lapsed.get(0).getLastCheckInTimestamp()).isNull();
    }

    @Test
    void findLapsed_shouldIncludeMembersWhoseLastCheckInIsOlderThanCutoff() {
        Member member = persistMember("1132");
        persistCheckIn(member, Instant.now().minus(30, ChronoUnit.DAYS), CheckInMethod.qr);

        List<LapsedMemberProjection> lapsed = checkInRepository.findLapsed(Instant.now().minus(14, ChronoUnit.DAYS));

        assertThat(lapsed).hasSize(1);
        assertThat(lapsed.get(0).getId()).isEqualTo("1132");
        assertThat(lapsed.get(0).getLastCheckInMethod()).isEqualTo(CheckInMethod.qr);
    }

    @Test
    void findLapsed_shouldExcludeMembersWhoCheckedInRecently() {
        Member member = persistMember("1200");
        persistCheckIn(member, Instant.now().minus(1, ChronoUnit.DAYS), CheckInMethod.numpad);

        List<LapsedMemberProjection> lapsed = checkInRepository.findLapsed(Instant.now().minus(14, ChronoUnit.DAYS));

        assertThat(lapsed).isEmpty();
    }

    @Test
    void findLapsed_shouldUseOnlyTheMostRecentCheckInPerMember() {
        Member member = persistMember("1300");
        persistCheckIn(member, Instant.now().minus(60, ChronoUnit.DAYS), CheckInMethod.qr);
        persistCheckIn(member, Instant.now().minus(1, ChronoUnit.DAYS), CheckInMethod.numpad);

        List<LapsedMemberProjection> lapsed = checkInRepository.findLapsed(Instant.now().minus(14, ChronoUnit.DAYS));

        assertThat(lapsed).isEmpty();
    }

    @Test
    void findLapsed_shouldOrderNeverCheckedInMembersFirst() {
        Member checkedIn = persistMember("1132");
        persistCheckIn(checkedIn, Instant.now().minus(30, ChronoUnit.DAYS), CheckInMethod.qr);
        persistMember("1045");

        List<LapsedMemberProjection> lapsed = checkInRepository.findLapsed(Instant.now().minus(14, ChronoUnit.DAYS));

        assertThat(lapsed).extracting(LapsedMemberProjection::getId).containsExactly("1045", "1132");
    }

    @Test
    void countByMemberIdAndTimestampGreaterThanEqual_shouldCountOnlyMatchingMemberAndWindow() {
        Member member = persistMember("1114");
        Instant monthStart = Instant.now().minus(5, ChronoUnit.DAYS);
        persistCheckIn(member, monthStart.plus(1, ChronoUnit.DAYS), CheckInMethod.numpad);
        persistCheckIn(member, monthStart.plus(2, ChronoUnit.DAYS), CheckInMethod.qr);
        persistCheckIn(member, monthStart.minus(1, ChronoUnit.DAYS), CheckInMethod.search);

        Member otherMember = persistMember("1115");
        persistCheckIn(otherMember, monthStart.plus(1, ChronoUnit.DAYS), CheckInMethod.numpad);

        long count = checkInRepository.countByMember_IdAndTimestampGreaterThanEqual("1114", monthStart);

        assertThat(count).isEqualTo(2);
    }
}
