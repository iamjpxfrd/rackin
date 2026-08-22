package com.rackin.backend.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "check_in", indexes = {
        @Index(name = "idx_checkin_member_id", columnList = "member_id"),
        @Index(name = "idx_checkin_timestamp", columnList = "timestamp"),
        @Index(name = "idx_checkin_client_uuid", columnList = "client_uuid", unique = true)
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CheckIn {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "member_id", nullable = false)
    private Member member;

    @Column(nullable = false)
    private Instant timestamp;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CheckInMethod method;

    @Column(name = "client_uuid", nullable = false, unique = true)
    private UUID clientUuid;

    // Whoever was signed in on the tablet at the time. Attribution, not
    // authentication — see Payment for the reasoning; a misattributed visit is
    // trivia, but the same stamp on a payment is the accountability record.
    @Column(name = "recorded_by_id", length = 64)
    private String recordedById;

    @Column(name = "recorded_by_name", length = 100)
    private String recordedByName;

    // Set by either a manual staff checkout or the tablet's force-logout
    // sweep past closing (2026-08-23). Null is the common case — most
    // visits never need an explicit checkout recorded.
    @Column(name = "check_out_at")
    private Instant checkOutAt;
}
