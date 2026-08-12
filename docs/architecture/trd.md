# TRD — Rackin (Gym Check-In System)

**Status:** Draft v1
**Based on:** PRD v1, App Flow v1, ADR-001 (Architecture)
**Scope:** Frontend domain contract + backend sync API

## 1. Purpose

Turn ADR-001's architecture and the PRD's user stories into an
implementable technical contract: exact function signatures, API
endpoints, request/response shapes, sync behavior, validation rules,
and error handling. This is the last document before schema and
implementation — nothing here should require product or architecture
decisions to still be open.

## 2. System boundaries (recap)

Per ADR-001: **IndexedDB on the tablet is the source of truth.** The
Spring Boot backend is an optional sync target, not a dependency for
any core flow. Every requirement below is written with that priority
order — local-first always works; sync is additive.

```
Tablet (source of truth)  ──(optional, when online)──►  Backend (sync target)
IndexedDB                                                 PostgreSQL
```

## 3. Frontend domain contract (already implemented, formalized here)

These match `src/lib/checkIn.js` and `src/lib/membership.js` from the
repo scaffold. This section is the authoritative contract — the
backend API (Section 5) is required to mirror it.

### 3.1 `checkInMember(memberId, method)`
- **Input:** `memberId: string`, `method: 'numpad' | 'qr' | 'search'`
- **Output:** `{ member: Member, visitCountThisMonth: number }`
- **Errors:** throws `No member found for #{memberId}` if unmatched
  (PRD 4.1 AC3)
- **Side effect:** writes one `CheckIn` record locally, immediately,
  with no network dependency (PRD 4.1 AC4, PRD 4.10)

### 3.2 `getLapsedMembers(days = 14)`
- **Output:** array of `{ member: Member, lastCheckIn: CheckIn | null }`,
  sorted oldest-last-visit-first, `null` last-check-in sorted as
  oldest (PRD 4.5 AC1–AC2)
- **Recompute trigger:** on every read, not cached — dataset size at
  single-gym scale (hundreds of members) makes this cheap

### 3.3 `registerMember({ name, planType, amount, method })`
- **Input validation:** `name` required non-empty; `planType` must be
  `'weekly' | 'monthly'`; `amount` numeric ≥ 0; `method` must be
  `'cash' | 'transfer'`
- **Output:** assigned `memberId: string`
- **Side effects:** creates `Member` record, creates one `Payment`
  record via `recordPayment` (PRD 4.6 AC1–AC3), triggers QR
  generation (Section 6)

### 3.4 `recordPayment(memberId, { amount, method })`
- **Output:** none (void) — caller re-reads status via
  `getMembershipStatus`
- **Business rule:** `coversUntil = paidAt + planDurationDays[member.planType]`
  (PRD 4.7 AC1) — **always calculated from `paidAt`, never extended
  from a prior `coversUntil`**, even if the member pays early. This
  is a deliberate simplification for the pilot; revisit if early
  renewals become common enough that members feel shortchanged.

### 3.5 `getMembershipStatus(memberId)`
- **Output:** `'active' | 'expired'`
- **Rule:** `active` if latest `Payment.coversUntil >= now`, else
  `expired`. No member with zero payments is ever `active` (PRD 4.8
  AC1)

### 3.6 `getExpiringMembers(days = 7)`
- **Output:** array of `{ member: Member, coversUntil: string }`,
  filtered to `now <= coversUntil <= now + days`, sorted
  soonest-first (PRD 4.9 AC1–AC2)

## 4. Validation rules (cross-cutting)

| Field | Rule |
|---|---|
| `member.name` | Required, 1–100 chars, trimmed |
| `member.planType` | Enum: `weekly`, `monthly` only for pilot (extensible list, per ADR-001) |
| `payment.amount` | Required, numeric, > 0 |
| `payment.method` | Enum: `cash`, `transfer` |
| `checkIn.method` | Enum: `numpad`, `qr`, `search` — required, never inferred |
| `memberId` | Assigned by the system only (sequential, starting 1001 per current scaffold); never client-supplied on registration |

## 5. Backend API contract (Spring Boot sync layer)

Mirrors the frontend domain functions 1:1 — the backend does not
introduce new business logic, only persistence and a network
transport for it, per ADR-001's "additive, not a rewrite" principle.

### `POST /api/members`
Registers a member + initial payment in one call (matches 3.3).

**Request:**
```json
{
  "name": "Diego Santos",
  "planType": "monthly",
  "amount": 1200,
  "method": "cash"
}
```

**Response `201`:**
```json
{
  "memberId": "1217",
  "status": "active",
  "coversUntil": "2026-08-11T00:00:00Z"
}
```

**Errors:** `400` on validation failure (field + reason in body).

---

### `POST /api/checkins`
Records a check-in (matches 3.1).

**Request:**
```json
{ "memberId": "1114", "method": "numpad" }
```

**Response `201`:**
```json
{
  "member": { "id": "1114", "name": "Ana Reyes", "planType": "monthly" },
  "visitCountThisMonth": 12
}
```

**Errors:** `404` if `memberId` unmatched, body:
`{ "error": "No member found for #1114" }` — message matches the
frontend error string exactly (PRD 4.1 AC3), so the UI layer doesn't
need method-specific error copy.

---

### `GET /api/checkins/lapsed?days=14`
Matches 3.2.

**Response `200`:**
```json
[
  {
    "member": { "id": "1045", "name": "Jun Manalo" },
    "lastCheckIn": null
  },
  {
    "member": { "id": "1132", "name": "Rica Tan" },
    "lastCheckIn": { "timestamp": "2026-06-20T09:00:00Z", "method": "qr" }
  }
]
```

---

### `POST /api/payments`
Matches 3.4.

**Request:**
```json
{ "memberId": "1114", "amount": 1200, "method": "transfer" }
```

**Response `201`:**
```json
{ "coversUntil": "2026-08-11T00:00:00Z", "status": "active" }
```

**Errors:** `404` if `memberId` unmatched.

---

### `GET /api/payments/expiring?days=7`
Matches 3.6.

**Response `200`:**
```json
[
  { "member": { "id": "1098", "name": "Mika Perez" }, "coversUntil": "2026-07-14T00:00:00Z" }
]
```

---

### `GET /api/members/{id}/status`
Matches 3.5. Response: `{ "status": "active" | "expired" }`

## 6. QR code contract

- **Payload:** the QR code encodes the member's `id` as a plain
  string — no additional data, no signing, no expiry embedded in the
  code itself (status is always looked up live, never trusted from
  the code). This keeps a printed card valid indefinitely even as
  membership status changes underneath it.
- **Generation:** client-side, at registration time and on-demand
  from the member profile — no backend round-trip required (ADR-001).
- **Scan resolution:** scanning decodes to a `memberId` string, then
  calls the identical `checkInMember(memberId, 'qr')` path as numpad
  entry (Section 3.1) — no separate QR-specific endpoint or function
  exists, by design (ADR-001, App Flow Section 3).

## 7. Sync behavior (tablet ↔ backend)

**Implemented.** Still not *required* for the pilot (ADR-001) — a build
with no `VITE_RACKIN_API_URL` set runs offline-only and every flow works
unchanged. Writes queue regardless, so pointing a later build at a
backend pushes the accumulated history rather than starting from empty.

Frontend: `src/sync/` (`outbox.js` queue, `api.js` transport,
`sync.js` runner). Backend: the Section 5 endpoints, made idempotent on
`clientUuid` and accepting the tablet's own ids and timestamps.

- **Triggers:** three, each covering a case the others miss. This
  section originally specified only the second; that alone left a
  member registered on an already-online tablet sitting in the queue
  until the app was next reloaded, which is how the gap was found.
  1. **After every local write.** The common case when the gym's wifi
     is working: staff register someone and it reaches the backend
     seconds later. No `online` event fires here, because the tablet
     never went offline.
  2. **On the browser `online` event.** The tablet was offline and has
     just regained a network; drain whatever accumulated.
  3. **On a retry timer, but only while the queue is non-empty.** The
     browser reports `online` for a wifi network with no route to the
     backend, and fires no event when that route returns. The timer
     stops the moment the queue drains, so an idle tablet polls
     nothing — still no continuous polling, and no battery drain on a
     device left on the front desk all day.
- **Direction:** one-way push, tablet → backend, for the pilot. The
  tablet remains authoritative; the backend does not push changes
  back down in v1 (no multi-device conflict resolution needed yet,
  since there's only one device per ADR-001).
- **Payload:** queued local writes (check-ins, registrations,
  payments) since the last successful sync, sent as a batch via the
  endpoints in Section 5, in creation order.
- **Idempotency:** each local record carries a client-generated UUID
  in addition to its local auto-increment id; the backend looks up
  that UUID before inserting and replays the original result, so a
  retried sync after a partial failure never duplicates a check-in,
  double-counts a visit, or extends a membership twice.
- **Ordering:** the queue drains in insertion order and **stops at the
  first retryable failure** rather than skipping past it. A payment or
  check-in that reached the backend before its registration would be
  refused outright, so continuing past a gap would turn one transient
  failure into a run of permanent rejections.
- **Timestamps:** every operation carries the moment it actually
  happened. Without this a day of offline check-ins would all land at
  sync time and read as one simultaneous rush, and a payment taken on
  Monday and synced on Friday would silently gain four days of
  coverage.
- **Failure handling:** on any sync failure, the queue is left intact
  and retried on the next `online` event — sync failure is silent to
  staff (no error banner), since it never blocks any local flow
  (PRD 4.10). The one exception to retrying is a `4xx`: the backend
  understood the request and refused it, so it is marked `rejected`,
  kept for debugging, and skipped by every later drain. Retrying it
  would wedge the queue behind a record that can never succeed.

## 8. Error handling principles

- Every user-facing error states what happened and the next action
  (PRD's voice guidance) — this applies to backend error responses
  too, since sync failures should be debuggable later even though
  they're silent to staff in the moment.
- No error in any check-in path (numpad, QR, search) ever blocks
  staff from immediately trying a different method — enforced at the
  domain layer (Section 3), not just the UI (App Flow Section 2–4).
- Backend validation errors return field-level detail (`400` with
  `{ field, reason }`) so the frontend can surface specific guidance,
  even though this matters more for future admin tooling than the
  pilot's staff-facing flows.

## 9. Non-functional requirements

| Requirement | Target |
|---|---|
| Offline availability | 100% of core flows (Section 3) function with zero network |
| Check-in response time (local) | < 200ms from confirm to confirmation card |
| Sync payload size | Batched, not per-record, to minimize requests once online |
| Backend uptime | Not a pilot concern — sync is additive and retried; no SLA needed until multi-device |
| Data retention | No deletion in MVP scope; all check-ins/payments retained indefinitely for lapsed/expiring calculations |

## 10. Out of scope for this TRD

Per PRD Section 5 (deferred features) — no technical contract is
defined here for: authentication/authorization (no member login in
MVP), payment processing integration, multi-device conflict
resolution, or class scheduling. These will need their own TRD
sections if/when promoted out of "deferred."

## 11. Dependencies for next steps

- **Backend Schema** (next): the entities implied throughout this
  document (`Member`, `Payment`, `CheckIn`) need formal field types,
  constraints, and indexes — this TRD fixes their *shape and
  behavior*, the schema doc fixes their *storage definition*.
