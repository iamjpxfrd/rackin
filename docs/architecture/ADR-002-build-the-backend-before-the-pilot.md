# ADR-002: Build the Backend Before the Pilot Requires It

**Status:** Accepted
**Date:** 2026-08-12
**Deciders:** dev
**Amends:** [ADR-001](ADR-001-checkin-input-and-offline-architecture.md)

## Context

ADR-001 decided the pilot ships offline-only. IndexedDB is the source of
truth, the sync queue is marked `(disabled v1)`, the budget is `$0` with
"no hosting required for v1", and Action Item 7 defers the decision
explicitly: pilot at one gym, review usage, *then* decide on cloud sync.

That decision was correct for the reasons it gave, and it has since been
overtaken. A Spring Boot + PostgreSQL backend was built anyway, with
Flyway migrations, 73 tests, and a working one-way sync from the tablet.
Nothing in the repository recorded why. `system-design.md` still says
"the backend, *once built*" in the future tense; ADR-001 still reads as
though none of it exists.

This ADR exists because that gap is the expensive kind. The code is
self-evident; the reasoning behind building it early is not, and in six
months it would be unrecoverable.

Three forces moved the decision, and only one of them is about the gym.

### 1. The project is also a portfolio piece

This is the driver ADR-001 could not have captured, because ADR-001 is
written from the gym's point of view and this one is not.

RackIn has a second audience: engineers evaluating the author's work. For
that audience, an offline-only React app backed by IndexedDB demonstrates
frontend and product judgement and stops there. It shows no schema design,
no migration discipline, no transaction boundaries, no idempotency under
retry, no API contract, no test pyramid on the server side.

Those are not decorations added to look impressive. They are the specific
competencies the offline-first architecture happens to hide, and the
backend is where they become visible and reviewable.

This is a legitimate architectural driver, not a compromise of one. It is
recorded plainly here rather than dressed up as a technical necessity,
because a reviewer who spots the mismatch between ADR-001's "defer this"
and a fully built backend will trust the honest answer more than a
retrofitted one.

### 2. The tablet is the only copy of the data

This one *is* about the gym, and ADR-001 already conceded it — it just
accepted the risk rather than solving it.

`system-design.md` §4 states the tablet is the single point of failure for
daily operation, with the paper logbook as the fallback. The README says
the same to the gym directly: lose the tablet and the check-in and payment
history goes with it.

For a check-in log that is tolerable. For **payment records** it is not,
and the difference had been understated. A gym that cannot say who paid
what, and when, has lost something it cannot reconstruct from memory or
from a logbook page that only records attendance. The backend turns a
lost tablet from data loss into an inconvenience.

### 3. An owner-facing dashboard is planned

The gym owner currently sees the business only through the tablet at the
front desk — which means physically standing at it, during opening hours,
in the room. The intended next surface is a dashboard: who is using the
gym, how many, which days are busy, who has lapsed.

That is a **read** surface over exactly the data the tablet already
produces, and it cannot exist without a server-side copy of it. No amount
of local-first design puts a dashboard on the owner's phone. This is the
first requirement in the project that a backend does not merely improve
but is strictly necessary for.

## Decision

**Build the backend now, and keep it non-load-bearing.**

The tablet remains the source of truth. Sync remains one-way, tablet →
backend. No user-facing flow acquires a network dependency, and the
backend's availability continues to have zero effect on the front desk.
ADR-001's core guarantee is preserved in full — what changes is only
*when* the sync target gets built, not what the tablet promises without it.

## Options Considered

### Option A: Follow ADR-001 — defer the backend until the pilot proves out

| Dimension | Assessment |
|-----------|------------|
| Complexity | Lowest — no server, no schema, no deployment |
| Cost | $0 |
| Scalability | Irrelevant until a second device exists |
| Team familiarity | High — one codebase, one language |

**Pros:** Smallest possible surface to finish and test; honours the
decision already recorded; no infrastructure to maintain during a pilot
that might fail for reasons unrelated to it.

**Cons:** Leaves payment history on a single unbacked device for the
duration of the pilot; blocks the dashboard entirely; and leaves the
portfolio audience with no view of server-side work. Deferring also gets
more expensive over time, not less — retrofitting idempotency keys and
client-assigned ids into a schema and a client that never had them is
substantially harder than designing for them up front, which is precisely
why ADR-001 put `clientUuid` on every local record from day one.

### Option B: Build the backend now as an optional sync target (chosen)

| Dimension | Assessment |
|-----------|------------|
| Complexity | Medium — a second codebase, but no coupling into the critical path |
| Cost | $0 locally; a free-tier Postgres when the dashboard needs hosting |
| Scalability | Ample; a single gym's volume is trivial for Postgres |
| Team familiarity | Medium — Spring Boot and JPA are the point of the exercise |

**Pros:** Solves durability and unblocks the dashboard while preserving
ADR-001's offline guarantee untouched; the sync layer is exercised against
real data during the pilot rather than written blind afterwards; the
server-side competencies become visible.

**Cons:** Two codebases to keep in step; a schema that must stay honest
about the tablet's assumptions (client-assigned ids, client timestamps,
idempotency keys); and real risk of the backend quietly becoming
load-bearing if nobody defends the boundary.

### Option C: Make the backend the source of truth

| Dimension | Assessment |
|-----------|------------|
| Complexity | Lower in the abstract — one authoritative store, no sync |
| Cost | Requires reliable hosting *and* reliable gym wifi |
| Scalability | Best of the three |
| Team familiarity | Highest — the conventional shape |

**Pros:** No sync layer, no idempotency, no id allocation problem, no
divergence. Multi-device and the dashboard both fall out for free.

**Cons:** Fails the founding constraint. The gym has no reliable wifi
(ADR-001), so this trades a working front desk for an architecturally
tidier one. Rejected outright — it is the option that makes the product
stop working on the days it matters.

## Trade-off Analysis

The real trade-off is **scope discipline vs. compounding cost**.

Option A is the disciplined answer and would be right if durability and
the dashboard were speculative. They are not: payment records are already
being captured on an unbacked device, and the dashboard is a stated
intent rather than a hypothetical.

The decisive argument is that the expensive parts of sync are *already
paid for*. ADR-001 required `clientUuid` on every local record precisely
so sync could be added later without a rewrite — "cheap to add now,
expensive to retrofit," as `db.js` puts it. Building the backend now
collects on that investment while the reasoning is fresh, rather than
letting the two sides drift until the assumptions no longer line up.

What this ADR explicitly does **not** trade away is the offline guarantee.
Option C is where that would happen, and it is rejected for exactly that
reason. The line to defend is not "should there be a backend" but "may any
user-facing flow ever wait on it" — and the answer to the second stays no.

## Consequences

- **Easier:** payment history survives a lost tablet; the dashboard has
  something to read from; the sync path gets exercised with real pilot
  data instead of being written from scratch after the fact.

- **Harder:** two codebases must agree on a contract the tablet cannot
  renegotiate offline. Every backend change must now ask what a tablet
  that has been offline for a week will send. This is already visible —
  the backend had to learn to accept client-assigned ids, client
  timestamps, and repeated `clientUuid`s, none of which a
  conventionally-designed API would do.

- **A boundary that needs actively defending.** The backend existing makes
  it tempting to read from it. The moment any front-desk flow does, the
  offline guarantee is gone and ADR-001 is void in practice while still
  reading as true. The dashboard is a *separate surface* for this reason,
  not a screen inside the tablet app.

- **The dashboard changes what sync failures cost.** Today a record that
  fails to sync is invisible and harmless: the tablet has it, the tablet
  is authoritative, nobody reads the backend. Once an owner reads a
  dashboard, a silently rejected record becomes a **wrong number shown to
  the person making decisions from it** — undercounted visits, a member
  missing from a revenue total. Sync failures are silent to staff by
  design (PRD 4.10) and must stay that way; but the dashboard needs to
  surface queue health to the owner, or it will confidently report figures
  that are quietly incomplete.

- **The dashboard needs authentication; the sync API currently has none.**
  The endpoints are unauthenticated, which is defensible for a
  single-device push target on a local network and is not defensible for
  anything reachable from the owner's phone. This must be solved before
  the dashboard ships, not alongside it.

- **The dashboard does not worsen the id-allocation problem.** It is
  read-only, so it adds no second writer and does not trigger OD-8. That
  problem stays scoped to a second *tablet*.

## Action Items

1. [x] Build the backend: schema, migrations, endpoints, tests
2. [x] Make every write idempotent on `clientUuid`, so a retried push
       cannot duplicate a member, a visit, or a payment
3. [x] Accept the tablet's own member ids and timestamps, so a record
       synced late lands as the record it actually was
4. [x] Ship one-way push from the tablet, off by default and additive
5. [x] Record this decision (this ADR) and update ADR-001 to point at it
6. [ ] **Authentication before any internet-reachable deployment** — the
       API is currently open, which the dashboard makes untenable
7. [ ] **Solve id allocation before a second tablet** (OD-8 in
       `frontend-spec.md`). Not required by the dashboard; required by any
       second writer
8. [ ] **Surface sync queue health to the owner** — depth and age of the
       outbox, so the dashboard can say "these figures are current" or
       "this tablet has not reported since Tuesday" rather than silently
       under-reporting
9. [ ] Design the dashboard as its own surface, reading the backend
       directly. It must not become a tab inside the tablet app, which
       would put a network dependency in front of the front desk
