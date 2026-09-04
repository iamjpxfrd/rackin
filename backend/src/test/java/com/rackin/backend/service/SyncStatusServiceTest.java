package com.rackin.backend.service;

import com.rackin.backend.model.SyncStatus;
import com.rackin.backend.repository.SyncStatusRepository;
import com.rackin.backend.web.dto.SyncStatusReportRequest;
import com.rackin.backend.web.dto.SyncStatusResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SyncStatusServiceTest {

    @Mock
    private SyncStatusRepository syncStatusRepository;

    private SyncStatusService syncStatusService;

    @BeforeEach
    void setUp() {
        syncStatusService = new SyncStatusService(syncStatusRepository);
    }

    @Test
    void report_whenNoRowYet_shouldCreateTheSingletonRow() {
        when(syncStatusRepository.findById(SyncStatus.SINGLETON_ID)).thenReturn(Optional.empty());
        Instant oldest = Instant.now().minus(2, ChronoUnit.HOURS);

        syncStatusService.report(new SyncStatusReportRequest(3, oldest));

        ArgumentCaptor<SyncStatus> captor = ArgumentCaptor.forClass(SyncStatus.class);
        verify(syncStatusRepository).save(captor.capture());
        assertThat(captor.getValue().getId()).isEqualTo(SyncStatus.SINGLETON_ID);
        assertThat(captor.getValue().getPendingCount()).isEqualTo(3);
        assertThat(captor.getValue().getOldestPendingAt()).isEqualTo(oldest);
    }

    @Test
    void report_whenRowAlreadyExists_shouldOverwriteInPlace() {
        SyncStatus existing = new SyncStatus();
        existing.setPendingCount(9);
        existing.setReportedAt(Instant.now().minus(1, ChronoUnit.DAYS));
        when(syncStatusRepository.findById(SyncStatus.SINGLETON_ID)).thenReturn(Optional.of(existing));

        syncStatusService.report(new SyncStatusReportRequest(0, null));

        ArgumentCaptor<SyncStatus> captor = ArgumentCaptor.forClass(SyncStatus.class);
        verify(syncStatusRepository).save(captor.capture());
        // Same object, not a second row — there is exactly one tablet (ADR-001).
        assertThat(captor.getValue()).isSameAs(existing);
        assertThat(captor.getValue().getPendingCount()).isEqualTo(0);
        assertThat(captor.getValue().getOldestPendingAt()).isNull();
    }

    @Test
    void report_shouldStampReportedAtWithServerTimeNotClientSupplied() {
        when(syncStatusRepository.findById(SyncStatus.SINGLETON_ID)).thenReturn(Optional.empty());
        Instant before = Instant.now();

        syncStatusService.report(new SyncStatusReportRequest(1, null));

        Instant after = Instant.now();
        ArgumentCaptor<SyncStatus> captor = ArgumentCaptor.forClass(SyncStatus.class);
        verify(syncStatusRepository).save(captor.capture());
        assertThat(captor.getValue().getReportedAt()).isBetween(before, after);
    }

    @Test
    void current_whenNeverReported_shouldReturnNullReportedAt() {
        when(syncStatusRepository.findById(any())).thenReturn(Optional.empty());

        SyncStatusResponse response = syncStatusService.current();

        assertThat(response.reportedAt()).isNull();
        assertThat(response.pendingCount()).isEqualTo(0);
    }

    @Test
    void current_whenReportExists_shouldReturnItsFields() {
        SyncStatus stored = new SyncStatus();
        stored.setPendingCount(5);
        Instant oldest = Instant.now().minus(3, ChronoUnit.HOURS);
        Instant reportedAt = Instant.now();
        stored.setOldestPendingAt(oldest);
        stored.setReportedAt(reportedAt);
        when(syncStatusRepository.findById(SyncStatus.SINGLETON_ID)).thenReturn(Optional.of(stored));

        SyncStatusResponse response = syncStatusService.current();

        assertThat(response.pendingCount()).isEqualTo(5);
        assertThat(response.oldestPendingAt()).isEqualTo(oldest);
        assertThat(response.reportedAt()).isEqualTo(reportedAt);
    }
}
