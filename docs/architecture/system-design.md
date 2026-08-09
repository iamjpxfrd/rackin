# System Design — Rackin (Gym Check-In System)

**Status:** v1 — consolidates ADR-001, TRD, and Backend Schema into a
single system-design view
**Framework:** Requirements → High-Level Design → Deep Dive → Scale &
Reliability → Trade-offs

## 1. Requirements Gathering

### Functional requirements
- Staff check a member in via numpad, QR scan, or name search (all
  three resolve to one lookup)
- Live "today's activity" feed
- Automatic lapsed-members detection (no check-in in 14+ days)
- Automatic expiring-soon detection (plan lapses within 7 days)
- New member registration + first payment in one action
- Record renewal payments for existing members
- Automatic Active/Expired status, derived from payment history

### Non-functional requirements
- **Availability:** 100% of core flows must work with zero network
  connectivity — not "graceful degradation," a hard requirement
  (PRD 4.10)
- **Latency:** check-in confirm-to-confirmation under 200ms (local,
  no network round-trip in the critical path)
- **Scale:** single gym, single tablet, hundreds of members, low
  hundreds of check-ins/day — this is a small-N system by design
- **Cost:** $0 to run for the pilot (MVP overview)

### Constraints
- No reliable wifi at the point of use
- No member-owned devices — check-in is entirely staff-mediated
- Single developer/small team, single tablet, single gym for the
  pilot — building for a second gym or device is explicitly deferred
- Java/Spring Boot chosen for the eventual backend (team preference,
  confirmed earlier in this project)

## 2. High-Level Design

### Component diagram

```
┌───────────────────────────────────────────────────┐
│                  Tablet (Browser)                    │
│                                                       │
│  ┌───────────┐   ┌─────────────────────┐            │
│  │ UI Layer   │   │  Input Adapters       │            │
│  │ (React)    │◄──┤  numpad / QR / search │            │
│  └─────┬─────┘   └─────────────────────┘            │
│        │                                             │
│        ▼                                             │
│  ┌─────────────────────────────────────┐            │
│  │   Domain Layer (src/lib)              │            │
│  │   checkInMember, registerMember,       │            │
│  │   recordPayment, getLapsedMembers,     │            │
│  │   getExpiringMembers                   │            │
│  └─────────────┬───────────────────────┘            │
│                ▼                                     │
│  ┌─────────────────────────────────────┐            │
│  │  Persistence Layer (src/db) — Dexie/   │            │
│  │  IndexedDB — SOURCE OF TRUTH           │            │
│  └─────────────┬───────────────────────┘            │
│                │ (optional, only when online)         │
│                ▼                                     │
│         ┌───────────────┐                           │
│         │  Sync Queue      │  (Phase 8, not built yet)│
│         └───────┬───────┘                           │
└─────────────────┼───────────────────────────────────┘
                  │ HTTPS, batched, retried
                  ▼
        ┌─────────────────────────┐
        │  Spring Boot API (sync target)│
        │  /api/members, /checkins,       │
        │  /payments — mirrors domain layer│
        └─────────────┬───────────────┘
                      ▼
              ┌───────────────┐
              │  PostgreSQL      │
              └───────────────┘
```

### Data flow — check-in (the critical path)

```
staff input (numpad/QR/search)
   → domain layer: checkInMember(memberId, method)
   → IndexedDB write (< 200ms, local, no network)
   → confirmation rendered
   → [async, non-blocking] queued for sync whenever online
```

The sync step is deliberately drawn *outside* the critical path —
nothing in the check-in flow waits on it, checks its status, or
degrades if it never runs.

### API contract (backend, when built)

Already fully specified in the TRD:
- `POST /api/members` — register + first payment
- `POST /api/checkins` — record a check-in
- `GET /api/checkins/lapsed?days=14`
- `POST /api/payments`
- `GET /api/payments/expiring?days=7`
- `GET /api/members/{id}/status`

### Storage choices

| Layer | Choice | Why |
|---|---|---|
| Tablet | IndexedDB (Dexie) | Only realistic option for structured, queryable offline storage in a browser; survives restarts |
| Backend | PostgreSQL | Free-tier friendly, relational fit for Member/Payment/CheckIn with foreign keys and range queries (lapsed/expiring) |
| Backend (local dev) | H2 | Zero-setup local iteration before Postgres is provisioned |

## 3. Deep Dive

### Data model
Fully specified in `backend-schema.md`: `member` (id as
string PK, assigned locally, `phone` optional), `payment`
(`covers_until` computed at write time), `check_in` (`method` enum
tracks numpad/qr/search — the field that lets the pilot measure QR
adoption). Every table carries a `client_uuid` for sync idempotency.

### Why `member.id` is a string, not an auto-increment int
This is the one deep-dive decision worth calling out on its own: the
tablet must be able to assign a member id **while fully offline**,
with no backend round-trip. A database auto-increment integer can't
do that safely across two independent sources (tablet + backend)
without collision risk. A deterministic, sequential string scheme
(`"1001"`, `"1002"`, ...) assigned client-side sidesteps this for the
single-device pilot scope — revisit if a second device is ever added
(see Section 5).

### Caching strategy
None needed. The "cache" *is* the source of truth (IndexedDB) — there
is no origin server being cached against in the critical path. This
is a deliberate simplification that only holds because of the
offline-first constraint; a normal online-first app would need real
caching (query results, session data) that this system doesn't.

### Queue/event design
One queue: the sync queue (Phase 8, TRD Section 7). Local writes
since the last successful sync are batched and pushed on the
browser's `online` event, not polled. Idempotent via `client_uuid`
upsert on the backend — a retried/interrupted sync can never
duplicate a record.

### Error handling and retry logic
- **Check-in errors** (unmatched member number): surfaced
  immediately to staff, never blocks the next attempt (PRD 4.1 AC3)
- **Sync errors:** silent to staff by design — the queue stays intact
  and retries on the next `online` event (TRD Section 7). This is a
  deliberate choice: sync failure has zero impact on gym operations,
  so surfacing it to a non-technical staff user would only cause
  confusion with no actionable next step for them.

## 4. Scale and Reliability

### Load estimation
Single gym: low hundreds of members, realistically under 200
check-ins/day, near-zero concurrent writes (one tablet, one staff
member operating it at a time). This is several orders of magnitude
below where IndexedDB or a single small Postgres instance would show
any strain — scale is a non-issue at current scope.

### Horizontal vs. vertical scaling
Not applicable yet. If a second gym or device is added later, the
system needs to move from "one implicit tenant" to real multi-tenancy
(a `gym_id` on every table, currently absent by design per Backend
Schema Section 9) — that's a schema migration and a sync-conflict
design problem (two devices writing to overlapping data), not a
scaling problem in the traditional sense.

### Failover and redundancy
The tablet itself is the single point of failure for daily operation
— if it breaks, the paper logbook is the fallback until it's
replaced or repaired, per the pilot's implicit assumption of one
device. This is an accepted risk at pilot scale (MVP overview: prove
the concept first, invest in redundancy only if warranted). The
backend, once built, has no redundancy requirement either — its
downtime doesn't affect the tablet at all, per the whole point of
Section 2's design.

### Monitoring and alerting
Not built for the pilot. If added post-Phase-8, the only meaningful
signal to watch is sync queue depth/age on the tablet (is data
successfully reaching the backend, or silently piling up) — everything
else is out of scope until there's more than one device to reason
about.

## 5. Trade-off Analysis

| Decision | Trade-off |
|---|---|
| IndexedDB as source of truth, not Postgres | **Gains:** true offline guarantee, zero dependency on connectivity. **Costs:** no multi-device consistency story yet; string-based id assignment instead of simpler auto-increment; eventual sync/conflict logic is nontrivial when a second device arrives |
| One-way sync (tablet → backend only) | **Gains:** no conflict resolution needed for v1. **Costs:** doesn't scale past one device — the moment a second tablet exists, this becomes a two-way sync problem that isn't designed yet |
| Sync failures silent to staff | **Gains:** no confusing, unactionable errors for non-technical users. **Costs:** if sync silently fails for a long time, nobody notices until someone specifically checks — acceptable now, wouldn't be if the backend became load-bearing |
| Backend built last (Phase 8) | **Gains:** validates the actual product loop before investing in infrastructure that might not be needed. **Costs:** if the pilot succeeds fast and a second gym is wanted immediately, there's a real lag before multi-device/backend work even starts |
| Fixed lapsed/expiring thresholds (14/7 days) | **Gains:** simpler system, no settings screen. **Costs:** if gym owners want different values, that's a code change + redeploy, not a runtime setting (Decision Record, already made deliberately) |

## 6. What to revisit as the system grows

- **`member.id` scheme** — string/sequential works for one device;
  needs a real distributed-id strategy (e.g. UUID as the true PK,
  human-readable number as a display field) the moment a second
  device can create members independently.
- **Sync direction** — one-way breaks the instant a second device
  needs to see the first device's data; that's when real conflict
  resolution (e.g. last-write-wins with `client_uuid` timestamps, or
  a proper CRDT-style approach) becomes necessary.
- **Multi-tenancy** — `gym_id` is absent everywhere by design; adding
  a second gym means threading that through every table and query in
  the Backend Schema, not just the API layer.
- **Thresholds** — move from fixed constants to a small config table
  or settings screen only once a real gym owner asks for it (per the
  Decision Record's reasoning — not before).
