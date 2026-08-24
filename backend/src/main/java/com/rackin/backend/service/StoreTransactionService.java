package com.rackin.backend.service;

import com.rackin.backend.model.StoreTransaction;
import com.rackin.backend.repository.StoreTransactionRepository;
import com.rackin.backend.web.dto.StoreTransactionRequest;
import com.rackin.backend.web.dto.StoreTransactionResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
public class StoreTransactionService {

    private final StoreTransactionRepository storeTransactionRepository;

    public StoreTransactionService(StoreTransactionRepository storeTransactionRepository) {
        this.storeTransactionRepository = storeTransactionRepository;
    }

    @Transactional
    public StoreTransactionResponse record(StoreTransactionRequest request) {
        UUID idempotencyKey = request.clientUuid() != null ? request.clientUuid() : UUID.randomUUID();

        // A sync retried after a lost response must not record the same sale
        // twice — replaying one returns the original row rather than a second
        // charge (TRD 7's idempotency contract, same as payment/check-in).
        StoreTransaction existing = storeTransactionRepository.findByClientUuid(idempotencyKey).orElse(null);
        if (existing != null) {
            return new StoreTransactionResponse(existing.getId());
        }

        StoreTransaction transaction = new StoreTransaction();
        transaction.setType(request.type());
        transaction.setItemKey(request.itemKey());
        transaction.setDescription(request.description());
        transaction.setAmount(request.amount());
        // The moment the sale/expense actually happened, not whenever the
        // tablet found a network — a day of offline sales pushed at closing
        // time must land at the hours they actually occurred.
        transaction.setOccurredAt(request.occurredAt() != null ? request.occurredAt() : Instant.now());
        transaction.setClientUuid(idempotencyKey);
        // As reported by the tablet, null included — the backend holds no
        // staff list to check against (ADR-001).
        transaction.setRecordedById(request.recordedById());
        transaction.setRecordedByName(request.recordedByName());

        StoreTransaction saved = storeTransactionRepository.save(transaction);
        return new StoreTransactionResponse(saved.getId());
    }
}
