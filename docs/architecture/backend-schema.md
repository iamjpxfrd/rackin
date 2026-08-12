# Backend Schema — Rackin (Gym Check-In System)

**Status:** Draft v1
**Based on:** TRD v1 (API contract), PRD v1, ADR-001
**Target:** PostgreSQL (production), H2 (local dev) — via Spring Data JPA

## 1. Purpose

Formal table definitions for the three entities implied throughout
the TRD (`Member`, `Payment`, `CheckIn`). This schema is the storage
definition for the contract the TRD already fixed — field types,
constraints, relationships, and indexes, ready to translate directly
into JPA `@Entity` classes.

## 2. Entity-relationship overview

```
┌──────────────┐        ┌──────────────┐        ┌──────────────┐
│    Member     │ 1    * │   Payment     │        │   CheckIn     │
│──────────────│◄───────│──────────────│        │──────────────│
│ id (PK)       │        │ id (PK)       │        │ id (PK)       │
│ name          │        │ member_id(FK) │        │ member_id(FK) │
│ plan_type     │        │ amount        │        │ timestamp     │
│ created_at    │        │ method        │        │ method        │
│ client_uuid   │        │ paid_at       │        │ client_uuid   │
└──────────────┘        │ covers_until  │        └──────────────┘
        ▲                 │ client_uuid   │               ▲
        │                 └──────────────┘               │
        └──────────────── 1 ────────────── * ─────────────┘
                          Member → CheckIn
```

One `Member` has many `Payment` and many `CheckIn` records. Neither
`Payment` nor `CheckIn` reference each other directly — membership
status is always _derived_ from the latest `Payment`, never stored
redundantly (per TRD 3.5).

## 3. Table: `member`

| Column        | Type           | Constraints                                  | Notes                                                                                                                                                                                                                                                  |
| ------------- | -------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `id`          | `VARCHAR(20)`  | PK                                           | Sequential string id, e.g. `"1217"` — matches the frontend's existing scheme (starts at 1001, per `membership.js`). **Not** a UUID/auto-increment int, so the same id space works identically offline (tablet-assigned) and online (backend-assigned). |
| `name`        | `VARCHAR(100)` | NOT NULL                                     | Trimmed, 1–100 chars per TRD Section 4                                                                                                                                                                                                                 |
| `plan_type`   | `VARCHAR(20)`  | NOT NULL, CHECK IN (`'session'`, `'weekly'`, `'monthly'`) | Enum-like constraint; extensible list per ADR-001. Widening it needs a migration that drops and recreates the constraint (`V2`), but no backfill — the new list is a superset, so stored rows still satisfy it |
| `created_at`  | `TIMESTAMPTZ`  | NOT NULL, DEFAULT now()                      |                                                                                                                                                                                                                                                        |
| `client_uuid` | `UUID`         | NOT NULL, UNIQUE                             | Set by the tablet at creation time; used for idempotent sync upserts (TRD Section 7)                                                                                                                                                                   |
| `phone`       | `VARCHAR(20)`  | NULL                                         | Optional, captured at registration (PRD 4.6 AC5) so the owner can act on the lapsed list — decided in `rackin-decision-phone-thresholds.md`                                                                                                            |

**Indexes:**

- `PRIMARY KEY (id)`
- `UNIQUE INDEX idx_member_client_uuid ON member(client_uuid)` — required for sync idempotency
- `INDEX idx_member_name ON member(name)` — supports name search (PRD 4.3)

## 4. Table: `payment`

| Column         | Type            | Constraints                                 | Notes                                                                                                                                                            |
| -------------- | --------------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`           | `BIGSERIAL`     | PK                                          | Backend-generated; payments are never referenced by id from the frontend, so an auto-increment int is fine here (unlike `member.id`)                             |
| `member_id`    | `VARCHAR(20)`   | NOT NULL, FK → `member(id)`                 |                                                                                                                                                                  |
| `amount`       | `NUMERIC(10,2)` | NOT NULL, CHECK (`amount > 0`)              | Matches TRD Section 4 validation                                                                                                                                 |
| `method`       | `VARCHAR(20)`   | NOT NULL, CHECK IN (`'cash'`, `'transfer'`) |                                                                                                                                                                  |
| `paid_at`      | `TIMESTAMPTZ`   | NOT NULL                                    |                                                                                                                                                                  |
| `covers_until` | `TIMESTAMPTZ`   | NOT NULL                                    | Computed at write time as `paid_at + plan_duration_days[member.plan_type]` (TRD 3.4) — stored, not recalculated on every read, since it's immutable once written |
| `client_uuid`  | `UUID`          | NOT NULL, UNIQUE                            | Sync idempotency key                                                                                                                                             |

**Indexes:**

- `PRIMARY KEY (id)`
- `INDEX idx_payment_member_id ON payment(member_id)` — every status/expiring lookup filters by member
- `INDEX idx_payment_covers_until ON payment(covers_until)` — supports the expiring-soon query (Section 6.2) without a full scan
- `UNIQUE INDEX idx_payment_client_uuid ON payment(client_uuid)`

## 5. Table: `check_in`

| Column        | Type          | Constraints                                         | Notes                                                                                                                     |
| ------------- | ------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `id`          | `BIGSERIAL`   | PK                                                  |                                                                                                                           |
| `member_id`   | `VARCHAR(20)` | NOT NULL, FK → `member(id)`                         |                                                                                                                           |
| `timestamp`   | `TIMESTAMPTZ` | NOT NULL                                            |                                                                                                                           |
| `method`      | `VARCHAR(20)` | NOT NULL, CHECK IN (`'numpad'`, `'qr'`, `'search'`) | Matches TRD 3.1 exactly — this is the field that lets the pilot measure QR adoption (per the original design-system note) |
| `client_uuid` | `UUID`        | NOT NULL, UNIQUE                                    | Sync idempotency key                                                                                                      |

**Indexes:**

- `PRIMARY KEY (id)`
- `INDEX idx_checkin_member_id ON check_in(member_id)` — visit-count and lapsed queries filter by member
- `INDEX idx_checkin_timestamp ON check_in(timestamp)` — today's activity feed (PRD 4.4) and lapsed cutoff comparisons both range-scan on this
- `UNIQUE INDEX idx_checkin_client_uuid ON check_in(client_uuid)`

## 6. Derived query definitions

These aren't stored columns — they're the exact queries the schema
above needs to support efficiently, so the indexes above are chosen
against them directly.

### 6.1 Lapsed members (TRD 3.2 / PRD 4.5)

```sql
SELECT m.*, MAX(c.timestamp) AS last_check_in
FROM member m
LEFT JOIN check_in c ON c.member_id = m.id
GROUP BY m.id
HAVING MAX(c.timestamp) < now() - interval '14 days'
    OR MAX(c.timestamp) IS NULL
ORDER BY last_check_in ASC NULLS FIRST;
```

Relies on `idx_checkin_member_id` and `idx_checkin_timestamp`.

### 6.2 Expiring soon (TRD 3.6 / PRD 4.9)

```sql
SELECT DISTINCT ON (m.id) m.id, m.name, p.covers_until
FROM member m
JOIN payment p ON p.member_id = m.id
WHERE p.covers_until BETWEEN now() AND now() + interval '7 days'
ORDER BY m.id, p.paid_at DESC, p.covers_until ASC;
```

Relies on `idx_payment_member_id` and `idx_payment_covers_until`.

### 6.3 Membership status (TRD 3.5 / PRD 4.8)

```sql
SELECT CASE WHEN MAX(p.covers_until) >= now() THEN 'active' ELSE 'expired' END AS status
FROM payment p
WHERE p.member_id = :memberId;
-- No matching row at all → treat as 'expired' at the application layer (TRD 3.5)
```

### 6.4 Visit count this month (TRD 3.1)

```sql
SELECT COUNT(*) FROM check_in
WHERE member_id = :memberId
  AND timestamp >= date_trunc('month', now());
```

## 7. JPA entity mapping notes

- `Member.id` is a `String` primary key, **not** `@GeneratedValue` on
  the backend — the id is assigned by whichever side (tablet or
  backend) creates the record first, and synced via `client_uuid`
  rather than relying on database auto-increment. This is required
  because the tablet can create members fully offline (ADR-001) and
  must assign an id without ever contacting the backend.
- `Payment` and `CheckIn` use standard `@GeneratedValue` auto-increment
  `id` for the backend's own bookkeeping, but carry `client_uuid` as
  the field actually used for sync matching (TRD Section 7
  idempotency).
- `plan_type`, `method` (on both `Payment` and `CheckIn`) are modeled
  as Java `enum` types with `@Enumerated(EnumType.STRING)` — stored
  as readable strings, not ordinals, so the CHECK constraints above
  and the enum values never drift silently out of sync.

## 8. Migration strategy

- **Local dev:** `spring.jpa.hibernate.ddl-auto: update` against H2
  (per the Initializr setup doc) — fine for a single-developer pilot
  phase.
- **Production (Postgres):** switch to versioned migrations (Flyway
  or Liquibase) before the first real sync deployment, so schema
  changes are tracked and reversible once real gym data exists in
  the database. Not needed while the pilot runs fully offline with no
  backend deployed yet.

## 9. What's deliberately not in this schema

Per PRD Section 5 (deferred features) — no tables for: authentication
(no `user`/`staff` login table), multi-gym (no `gym_id` foreign key
anywhere — every table implicitly belongs to the single pilot gym),
class scheduling, or payment-processing transaction records (this
schema _records_ a payment happened; it has no gateway/transaction-id
fields, per the MVP overview's explicit non-goal).

## 10. Resolved

`phone` on `Member` is now included (Section 3) — resolved in
`rackin-decision-phone-thresholds.md`. Lapsed/expiring thresholds
remain fixed constants (14/7 days) in application code, not schema —
no table changes needed for that decision.
