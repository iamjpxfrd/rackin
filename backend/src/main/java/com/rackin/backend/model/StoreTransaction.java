package com.rackin.backend.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

// Not member-scoped, unlike Payment/CheckIn — a Store sale (water, timed
// treadmill/incline use, a freeform income/expense entry) has no member on
// the other end. See V7's migration header for why membership payments
// aren't duplicated in here.
@Entity
@Table(name = "store_transaction", indexes = {
        @Index(name = "idx_store_transaction_occurred_at", columnList = "occurred_at"),
        @Index(name = "idx_store_transaction_client_uuid", columnList = "client_uuid", unique = true)
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class StoreTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private StoreTransactionType type;

    // Matches the tablet's own STORE_ITEMS/TIMED_ITEMS keys (water,
    // treadmill, stairIncline) — not a foreign key, since item definitions
    // live on the tablet (ADR-001). Null for a freeform Log a Transaction
    // entry, which has no item behind it.
    @Column(name = "item_key", length = 40)
    private String itemKey;

    @Column(nullable = false, length = 200)
    private String description;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal amount;

    @Column(name = "occurred_at", nullable = false)
    private Instant occurredAt;

    @Column(name = "client_uuid", nullable = false, unique = true)
    private UUID clientUuid;

    // Who the tablet was told was on the desk — attribution, not
    // authentication, same contract as Payment/CheckIn's stamp.
    @Column(name = "recorded_by_id", length = 64)
    private String recordedById;

    @Column(name = "recorded_by_name", length = 100)
    private String recordedByName;
}
