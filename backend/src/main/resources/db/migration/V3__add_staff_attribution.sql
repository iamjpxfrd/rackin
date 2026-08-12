-- Records who was responsible for a visit and, more importantly, for money.
--
-- Attribution, not authentication: these columns say who the tablet was told
-- was on the desk, not who proved it. The gym's own staff list lives on the
-- tablet (ADR-001 keeps it authoritative), so there is no `staff` table here —
-- only the stamp each record carries.
--
-- Both columns are nullable, and stay nullable. Three cases produce a null and
-- all three are legitimate: records written before this migration existed,
-- records written while nobody was signed in, and records from a tablet whose
-- staff list is empty. Guessing a name for any of them would invent an
-- accountable party for a payment nobody can actually vouch for.

ALTER TABLE payment
    -- The tablet's stable staff id. What a dashboard groups by: names get
    -- corrected and repeat, ids do not.
    ADD COLUMN recorded_by_id   VARCHAR(64),
    -- The name as it stood when the money changed hands. Denormalised on
    -- purpose — correcting a spelling next month must not silently rewrite who
    -- took a payment in March.
    ADD COLUMN recorded_by_name VARCHAR(100);

ALTER TABLE check_in
    ADD COLUMN recorded_by_id   VARCHAR(64),
    ADD COLUMN recorded_by_name VARCHAR(100);

-- Supports "what did each staff member take, and when" — the first question
-- the owner dashboard will ask of this data (ADR-002).
CREATE INDEX idx_payment_recorded_by ON payment (recorded_by_id, paid_at);
