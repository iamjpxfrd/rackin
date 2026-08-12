# ADR-001: Architecture for Offline-First Gym Check-In System

**Status:** Accepted — amended by [ADR-002](ADR-002-build-the-backend-before-the-pilot.md)
**Date:** 2026-07-09
**Deciders:** Gym owner, staff (end users), dev (you)

> **Amendment (2026-08-12).** The timing of the backend has changed. This
> ADR defers cloud sync until after the pilot (see Action Item 7 and the
> `(disabled v1)` sync queue below); the backend and one-way sync were in
> fact built first, for reasons ADR-002 records — data durability for
> payment records, a planned owner dashboard, and demonstrable server-side
> engineering.
>
> **Everything else in this ADR still holds.** The tablet remains the
> source of truth, the backend is an optional target no user-facing flow
> waits on, and check-in still works with zero network. Only the schedule
> changed, not the guarantee.

## Context

A province gym currently uses a paper logbook to track member sign-ins.
The MVP replaces this with a staff-operated tablet app. Key constraints:

- **No reliable wifi** at the gym — the app must fully function offline.
- **Members have no smartphones/data plans** — no member-facing app,
  no member-scanned QR codes as the *only* input method.
- **Staff-operated** — one tablet at the front desk, one person
  entering data.
- **$0 budget** — no paid infrastructure, no hosting required for v1.
- **Single gym, single device** for the pilot — multi-device sync is
  explicitly out of scope until the pilot proves the concept.

New input to this ADR: the owner wants to explore **QR code check-in
as an additional entry method**, alongside the numpad, not instead of
it. This needs to be designed so it doesn't compromise the offline,
no-member-device constraint.

## Decision

Build a **single-page, offline-first web app** with local persistence
as the system of record for the pilot, and design the data/service
layer so cloud sync can be added later without a rewrite.

For check-in input, support **two methods that both resolve to the
same lookup**, in priority order:
1. **Numpad entry** (primary, always available, zero new hardware)
2. **QR code scan** (optional accelerant, using the tablet's own
   camera — not a member's device)

Every member gets an assigned number *and* an auto-generated QR code
that encodes that number. The QR code is just a faster way to type the
same number a staff member could type by hand — it doesn't introduce a
second identity system, and it doesn't require the member to own
anything beyond a small printed or laminated card/keytag the gym
issues them.

## Options Considered

### Check-in input

#### Option A: Numpad only (original MVP)
| Dimension | Assessment |
|-----------|------------|
| Complexity | Low |
| Cost | $0 |
| Scalability | Fine at low front-desk volume |
| Team familiarity | High — plain form input |

**Pros:** Simplest to build and test; zero hardware; works for every
member regardless of literacy or possessions.
**Cons:** Slower at peak times; typos possible; owner specifically
asked for a faster option.

#### Option B: QR-only
| Dimension | Assessment |
|-----------|------------|
| Complexity | Medium (camera access, scan library) |
| Cost | $0 (uses tablet camera) but requires printing member cards |
| Scalability | Fast per-scan, but fails if a card is lost/forgotten |
| Team familiarity | Medium — new library, new failure modes |

**Pros:** Fast, low staff effort per check-in.
**Cons:** Single point of failure if a member forgets/loses their
card — and unlike a phone, a lost gym card is common and has no
backup. Violates the "member needs nothing extra" spirit for anyone
without a card yet (e.g. brand-new members before their card is
printed).

#### Option C: Numpad primary + QR as optional accelerant (chosen)
| Dimension | Assessment |
|-----------|------------|
| Complexity | Medium — one extra input method, same lookup logic underneath |
| Cost | $0 — tablet camera + a $0 QR generation library; printing cards is the gym's only real cost, and optional |
| Scalability | Best of both — fast when scannable, always has a fallback |
| Team familiarity | Medium, but isolated to one component |

**Pros:** No member is ever blocked from checking in (numpad always
works); QR just removes typing for members who have a card; both paths
share one `checkInMember(memberId)` function, so there's no parallel
logic to maintain; naturally supports a phased rollout — ship numpad
first, add QR scanning later behind the same interface.
**Cons:** Slightly more UI (a toggle or auto-detecting camera view);
requires generating and optionally printing QR codes per member,
which is a small new operational step for staff.

## Trade-off Analysis

The real trade-off isn't numpad vs. QR — it's **speed vs. dependency**.
QR-only would be faster per check-in but reintroduces a form of
"member needs a thing," which is exactly what the original design
avoided by not using member-side smartphones. Making QR strictly
optional and routing it through the same member-number lookup as the
numpad keeps the system's core guarantee intact: *any* member can
always check in with nothing but their memory of a number, and staff
can always search by name as a second fallback. QR becomes a
convenience layer, not a dependency layer.

This also keeps the data model untouched — a QR code is not a new
entity, it's an encoding of `memberId`. That's what makes it cheap to
add now and cheap to keep later.

## System Architecture

### High-level shape

```
┌─────────────────────────────────────────────┐
│              Tablet (Browser)                │
│                                               │
│  ┌─────────────┐   ┌────────────────────┐   │
│  │   UI Layer   │   │   Input Adapters    │   │
│  │ (React SPA)  │◄──┤  - Numpad           │   │
│  │              │   │  - Camera/QR scan   │   │
│  └──────┬───────┘   │  - Name search      │   │
│         │           └────────────────────┘   │
│         ▼                                     │
│  ┌─────────────────────────────────────┐     │
│  │        App/Domain Layer               │     │
│  │  checkInMember(memberId)              │     │
│  │  registerMember(data)                 │     │
│  │  recordPayment(memberId, data)        │     │
│  │  getLapsedMembers() / getExpiring()   │     │
│  └──────────────┬────────────────────────┘     │
│                 ▼                             │
│  ┌─────────────────────────────────────┐     │
│  │     Local Persistence Layer           │     │
│  │  IndexedDB (members, checkins,        │     │
│  │  payments) — source of truth for v1   │     │
│  └──────────────┬────────────────────────┘     │
│                 │  (future, optional)          │
│                 ▼                             │
│        ┌──────────────────┐                  │
│        │  Sync Queue        │ ── (disabled v1)│
│        └──────────────────┘                  │
└─────────────────────────────────────────────┘
                  │
                  ▼ (future, when wifi available)
        ┌───────────────────────┐
        │  Cloud backend (TBD)    │
        │  e.g. Supabase/Firebase │
        └───────────────────────┘
```

### Why this layering matters

The **domain layer sits between UI and storage** so that:
- Numpad, QR scan, and name search all call the *same*
  `checkInMember(memberId)` function — no duplicated business logic
  (visit counting, lapsed detection, etc.) per input method.
- Swapping local-only storage for local+cloud sync later only touches
  the persistence layer, not the UI or domain logic.

### Data model (unchanged by the QR addition)

```
Member
  id (member number, also the QR payload)
  name
  planType: 'weekly' | 'monthly'
  createdAt

Payment
  id
  memberId
  amount
  method: 'cash' | 'transfer'
  paidAt
  coversUntil   // derived: paidAt + plan duration

CheckIn
  id
  memberId
  timestamp
  method: 'numpad' | 'qr' | 'search'   // NEW: track how they checked in
```

Adding `method` to `CheckIn` is the only schema change QR requires —
useful later for the owner to see how much QR is actually getting
used before investing in printed cards for every member.

### QR code mechanics

- **Generation:** a QR code is generated *client-side* from a
  member's existing `id` at registration time (or on demand) — no new
  ID system, no server round-trip, no cost.
- **Display/printing:** staff can view/print the code on a small card
  or keytag. This is a physical/operational step for the gym, not a
  technical dependency — the app works identically for members who
  never get a printed code.
- **Scanning:** uses the tablet's own camera via a browser QR-reading
  library (e.g. a lightweight JS scanner). The *tablet* scans a
  *card* — no member device or app involved, preserving the
  no-smartphone-required constraint.
- **Failure mode:** camera unavailable, code unreadable, or card
  lost/forgotten → staff falls back to numpad or name search
  instantly, same screen, no dead end.

### Offline-first persistence

- **v1 (pilot):** IndexedDB (via a wrapper like Dexie.js) as the sole
  source of truth. No network calls required for the app to function.
  Survives tablet restarts; data lives on-device.
- **Future (if pilot succeeds and multi-device/cloud is needed):**
  introduce a sync queue that batches local writes and pushes them
  to a backend (e.g. Supabase, which offers a free tier and has good
  offline/online reconciliation patterns) whenever connectivity is
  available. This is additive — the domain layer already writes
  through one interface, so sync can be introduced without touching
  check-in, registration, or payment logic.

## Consequences

- **Easier:** staff get a faster check-in path for members who have a
  card, without losing the guarantee that *everyone* can check in
  some way; the system stays a single, small, testable artifact.
- **Harder:** slightly more surface area to test (three input paths
  instead of two); the gym now has a small new task (optionally
  printing member cards) that didn't exist before.
- **To revisit later:** whether QR adoption is worth the printing
  effort (the `method` field on `CheckIn` will answer this with real
  data after the pilot); whether/when to add cloud sync; whether a
  second device or location ever needs multi-device consistency.

## Action Items

1. [ ] Build domain layer with `checkInMember`, `registerMember`,
   `recordPayment`, `getLapsedMembers`, `getExpiringMembers`
2. [ ] Build IndexedDB persistence layer behind a single storage
   interface
3. [ ] Build numpad + name-search UI calling the domain layer
4. [ ] Add QR generation for members (client-side, from `id`)
5. [ ] Add camera-based QR scan input, wired to the same
   `checkInMember` call, with instant fallback to numpad on failure
6. [ ] Add `method` field to `CheckIn` to track numpad vs. QR vs.
   search usage
7. [ ] Pilot at one gym; review `method` usage and lapsed/expiring
   list engagement before deciding on cloud sync or a second device
   — *superseded in part by ADR-002: the sync target was built ahead of
   this review. The second-device question is untouched and still gated
   on the pilot.*
