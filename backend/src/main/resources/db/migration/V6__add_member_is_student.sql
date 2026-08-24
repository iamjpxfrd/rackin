-- Adds Student/Regular membership type (frontend Decisions/Membership
-- Pricing And The Promo Toggle, 2026-08-22) — the tablet has been recording
-- this on Monthly/Annually registrations and renewals since that date, but
-- this backend has never had anywhere to put it; the field was silently
-- dropped on every sync (unknown JSON properties are ignored, not rejected).
--
-- Defaults to false (regular) for the same reason Session/Weekly never show
-- a Student/Regular tag on the tablet: it was never a real choice for the
-- existing rows, which all predate this column.

ALTER TABLE member
    ADD COLUMN is_student BOOLEAN NOT NULL DEFAULT false;
