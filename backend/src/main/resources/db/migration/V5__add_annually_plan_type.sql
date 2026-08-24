-- Adds the `annually` plan (frontend constants.js PLAN_DAYS), same pattern
-- as V2's `session` addition: the tablet has been selling annual plans
-- since 2026-08-22 (Membership Pricing And The Promo Toggle decision), this
-- backend rejected them outright with a 400 on both /api/members and
-- /api/payments, so a synced annual registration/renewal was never stored.
--
-- A CHECK constraint cannot be altered in place — it is dropped and
-- recreated. Existing rows are unaffected: the new list is a superset of the
-- old one, so every stored value still satisfies it and no backfill is
-- needed.

ALTER TABLE member DROP CONSTRAINT ck_member_plan_type;

ALTER TABLE member ADD CONSTRAINT ck_member_plan_type
    CHECK (plan_type IN ('session', 'weekly', 'monthly', 'annually'));
