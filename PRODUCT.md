# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Primary: front-desk staff.** Not technical, operates a single shared tablet at the gym's front desk, often mid-conversation with a member while using the app. Needs speed and zero ambiguity above all else.

**Secondary: gym owner.** Reviews lapsed/expiring lists, occasionally registers members personally, cares whether the tool is actually displacing the paper logbook.

**Not a user in this pilot: gym members.** They interact with staff, not the device — except for the optional passive step of holding up a QR card.

## Product Purpose

Replaces a single gym's paper sign-in logbook with a staff-operated tablet app. The core value isn't digitizing the logbook itself — it's surfacing what a logbook can never show: who's stopped coming, whose membership has quietly expired, and what attendance looks like over time.

Pilot success is observed, not self-reported: staff use the app without being reminded to within the first week, the paper logbook visibly falls out of use, and — shown the lapsed-members list — the owner acts on at least one entry rather than just acknowledging it.

## Positioning

Automatic lapsed-member detection (no check-in in 14+ days) and expiring-soon detection (plan lapses within 7 days), surfaced without manual tallying, is the single thing a paper logbook can never do — and the primary reason the system is worth building. A product built as "digitize the logbook" only, or one requiring member smartphones or logins, could not truthfully claim this: RackIn works with zero member-side technology and zero reliable connectivity.

## Operating Context

- One shared tablet at the front desk; one staff member enters data at a time, often while talking to the member being checked in.
- Target device: a budget Android tablet — an older/entry-level WebView browser, primarily portrait orientation. (Confirmed assumption for design purposes, not a specific committed model.)
- No reliable wifi at the gym. The app must work fully with the device offline; there is no "waiting for connection" state anywhere in the product.
- $0 budget: no paid infrastructure. The frontend is a static build served from the tablet itself for the pilot.
- Single gym, single device for the pilot. Multi-device/multi-gym support is explicitly out of scope until the pilot proves the concept.
- The Spring Boot + PostgreSQL backend is an optional sync target, not a dependency for any core flow — every feature must work identically with the backend absent or unreachable.
- The pilot is still hypothetical/generic at this stage: no specific gym, owner, or member data is committed yet.

## Capabilities and Constraints

- Check-in by numpad (primary, always available), QR scan (optional accelerant using the tablet's own camera, never a member's device), or name search — all three resolve to the same `checkInMember(memberId, method)` lookup, so no method is ever a dead end and no member is ever blocked from checking in.
- Today's activity feed: live-updating list of check-ins (timestamp, member, method), most recent first, no manual refresh.
- Lapsed members list: members with no check-in in 14+ days (fixed threshold for the pilot, not staff-configurable), sorted oldest-last-visit-first; members who never checked in sort as oldest.
- Expiring-soon list: members whose plan lapses within 7 days (fixed threshold), sorted soonest-first.
- New member registration + first payment in one flow, not two systems: name and plan type (`session` | `weekly` | `monthly`) required; amount and payment method (`cash` | `transfer`) recorded in the same action; member number auto-assigned sequentially (e.g. `"1001"`); QR code generated automatically; phone number optional, captured to support lapsed-member follow-up. The name field completes from names already on the roster — names repeat at one gym, and consistent spelling is what lets search find them later.
- `session` is a single-day drop-in (1 day of coverage): a sale, not a membership. Drop-ins are excluded from the expiring-soon list, since a one-day plan is inside the 7-day window from the moment it is sold and nothing is saved by calling someone whose plan was only ever one day.
- Choosing `transfer` as the payment method displays the gym's own receiving QR (a static image the gym supplies) so the member can scan and pay from their phone. This does not process a payment: RackIn still only records that one happened, and staff confirm manually.
- Record payment for an existing member: extends `coversUntil` from the payment date + plan duration (session = 1 day, weekly = 7 days, monthly = a flat 30 days, not a calendar month). Always calculated from the payment date, never extended from a prior `coversUntil`, even on early renewal — a deliberate pilot simplification.
- Membership status (`active` / `expired`) is always derived from the latest payment's `coversUntil`; never manually set.
- Staff attribution: shifts change, so every check-in and payment records who was on the desk. Staff sign in once per shift from the top bar and every record is stamped automatically; the payment sheet additionally shows who it will credit with a one-tap override, so a handover nobody remembered to record surfaces at the one moment where getting it wrong costs the gym money. The gym enters its own staff names — none are invented. Someone who leaves is retired, never deleted, since their name still has to resolve on the payments they took.
- Attribution is **not authentication**: there is no password, and adding one would be counterproductive. A PIN on a shared front-desk tablet gets shared within a day, after which every record carries a name that may be false — worse than no attribution, because the owner trusts it precisely because it looked like security. Nobody signed in is a legitimate state: records simply carry no name, and no flow is ever blocked for want of one. Real authentication belongs with the owner dashboard, where the threat is someone outside the gym (ADR-002).
- IndexedDB (via Dexie) is the on-device source of truth. Nothing in any core, staff-facing flow waits on, checks the status of, or degrades based on network or backend availability.
- Sync to the backend, when present, is one-way (tablet → backend), batched, triggered on the browser's `online` event rather than polled, and idempotent via a client-generated UUID per record — a retried or interrupted sync must never duplicate a check-in or payment. Sync failures are silent to staff; the queue stays intact and retries automatically.
- Explicitly out of scope for the pilot: member-facing app or login, multi-gym/multi-device support, online payment processing (RackIn records that a payment happened; it does not process one), automated billing reminders/auto-renewal, class scheduling/trainer booking, additional plan types beyond session/weekly/monthly.
- No specific accessibility standard or user need has been established for this pilot.

## Brand Commitments

- Product name: **RackIn** — deliberately chosen because a weight rack is the thing every gym has and every member touches (the front-desk equivalent of home base), and "rack in" mirrors how staff already talk ("let me rack you in"). Chosen specifically to avoid sounding like a generic SaaS product name.
- MIT licensed; copyright "RackIn contributors."
- A design system already exists at `docs/design/design-system.md`, recording prior visual decisions made outside this file. This file does not establish or alter visual direction.

## Evidence on Hand

- No real gym, owner, staff, or member data exists yet — the pilot is still hypothetical/generic. Do not fabricate a gym name, testimonials, case studies, or sample member data; use clearly-labeled placeholder content where an example is needed.
- Existing web client scaffold: Vite + React 19 + Tailwind CSS 4, with a local persistence layer already sketched at `web_client/db/db.js` (Dexie schema for `members`, `payments`, `checkIns`, deliberately matching the backend schema field-for-field).
- Existing backend: a Spring Boot 3.5 sync API (register member, check-in, payments, lapsed/expiring queries) is implemented, tested, and running against PostgreSQL — see `backend/`. It is additive infrastructure for later, not something the frontend pilot depends on.

## Product Principles

1. Offline is a hard requirement, not graceful degradation — every core flow works with zero network, always, with no "waiting for connection" state.
2. No check-in path ever dead-ends — numpad, QR, and search fall back to each other instantly, on the same screen, with no separate error modal or re-navigation.
3. One shared domain function per action (`checkInMember`, `registerMember`, `recordPayment`, `getLapsedMembers`, `getExpiringMembers`) underlies every input method and every screen that triggers it — no duplicated business logic per entry point.
4. The backend is additive, never a dependency — the tablet's local storage is the system of record for the pilot.
5. Keep the pilot small enough to finish and test: resist scope creep into deferred features (member app, multi-gym, auto-billing, class scheduling) until the pilot itself validates the core loop.

## Accessibility & Inclusion

No specific accessibility standard or user need has been established for this pilot; design for reasonable baseline usability (legible touch targets, sufficient contrast) without a formal compliance target.
