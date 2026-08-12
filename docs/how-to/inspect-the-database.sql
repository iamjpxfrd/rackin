-- Queries for looking at what the tablet has actually synced.
--
-- Run with:
--   psql -U rackin_app -h localhost -d rackin -f docs/how-to/inspect-the-database.sql
-- or paste individually into a psql session.
--
-- Status is DERIVED, never stored (TRD 3.5): a member is active while their
-- latest payment still covers today. Any query here that reports status
-- recomputes it the same way the backend does, so the two can never disagree.


-- 1. The whole roster at a glance: plan, derived status, coverage, activity.
--    This is the one to run first — it answers "did the sync work".
SELECT m.id,
       m.name,
       m.plan_type,
       CASE WHEN MAX(p.covers_until) >= now() THEN 'active' ELSE 'expired' END AS status,
       MAX(p.covers_until)                                                    AS covered_until,
       count(DISTINCT p.id)                                                   AS payments,
       count(DISTINCT c.id)                                                   AS check_ins,
       MAX(c."timestamp")                                                     AS last_seen
FROM member m
         LEFT JOIN payment p ON p.member_id = m.id
         LEFT JOIN check_in c ON c.member_id = m.id
GROUP BY m.id, m.name, m.plan_type
ORDER BY m.id;


-- 2. Row counts, for confirming a sync landed everything it should have.
SELECT (SELECT count(*) FROM member)   AS members,
       (SELECT count(*) FROM payment)  AS payments,
       (SELECT count(*) FROM check_in) AS check_ins;


-- 3. Members who have stopped coming (TRD 3.2 / PRD 4.5).
--    Includes members who have never checked in at all — the NULLS FIRST
--    ordering puts them at the top, since they are the most overdue contact.
SELECT m.id,
       m.name,
       m.phone,
       MAX(c."timestamp") AS last_check_in
FROM member m
         LEFT JOIN check_in c ON c.member_id = m.id
GROUP BY m.id, m.name, m.phone
HAVING MAX(c."timestamp") < now() - interval '14 days'
    OR MAX(c."timestamp") IS NULL
ORDER BY last_check_in ASC NULLS FIRST;


-- 4. Memberships about to lapse (TRD 3.6 / PRD 4.9).
--    Already-expired members are excluded: they belong on the lapsed list, not
--    on a list of things about to happen.
SELECT m.id,
       m.name,
       p.covers_until
FROM member m
         JOIN payment p ON p.member_id = m.id
WHERE p.paid_at = (SELECT MAX(p2.paid_at) FROM payment p2 WHERE p2.member_id = m.id)
  AND p.covers_until BETWEEN now() AND now() + interval '7 days'
ORDER BY p.covers_until ASC;


-- 5. Today's check-ins, newest first — the desk's own activity feed (PRD 4.4).
SELECT c."timestamp", m.id, m.name, c.method
FROM check_in c
         JOIN member m ON m.id = c.member_id
WHERE c."timestamp" >= date_trunc('day', now())
ORDER BY c."timestamp" DESC;


-- 6. Sync integrity: every clientUuid must appear at most once.
--    This should ALWAYS return zero rows. Each table has a unique index on
--    client_uuid, so a row here would mean the index is gone, not that the
--    dedupe logic failed. Cheap to check after any migration.
SELECT 'member' AS source, client_uuid, count(*)
FROM member
GROUP BY client_uuid
HAVING count(*) > 1
UNION ALL
SELECT 'payment', client_uuid, count(*)
FROM payment
GROUP BY client_uuid
HAVING count(*) > 1
UNION ALL
SELECT 'check_in', client_uuid, count(*)
FROM check_in
GROUP BY client_uuid
HAVING count(*) > 1;


-- 7. Did late-synced records keep their real times?
--    A tablet that was offline pushes hours later, and the gap below is what
--    proves the backend stored when things HAPPENED rather than when they
--    arrived. A check-in whose timestamp equals its sync time would show as a
--    suspiciously round zero gap across every row.
SELECT m.id,
       m.name,
       c."timestamp"                  AS happened_at,
       now() - c."timestamp"          AS ago,
       c.method
FROM check_in c
         JOIN member m ON m.id = c.member_id
ORDER BY c."timestamp" DESC
LIMIT 20;


-- 8. Plan mix, including the `session` drop-ins the backend used to refuse.
SELECT plan_type, count(*) AS members
FROM member
GROUP BY plan_type
ORDER BY members DESC;


-- 9. Payment history for one member. Set the id first:
--    \set member_id '1001'
SELECT p.paid_at, p.amount, p.method, p.covers_until
FROM payment p
WHERE p.member_id = :'member_id'
ORDER BY p.paid_at DESC;


-- 10. Which migrations have run (Flyway's own bookkeeping).
SELECT installed_rank, version, description, success, installed_on
FROM flyway_schema_history
ORDER BY installed_rank;
