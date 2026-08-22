-- Force-logout past closing (2026-08-23, explicit gym hours: closes 10 PM,
-- force-checked-out 30 minutes after) plus manual staff checkout both write
-- here now. Nullable and stays nullable: most rows never get one (a visit
-- that never needed checking out, or one recorded before this migration
-- existed) — a null is a legitimate "still open, or was never tracked."

ALTER TABLE check_in
    ADD COLUMN check_out_at TIMESTAMPTZ;
