package com.rackin.backend.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "member", indexes = {
        @Index(name = "idx_member_client_uuid", columnList = "client_uuid", unique = true),
        @Index(name = "idx_member_name", columnList = "name")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Member {

    // Sequential string id (e.g. "1217"), assigned in code rather than
    // @GeneratedValue — the tablet must be able to assign the same id space
    // fully offline (backend-schema.md Section 7 / system-design.md).
    @Id
    @Column(length = 20)
    private String id;

    @Column(nullable = false, length = 100)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "plan_type", nullable = false, length = 20)
    private PlanType planType;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "client_uuid", nullable = false, unique = true)
    private UUID clientUuid;

    @Column(length = 20)
    private String phone;
}
