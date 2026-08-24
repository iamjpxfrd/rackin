package com.rackin.backend.repository;

import com.rackin.backend.model.StoreTransaction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface StoreTransactionRepository extends JpaRepository<StoreTransaction, Long> {

    // The tablet's idempotency key (TRD 7) — a replayed sync must not record
    // the same sale twice.
    Optional<StoreTransaction> findByClientUuid(UUID clientUuid);
}
