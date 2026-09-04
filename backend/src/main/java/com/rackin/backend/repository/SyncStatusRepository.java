package com.rackin.backend.repository;

import com.rackin.backend.model.SyncStatus;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SyncStatusRepository extends JpaRepository<SyncStatus, Long> {
}
