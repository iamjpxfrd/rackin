-- Adds the single-day `session` plan (frontend constants.js PLAN_DAYS).
--
-- The tablet has been selling session plans since the plan was added to the
-- frontend; this backend rejected them outright, so a synced session member
-- would have been refused at the CHECK constraint rather than stored.
--
-- A CHECK constraint cannot be altered in place — it is dropped and recreated.
-- Existing rows are unaffected: the new list is a superset of the old one, so
-- every stored value still satisfies it and no backfill is needed.

ALTER TABLE member DROP CONSTRAINT ck_member_plan_type;

ALTER TABLE member ADD CONSTRAINT ck_member_plan_type
    CHECK (plan_type IN ('session', 'weekly', 'monthly'));
