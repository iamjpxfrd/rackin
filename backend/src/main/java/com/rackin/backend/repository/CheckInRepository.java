package com.rackin.backend.repository;

import com.rackin.backend.model.CheckIn;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;

public interface CheckInRepository extends JpaRepository<CheckIn, Long> {

    long countByMember_IdAndTimestampGreaterThanEqual(String memberId, Instant monthStart);

    // Cutoff is computed in the service layer (now - days) rather than in SQL,
    // since Postgres/H2 interval syntax isn't portable (backend-schema.md 6.1).
    // Joined (not grouped) on the correlated max-timestamp row so the last
    // check-in's method comes along with it — the TRD response needs both.
    @Query(value = "SELECT m.id AS id, m.name AS name, m.phone AS phone, "
            + "c.timestamp AS lastCheckInTimestamp, c.method AS lastCheckInMethod "
            + "FROM member m LEFT JOIN check_in c ON c.member_id = m.id "
            + "AND c.timestamp = (SELECT MAX(c2.timestamp) FROM check_in c2 WHERE c2.member_id = m.id) "
            + "WHERE c.timestamp IS NULL OR c.timestamp < :cutoff "
            + "ORDER BY c.timestamp ASC NULLS FIRST", nativeQuery = true)
    List<LapsedMemberProjection> findLapsed(@Param("cutoff") Instant cutoff);
}
