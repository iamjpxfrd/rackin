package com.rackin.backend.service;

import com.rackin.backend.config.RackinProperties;
import com.rackin.backend.exception.MemberNotFoundException;
import com.rackin.backend.model.CheckIn;
import com.rackin.backend.model.CheckInMethod;
import com.rackin.backend.model.Member;
import com.rackin.backend.model.PlanType;
import com.rackin.backend.repository.CheckInRepository;
import com.rackin.backend.repository.LapsedMemberProjection;
import com.rackin.backend.repository.MemberRepository;
import com.rackin.backend.web.dto.CheckInRequest;
import com.rackin.backend.web.dto.CheckInResponse;
import com.rackin.backend.web.dto.LapsedMemberResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CheckInServiceTest {

    @Mock
    private CheckInRepository checkInRepository;

    @Mock
    private MemberRepository memberRepository;

    private CheckInService checkInService;

    @BeforeEach
    void setUp() {
        checkInService = new CheckInService(checkInRepository, memberRepository, new RackinProperties(14, 7));
    }

    private Member member(String id) {
        Member member = new Member();
        member.setId(id);
        member.setName("Ana Reyes");
        member.setPlanType(PlanType.monthly);
        member.setCreatedAt(Instant.now());
        member.setClientUuid(UUID.randomUUID());
        return member;
    }

    @Test
    void checkIn_whenMemberExists_shouldSaveCheckInAndReturnVisitCount() {
        Member member = member("1114");
        when(memberRepository.findById("1114")).thenReturn(Optional.of(member));
        when(checkInRepository.countByMember_IdAndTimestampGreaterThanEqual(eq("1114"), any(Instant.class)))
                .thenReturn(12L);

        CheckInResponse response = checkInService.checkIn(new CheckInRequest("1114", CheckInMethod.numpad, null, null));

        assertThat(response.member().id()).isEqualTo("1114");
        assertThat(response.member().name()).isEqualTo("Ana Reyes");
        assertThat(response.visitCountThisMonth()).isEqualTo(12L);
        verify(checkInRepository).save(any(CheckIn.class));
    }

    @Test
    void checkIn_whenMemberNotFound_shouldThrowAndNeverSave() {
        when(memberRepository.findById("9999")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> checkInService.checkIn(new CheckInRequest("9999", CheckInMethod.numpad, null, null)))
                .isInstanceOf(MemberNotFoundException.class)
                .hasMessage("No member found for #9999");
        verify(checkInRepository, never()).save(any());
    }

    @Test
    void checkIn_whenClientUuidOmitted_shouldGenerateOne() {
        Member member = member("1114");
        when(memberRepository.findById("1114")).thenReturn(Optional.of(member));
        when(checkInRepository.countByMember_IdAndTimestampGreaterThanEqual(eq("1114"), any(Instant.class)))
                .thenReturn(0L);

        checkInService.checkIn(new CheckInRequest("1114", CheckInMethod.qr, null, null));

        ArgumentCaptor<CheckIn> captor = ArgumentCaptor.forClass(CheckIn.class);
        verify(checkInRepository).save(captor.capture());
        assertThat(captor.getValue().getClientUuid()).isNotNull();
        assertThat(captor.getValue().getMethod()).isEqualTo(CheckInMethod.qr);
    }

    @Test
    void checkIn_whenClientUuidProvided_shouldUseIt() {
        Member member = member("1114");
        when(memberRepository.findById("1114")).thenReturn(Optional.of(member));
        when(checkInRepository.countByMember_IdAndTimestampGreaterThanEqual(eq("1114"), any(Instant.class)))
                .thenReturn(0L);
        UUID clientUuid = UUID.randomUUID();

        checkInService.checkIn(new CheckInRequest("1114", CheckInMethod.search, clientUuid, null));

        ArgumentCaptor<CheckIn> captor = ArgumentCaptor.forClass(CheckIn.class);
        verify(checkInRepository).save(captor.capture());
        assertThat(captor.getValue().getClientUuid()).isEqualTo(clientUuid);
    }

    @Test
    void checkIn_whenClientUuidAlreadyRecorded_shouldNotSaveTwiceButStillAnswer() {
        Member member = member("1114");
        UUID clientUuid = UUID.randomUUID();
        when(memberRepository.findById("1114")).thenReturn(Optional.of(member));
        when(checkInRepository.findByClientUuid(clientUuid)).thenReturn(Optional.of(new CheckIn()));
        when(checkInRepository.countByMember_IdAndTimestampGreaterThanEqual(eq("1114"), any(Instant.class)))
                .thenReturn(12L);

        CheckInResponse response = checkInService.checkIn(
                new CheckInRequest("1114", CheckInMethod.numpad, clientUuid, null));

        // A replayed sync must not inflate the visit count staff read off the
        // confirmation card, but it still gets a truthful answer (TRD 7).
        verify(checkInRepository, never()).save(any());
        assertThat(response.visitCountThisMonth()).isEqualTo(12L);
    }

    @Test
    void checkIn_whenTimestampProvided_shouldRecordWhenTheyWalkedInNotWhenSynced() {
        Member member = member("1114");
        when(memberRepository.findById("1114")).thenReturn(Optional.of(member));
        when(checkInRepository.countByMember_IdAndTimestampGreaterThanEqual(eq("1114"), any(Instant.class)))
                .thenReturn(1L);
        // Checked in this morning; the tablet only reached the network tonight.
        Instant walkedIn = Instant.now().minus(9, ChronoUnit.HOURS);

        checkInService.checkIn(new CheckInRequest("1114", CheckInMethod.numpad, null, walkedIn));

        ArgumentCaptor<CheckIn> captor = ArgumentCaptor.forClass(CheckIn.class);
        verify(checkInRepository).save(captor.capture());
        // Without this a day of offline check-ins all land at sync time and the
        // lapsed report reads them as one simultaneous rush.
        assertThat(captor.getValue().getTimestamp()).isEqualTo(walkedIn);
    }

    @Test
    void getLapsed_whenDaysOmitted_shouldUseConfiguredDefault() {
        when(checkInRepository.findLapsed(any(Instant.class))).thenReturn(List.of());

        Instant before = Instant.now();
        checkInService.getLapsed(null);
        Instant after = Instant.now();

        ArgumentCaptor<Instant> cutoffCaptor = ArgumentCaptor.forClass(Instant.class);
        verify(checkInRepository).findLapsed(cutoffCaptor.capture());
        assertThat(cutoffCaptor.getValue()).isBetween(before.minus(14, ChronoUnit.DAYS), after.minus(14, ChronoUnit.DAYS));
    }

    @Test
    void getLapsed_whenDaysProvided_shouldUseProvidedWindow() {
        when(checkInRepository.findLapsed(any(Instant.class))).thenReturn(List.of());

        Instant before = Instant.now();
        checkInService.getLapsed(30);
        Instant after = Instant.now();

        ArgumentCaptor<Instant> cutoffCaptor = ArgumentCaptor.forClass(Instant.class);
        verify(checkInRepository).findLapsed(cutoffCaptor.capture());
        assertThat(cutoffCaptor.getValue()).isBetween(before.minus(30, ChronoUnit.DAYS), after.minus(30, ChronoUnit.DAYS));
    }

    @Test
    void getLapsed_shouldMapProjectionsIncludingNeverCheckedInMembers() {
        LapsedMemberProjection neverCheckedIn = new LapsedMemberProjection() {
            public String getId() {
                return "1045";
            }

            public String getName() {
                return "Jun Manalo";
            }

            public String getPhone() {
                return null;
            }

            public OffsetDateTime getLastCheckInTimestamp() {
                return null;
            }

            public CheckInMethod getLastCheckInMethod() {
                return null;
            }
        };
        LapsedMemberProjection lapsed = new LapsedMemberProjection() {
            public String getId() {
                return "1132";
            }

            public String getName() {
                return "Rica Tan";
            }

            public String getPhone() {
                return null;
            }

            public OffsetDateTime getLastCheckInTimestamp() {
                return OffsetDateTime.parse("2026-06-20T09:00:00Z");
            }

            public CheckInMethod getLastCheckInMethod() {
                return CheckInMethod.qr;
            }
        };
        when(checkInRepository.findLapsed(any(Instant.class))).thenReturn(List.of(neverCheckedIn, lapsed));

        List<LapsedMemberResponse> result = checkInService.getLapsed(14);

        assertThat(result).hasSize(2);
        assertThat(result.get(0).member().id()).isEqualTo("1045");
        assertThat(result.get(0).lastCheckIn()).isNull();
        assertThat(result.get(1).member().id()).isEqualTo("1132");
        assertThat(result.get(1).lastCheckIn().method()).isEqualTo(CheckInMethod.qr);
        assertThat(result.get(1).lastCheckIn().timestamp()).isEqualTo(Instant.parse("2026-06-20T09:00:00Z"));
    }
}
