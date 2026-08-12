package com.rackin.backend.repository;

import com.rackin.backend.model.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PaymentRepository extends JpaRepository<Payment, Long> {

    Optional<Payment> findFirstByMember_IdOrderByPaidAtDesc(String memberId);

    // The tablet's idempotency key (TRD 7) — a replayed payment must not
    // extend the member's coverage a second time.
    Optional<Payment> findByClientUuid(UUID clientUuid);

    // DISTINCT ON (backend-schema.md 6.2) is Postgres-only; a correlated
    // subquery for "latest payment per member" is portable to H2 as well.
    @Query(value = "SELECT m.id AS id, m.name AS name, p.covers_until AS coversUntil "
            + "FROM member m JOIN payment p ON p.member_id = m.id "
            + "WHERE p.paid_at = (SELECT MAX(p2.paid_at) FROM payment p2 WHERE p2.member_id = m.id) "
            + "AND p.covers_until BETWEEN :now AND :until "
            + "ORDER BY p.covers_until ASC", nativeQuery = true)
    List<ExpiringMemberProjection> findExpiring(@Param("now") Instant now, @Param("until") Instant until);
}
