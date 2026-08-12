-- DESTRUCTIVE. Deletes every member, payment, and check-in from the backend.
--
--   psql -U rackin_app -h localhost -d rackin -f docs/how-to/flush-all-data.sql
--
-- Deliberately a separate file from inspect-the-database.sql. That one is meant
-- to be run whole with -f; putting a DELETE anywhere inside it would make a
-- routine look-around capable of emptying the database by accident.
--
-- For clearing pilot test data between runs. Not for production: there is no
-- backup step here and nothing to undo it with.
--
-- The schema and flyway_schema_history are untouched, so the backend starts
-- normally afterwards and applies no migrations.
--
-- This clears the BACKEND only. The tablet is the source of truth and keeps
-- everything it has — and will push it all back on the next sync. To clear that
-- side too, run this in the browser console first:
--
--   await window.rackinSync.wipeLocal({ keepStaff: true })
--
-- then reload the page. Order does not strictly matter, but doing the tablet
-- first avoids a sync repopulating the backend between the two steps.

BEGIN;

-- Children first: both reference member(id).
DELETE FROM check_in;
DELETE FROM payment;
DELETE FROM member;

-- Restart the identity counters so a flushed database looks like a fresh one
-- rather than one that quietly remembers. Member ids are strings assigned by
-- whichever side creates the record first, so they have no sequence to reset —
-- the next member is #1001 again because MAX(id)+1 has nothing to count from.
ALTER TABLE payment  ALTER COLUMN id RESTART WITH 1;
ALTER TABLE check_in ALTER COLUMN id RESTART WITH 1;

COMMIT;

-- Should report three zeros.
SELECT (SELECT count(*) FROM member)   AS members,
       (SELECT count(*) FROM payment)  AS payments,
       (SELECT count(*) FROM check_in) AS check_ins;
