package com.rackin.backend.service;

import com.rackin.backend.model.SyncStatus;
import com.rackin.backend.repository.SyncStatusRepository;
import com.rackin.backend.web.dto.SyncStatusReportRequest;
import com.rackin.backend.web.dto.SyncStatusResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Service
public class SyncStatusService {

    private final SyncStatusRepository syncStatusRepository;

    public SyncStatusService(SyncStatusRepository syncStatusRepository) {
        this.syncStatusRepository = syncStatusRepository;
    }

    @Transactional
    public void report(SyncStatusReportRequest request) {
        SyncStatus status = syncStatusRepository.findById(SyncStatus.SINGLETON_ID).orElseGet(SyncStatus::new);
        status.setPendingCount(request.pendingCount());
        status.setOldestPendingAt(request.oldestPendingAt());
        status.setReportedAt(Instant.now());
        syncStatusRepository.save(status);
    }

    @Transactional(readOnly = true)
    public SyncStatusResponse current() {
        return syncStatusRepository.findById(SyncStatus.SINGLETON_ID)
                .map(status -> new SyncStatusResponse(
                        status.getPendingCount(), status.getOldestPendingAt(), status.getReportedAt()))
                .orElseGet(SyncStatusResponse::neverReported);
    }
}
