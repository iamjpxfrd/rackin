package com.rackin.backend.repository;

import com.rackin.backend.model.Member;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface MemberRepository extends JpaRepository<Member, String> {

    // Starting point 1000 so the first assigned id is "1001", matching the
    // frontend's existing scheme (backend-schema.md Section 3).
    @Query(value = "SELECT COALESCE(MAX(CAST(id AS INTEGER)), 1000) FROM member", nativeQuery = true)
    int findMaxNumericId();
}
