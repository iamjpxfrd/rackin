# PRD — Rackin (Gym Check-In System)

**Status:** Draft v1
**Based on:** MVP Overview, ADR-001 (Architecture), Design System
**Owner:** TBD
**Date:** 2026-07-12

## 1. Purpose

Replace a single province gym's paper sign-in logbook with a
staff-operated tablet app. The core value isn't digitizing the
logbook itself — it's surfacing what a logbook can never show: who's
stopped coming, whose membership has quietly expired, and what
attendance looks like over time.

## 2. Goals / Non-goals

### Goals (pilot)

- Staff can check a member in faster and more reliably than writing
  in a logbook.
- The owner gets automatic visibility into lapsed members and
  expiring memberships without manual tallying.
- The system works with zero reliable connectivity and zero cost.
- Validate, at one real gym, whether this is worth building further.

### Non-goals (explicitly out of scope for this PRD)

- Member-facing app, login, or self-service check-in
- Multi-gym / multi-device support
- Online payment processing
- Automated billing reminders or auto-renewal
- Class scheduling or trainer booking

## 3. Users

**Primary user: front-desk staff.** Not technical, operating a single
shared tablet, often mid-conversation with a member while using the
app. Needs speed and zero ambiguity above all else.

**Secondary user: gym owner.** Reviews lapsed/expiring lists,
occasionally registers members personally, cares about whether the
tool is actually being used over the logbook.

**Not a user in this MVP:** gym members. They interact with staff, not
the device — except for the optional passive step of holding up a QR
card.

## 4. User Stories & Acceptance Criteria

### 4.1 Check-in — numpad

**As staff, I want to check a member in by entering their number, so
that I can log a visit in seconds.**

- AC1: Entering a valid member number and confirming logs a check-in
  with a timestamp.
- AC2: On success, a confirmation shows the member's name and their
  visit count for the current month.
- AC3: Entering a number with no matching member shows a clear error
  ("No member found for #114 — try search by name") and does not
  log anything.
- AC4: The check-in is written to local storage immediately; no
  network call is required for this to succeed.

**Priority: Must-have**

### 4.2 Check-in — QR

**As staff, I want to scan a member's QR card as an alternative to
typing their number, so that check-in is faster when a card is
available.**

- AC1: A successful scan resolves to the same member lookup and
  confirmation flow as numpad entry (AC1–AC2 above), with `method`
  recorded as `qr`.
- AC2: If the camera is unavailable, the code is unreadable, or the
  scan fails for any reason, staff can immediately fall back to
  numpad or search with no dead end or app restart required.
- AC3: A member with no QR card is never blocked — numpad remains
  fully functional for every member at all times.

**Priority: Must-have (per ADR-001 — ships alongside numpad, not
after it, since both share one lookup function)**

### 4.3 Check-in — name search

**As staff, I want to search by name when I don't know or can't read
a member's number, so that check-in never dead-ends.**

- AC1: Typing a partial name filters and shows matching members.
- AC2: Selecting a result logs a check-in identical to numpad/QR
  (AC1–AC2 in 4.1), with `method` recorded as `search`.

**Priority: Must-have**

### 4.4 Today's activity feed

**As staff, I want to see today's check-ins as they happen, so that I
have the live-updating equivalent of the old logbook page.**

- AC1: The feed shows timestamp, member name/number, and check-in
  method, most recent first.
- AC2: New check-ins appear without a manual refresh.

**Priority: Must-have**

### 4.5 Lapsed members list

**As the owner, I want to see who hasn't checked in for 14+ days, so
that I can follow up before they quietly stop coming for good.**

- AC1: The list shows any member with no check-in in the last 14 days
  (configurable threshold), sorted oldest-last-visit-first.
- AC2: Each entry shows the member's name, number, and last check-in
  date (or "never checked in" if applicable).
- AC3: The list updates automatically as check-ins happen — no manual
  recalculation.

**Priority: Must-have — this is the single feature a paper logbook
cannot provide, and the primary reason this system is worth building.**

### 4.6 New member registration

**As staff, I want to register a new member and record their first
payment in one flow, so that I don't need a separate system or
double entry.**

- AC1: Registration requires name and plan type (weekly or monthly)
  at minimum.
- AC2: A member number is assigned automatically on registration.
- AC3: The initial payment (amount, method: cash or transfer) is
  recorded as part of the same flow, not a separate step.
- AC4: A QR code is generated for the new member automatically,
  available to view/print on demand (not required to complete
  registration).
- AC5: Phone number may optionally be captured at registration, to
  support the owner following up on lapsed members. Not required to
  complete registration.

**Priority: Must-have**

### 4.7 Record payment (existing member)

**As staff, I want to record a renewal payment for an existing
member, so that their membership status updates without a separate
system.**

- AC1: Recording a payment extends `coversUntil` based on the
  member's plan duration from the payment date.
- AC2: Payment method (cash/transfer) is recorded.

**Priority: Must-have**

### 4.8 Membership status

**As staff or the owner, I want to see at a glance whether a member's
plan is active or expired, so that I don't have to calculate it
manually.**

- AC1: Status (`active`/`expired`) is derived automatically from the
  most recent payment's `coversUntil` date — never manually set.
- AC2: Status is visible on the member list and member profile.

**Priority: Must-have**

### 4.9 Expiring-soon list

**As the owner, I want to see who's expiring within 7 days, so that
staff can give a heads-up before a membership lapses.**

- AC1: The list shows members whose `coversUntil` falls within the
  next 7 days (configurable threshold).
- AC2: Sorted soonest-to-expire first.

**Priority: Must-have**

### 4.10 Offline operation

**As staff, I want the app to work with no internet connection, so
that gym operations never depend on wifi reliability.**

- AC1: Every feature above (4.1–4.9) functions fully with the device
  offline.
- AC2: No feature displays a network error or blocks staff action due
  to lack of connectivity.

**Priority: Must-have — this is a hard constraint, not a preference,
per ADR-001.**

## 5. Explicitly deferred (post-pilot candidates)

These are acknowledged as reasonable future ideas, intentionally
excluded now so the MVP stays small enough to finish and test:

| Feature                                     | Why deferred                                                     |
| ------------------------------------------- | ---------------------------------------------------------------- |
| Cloud sync to backend                       | No pilot need yet; ADR-001 designs for it but doesn't require it |
| Second device / multi-gym                   | Single-gym pilot first                                           |
| Member-facing app                           | Violates "member needs nothing" pilot constraint                 |
| Online payment processing                   | Recording ≠ processing; out of scope                             |
| Automated billing reminders                 | Not needed to validate core value                                |
| Class scheduling / trainer booking          | Unrelated to sign-in/membership core loop                        |
| Additional plan types (annual, punch cards) | Data model supports it later; not needed for pilot               |

## 6. Success metrics (pilot validation)

Per the MVP overview's validation approach — observed, not
self-reported:

1. **Adoption:** staff use the app without being reminded to, within
   the first week.
2. **Displacement:** the paper logbook visibly falls out of use.
3. **Owner action:** when shown the lapsed-members list, the owner
   acts on at least one entry (reaches out to a member) rather than
   just acknowledging it.

If these are genuinely true, that's the signal to invest in cloud
sync, a second device, or further features. If not, that's equally
valuable to know before building further.

## 7. Open questions

- Who prints/manages QR cards operationally — is this a one-time
  batch job or done per new member at registration?

**Resolved:** phone number is now optionally captured at
registration (see 4.6 AC5); lapsed/expiring thresholds stay fixed at
14/7 days for the pilot, not staff-configurable. See
`rackin-decision-phone-thresholds.md` for reasoning.

## 8. Dependencies

- Design system (done) — defines the visual language for the screens
  this PRD's stories will need.
- ADR-001 (done) — defines the technical constraints (offline-first,
  numpad/QR/search parity) these stories are written against.
- App Flow (next) — will map each user story above to a concrete
  screen-to-screen path.
