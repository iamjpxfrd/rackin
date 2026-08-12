package com.rackin.backend.repository;

import com.rackin.backend.model.Member;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;
import java.util.UUID;

public interface MemberRepository extends JpaRepository<Member, String> {

    // Starting point 1000 so the first assigned id is "1001", matching the
    // frontend's existing scheme (backend-schema.md Section 3).
    @Query(value = "SELECT COALESCE(MAX(CAST(id AS INTEGER)), 1000) FROM member", nativeQuery = true)
    int findMaxNumericId();

    // The tablet's idempotency key (TRD 7). A sync that timed out after the
    // server committed retries the same UUID, and must find this rather than
    // registering the member a second time.
    Optional<Member> findByClientUuid(UUID clientUuid);
}
