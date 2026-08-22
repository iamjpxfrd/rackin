# Frontend Spec Sheet — Remaining Screens

**Status:** Draft v1 (pre-implementation)
**Branch:** `frontend/member-screens`
**Covers:** Follow Up, Members, Member Profile, Record Payment, New Member (+ Registration Success)
**Authority:** `PRODUCT.md` (product truth) · `DESIGN.md` (visual system) · `docs/design/app-flow.md` (flows)
**Already built, not respecified here:** Check-In screen (numpad / QR / search), Activity Feed, Confirmation Card, Tab Bar, Top Bar.

This document is the contract an implementer builds against. Anything it does not
specify and does not list under §11 Open Decisions should follow `DESIGN.md`
directly. Nothing here invents gym data, prices, or member records — placeholder
content in wireframes is marked as such.

---

## 1. Job and audience

**Mode: Operate.** The visitor completes a task; scanability, consistency, and the
real usage scene outrank expression. Brand lives in precise details, not decoration.

Two distinct people reach these five screens, in two different postures:

| | Front-desk staff | Gym owner |
|---|---|---|
| **Posture** | Standing, one-handed, mid-conversation with a member | Seated or leaning, unhurried, reviewing |
| **Screens** | New Member, Record Payment, Members (lookup) | Follow Up, Member Profile |
| **Needs** | Zero ambiguity, no re-entry, finish in one pass | To scan a list and decide *who to call* |
| **Failure** | Wrong amount saved, or a flow that needs a second screen | A list that reads like a spreadsheet and gets ignored |

The Check-In screen is used every twenty seconds; these five are used a few times a
day. That difference is the design lever: **these screens can afford to be read,
where Check-In had to be punched.** They stay quiet so the numpad stays the brand.

---

## 2. Outcome and proof

The pilot's stated success condition is not "staff logged check-ins." It is: *shown
the lapsed-members list, the owner acts on at least one entry rather than just
acknowledging it* (`PRODUCT.md` — Product Purpose).

That makes **Follow Up the screen the pilot is judged on.** Every other screen here
exists to feed it (registration creates members, payments update coverage) or to act
on it (profile → record payment). Spec priority follows that order.

**Product-specific truth these screens carry:** a paper logbook can tell you who came
in. It cannot tell you who *stopped* coming, and it cannot tell you that on its own,
without anyone tallying. Follow Up is that claim made visible.

---

## 3. Selected direction

Inside the established world (`DESIGN.md` — "The Gym Equipment Control Panel"). No
new visual world; three structural decisions extend it.

### 3.1 The number carries the row *(structural thesis)*

The Arm's-Length Rule says numerals a staff member must read at a glance never drop
below the Numeral role. On Follow Up, the number *is* the content: the owner is
scanning a column of urgencies, not reading sentences.

Every Follow Up row leads with a **fixed-width numeral gutter** — one big Archivo
Black number (days since last visit, or days until coverage ends) with a small
caption beneath it. The eye runs down the gutter; names are the second read.

This is the one place the quiet screens speak in the brand's numeral voice. It stays
meaningful because it is used **only** where a number expresses urgency:

- Follow Up rows: **yes** — the number is the point.
- Member Profile header: **yes** — days remaining / days expired.
- Members roster rows: **no** — a roster has no urgency number. Member `#id` stays
  Mono, status stays a badge.
- Registration Success: **yes** — the assigned member number is the one thing staff
  must read and transcribe onto a physical card.

### 3.2 Prevention above cure *(the merge)*

Follow Up carries two sections, in this order:

1. **Needs renewal** — coverage ends within 7 days, or has already ended. Ranked
   worst-first (already-expired above merely-expiring), since not every case here
   is still preventable — an already-lapsed member's row is a recovery call, not a
   prevention one, same job as "stopped coming" below but sooner to matter because
   they may still be walking in unpaid.
2. **Stopped coming** — no check-in in 14+ days. Acting here *recovers* one.

Needs-renewal sits first because it is the section most likely to contain a call
that changes the outcome before it happens. Both answer the same question — *who
needs a call today* — so they belong on one screen, and the Members tab stays what
its name promises: the roster.

### 3.3 One quiet yellow per screen

`DESIGN.md`: yellow means "press this," nothing else. On every screen here there is
exactly **one** yellow element — the single action that screen exists to enable
(Record Payment on the profile; Register on the new-member form; Done on success).
Follow Up and Members have **zero** yellow: they are read screens, and their rows are
the affordance. If a second yellow ever appears on one of these screens, the screen
has grown a second job and should be re-shaped instead.

### 3.4 Implementation consequence

- **No router library.** Navigation stays local state in `App.jsx`
  (`{ tab, detailMemberId }`), consistent with the current shape. A static offline
  build on a budget WebView does not need history management, and back-button
  behavior is not a requirement on a kiosk-posture tablet.
- **Member Profile is a screen, not a modal** — it holds two history lists and must
  scroll.
- **Record Payment is a bottom sheet over the profile** — it is a three-field action,
  the member's name and status must stay visible behind it as confirmation of *who*
  is being paid for, and a sheet puts the controls in thumb reach on a portrait
  tablet.

---

## 4. Scope and boundaries

### In scope

| # | Surface | Entry point |
|---|---|---|
| S1 | Follow Up (Expiring soon + Stopped coming) | Tab 2 |
| S2 | Members (roster + lookup) | Tab 3 |
| S3 | Member Profile | Row tap from S1 or S2 |
| S4 | Record Payment (sheet) | Button on S3 |
| S5 | New Member (registration + first payment) | Tab 4 |
| S6 | Registration Success (number + QR) | Completion of S5 |

### Untouched

Check-In screen, Numpad, QrScanner, SearchPanel, ActivityFeed, ConfirmationCard,
ErrorBanner, TopBar, TabBar internals, `frontend/db/db.js` schema, the entire
`backend/` tree, and the design tokens in `frontend/src/index.css`.

### Anti-goals

Things that would make the result feel wrong even if it looked polished:

- **No filters, sorts, or date-range controls** on Follow Up or Members. Thresholds
  are fixed for the pilot; a controls bar would imply configurability that does not
  exist and would slow the one scan the owner performs.
- **No dashboard.** No stat tiles, no charts, no "42 active members" hero row. This
  is a counter tool, not an analytics product, and no attendance-over-time
  visualization is in pilot scope.
- **No edit or delete member.** Not in `PRODUCT.md` capabilities. A profile is a
  record, not a form.
- **No confirm-discard dialogs** on the registration form. Staff are mid-conversation;
  a modal asking "are you sure you want to leave?" is exactly the interruption this
  product exists to remove.
- **No "syncing…", "offline", or connectivity indicator anywhere.** Product Principle
  1 — there is no waiting-for-connection state in this product, including a passive
  badge that implies one.
- **No skeleton shimmer.** Reads are local IndexedDB and effectively instant; shimmer
  would animate a wait that does not exist. See §9 for the loading rule that matters.

---

## 5. Shared foundations

### 5.1 Navigation model

```
App state:  { tab: "checkin"|"followup"|"members"|"new",
              detailMemberId: string | null }

Tab tap          → set tab, detailMemberId = null   (always exits a detail view)
Row tap on S1/S2 → detailMemberId = member.id       (tab unchanged)
Back on S3       → detailMemberId = null            (returns to originating tab)
Done on S6       → tab = "checkin"                  (per app-flow.md §7)
```

The tab bar stays visible and live on the Member Profile — the One-Tap-Away Rule has
no exception. Tapping the current tab while a profile is open returns to that tab's
list, which is also what Back does.

### 5.2 Tab bar change

Tab 2 is renamed from **Lapsed** to **Follow Up**, icon `Clock` → `PhoneCall`
(`lucide-react`). "Lapsed" names a state; the tab now holds two states and one job.
"Follow Up" names the job — and the pilot's success condition is the owner *acting*,
so the tab should say what the action is. Monochrome steel, per the Meaning-Only
Color Rule; the icon does not take an accent color.

### 5.3 New shared components

Built once in `frontend/src/components/`, used across S1–S6:

| Component | Purpose | Spec |
|---|---|---|
| `StatusBadge` | Active / Expired / Expiring soon | `DESIGN.md` — Status badge. Dot + text label, tinted fill. Never color-only. |
| `ScreenHeader` | Screen title row | Headline (24/700) + optional trailing count in Mono `steel-700`. 56px tall, no back arrow (tabs are the back). |
| `SectionHeader` | Eyebrow inside a screen | Label role (13/600, uppercase, 0.08em) `steel-700` + count. Matches the existing "Today's Activity" eyebrow. |
| `UrgencyRow` | Follow Up row | §6.1. 88px tall, numeral gutter + name block + badge. |
| `MemberRow` | Roster / history row | 56px, mono `#id`, Body name, trailing badge. Extends the existing activity-feed-row spec. |
| `EmptyState` | Zero-result panel | Centered, Body `steel-700`, one sentence + optional one action. No illustration. |
| `Field` | Labeled text/number input | `DESIGN.md` — Inputs. 56px min height, Label-role caption above, error text below in `rubber-red`. |
| `ChoiceGroup` | 2-option segmented control | Two 56px buttons, 6px radius, no pill. Selected: `ink-900` fill / white text. Unselected: white fill, `steel-300` border, `steel-700` text. Same pattern already used by the Check-In mode switcher. |
| `Sheet` | Bottom sheet | §6.4. `surface-white`, 12px top radius, Card-elevation, `ink-900/40` scrim, focus-trapped. |
| `PressKey` | Primary yellow action | Extracted from the existing `Numpad` confirm key: 72px, `signal-yellow`, Key-rest → Key-pressed on press, `steel-300` when disabled. |
| `QrCard` | QR display + print | §6.6. |

`PressKey` should be extracted from `Numpad.jsx` rather than reimplemented — the
mechanical press is a brand signature and must be identical everywhere it appears.

### 5.4 Domain layer contracts

Product Principle 3: one shared domain function per action, no duplicated business
logic per entry point. Screens call these and hold no rules of their own.

```
frontend/src/domain/constants.js
  LAPSED_AFTER_DAYS      = 14
  EXPIRING_WITHIN_DAYS   = 7
  PLAN_DAYS              = { weekly: 7, monthly: 30 }   // 30 flat, not calendar
  CURRENCY_SYMBOL        = <see §11 OD-2>
  HISTORY_PAGE_SIZE      = 20

frontend/src/domain/membership.js
  deriveStatus(latestPayment, now) -> {
    status: "active" | "expired",        // never stored, always derived
    coversUntil: string | null,          // ISO; null when never paid
    daysRemaining: number | null,        // negative when expired
    isExpiringSoon: boolean              // active && daysRemaining <= 7
  }
  computeCoversUntil(paidAtIso, planType, currentCoversUntil?) -> string
    // max(currentCoversUntil, paidAtIso) + PLAN_DAYS[plan]

frontend/src/domain/members.js
  registerMember({ name, phone?, planType, amount, paymentMethod })
    -> { member, payment }               // one transaction: member + first payment
  getMemberProfile(memberId)
    -> { member, status, coversUntil, daysRemaining, isExpiringSoon,
         checkIns, payments, visitCountThisMonth }
  listMembers() -> member[]              // name-ascending, status attached
  // findMembersByName() already exists in domain/checkIn.js — reuse, do not fork.

frontend/src/domain/payments.js
  recordPayment({ memberId, amount, method })
    -> { payment, coversUntil, status }  // coversUntil stacks on remaining coverage
  getLastPaymentAmount(memberId) -> number | null

frontend/src/domain/followUp.js
  getLapsedMembers(now)   -> [{ member, lastVisitAt|null, daysSinceVisit|null, status }]
  getExpiringMembers(now) -> [{ member, coversUntil, daysRemaining, status }]
```

Binding rules for the implementer:

- **`registerMember` writes member + payment atomically** (Dexie transaction). A
  member row with no payment row is a corrupt record — status is derived from
  payments, so such a member would read as permanently expired.
- **`coversUntil` extends from `max(currentCoversUntil, paymentDate) + planDays`** —
  a renewal made before coverage lapses stacks on top of the remaining time; a
  lapsed member (or a first-ever payment, no prior `coversUntil`) starts fresh from
  the payment date (`PRODUCT.md`). The UI must show the resulting date before the
  staff member confirms (§6.4, §6.5) so this rule is never a surprise.
- **Never-visited members sort as oldest** in `getLapsedMembers` and carry
  `daysSinceVisit: null`.
- Every write generates a `clientUuid` via `generateClientUuid()` — already required
  by the schema for idempotent sync later.

---

## 6. Screen specs

Wireframes are tablet **portrait** (the pilot's primary orientation), ~800px wide.
Landscape notes follow each where behavior differs. **All names, numbers, and amounts
in wireframes are placeholders** — no real gym data exists yet.

### 6.1 S1 — Follow Up

The screen the pilot is judged on.

```
┌────────────────────────────────────────────────────────────┐
│ RACKIN                                      Your Gym Name  │ 48
├────────────────────────────────────────────────────────────┤
│  Follow Up                                            11   │ 56  Headline + total, Mono
├────────────────────────────────────────────────────────────┤
│  NEEDS RENEWAL                                         4   │ 40  SectionHeader
│ ┌────────────────────────────────────────────────────────┐ │
│ │  2   │ Placeholder Name              #1004            │ │
│ │ days │ Monthly · 0917 000 0000       [Expiring soon]  │ │ 88  UrgencyRow
│ ├──────┼─────────────────────────────────────────────────┤ │
│ │  5   │ Placeholder Name              #1011            │ │
│ │ days │ Weekly · no phone             [Expiring soon]  │ │ 88
│ └──────┴─────────────────────────────────────────────────┘ │
│                                                             │
│  STOPPED COMING · 14+ DAYS                             7   │ 40
│ ┌────────────────────────────────────────────────────────┐ │
│ │  31  │ Placeholder Name              #1002            │ │
│ │ days │ Monthly · 0917 000 0000       [Expired]        │ │ 88
│ ├──────┼─────────────────────────────────────────────────┤ │
│ │  23  │ Placeholder Name              #1007            │ │
│ │ days │ Weekly · 0917 000 0000        [Active]         │ │ 88
│ ├──────┼─────────────────────────────────────────────────┤ │
│ │  —   │ Placeholder Name              #1009            │ │
│ │never │ Monthly · no phone            [Active]         │ │ 88
│ └──────┴─────────────────────────────────────────────────┘ │
│                        (scrolls)                            │
├────────────────────────────────────────────────────────────┤
│  [Check-In]    [Follow Up]▔    [Members]     [+ New]        │ 64
└────────────────────────────────────────────────────────────┘
```

**UrgencyRow anatomy**

- **Gutter, 72px fixed width**, right-aligned, `steel-300` right divider:
  Numeral role (Archivo Black 40/800, `ink-900`) + Caption beneath in `steel-700`.
  Expiring section: days remaining, caption `days` / `today` / `tomorrow`.
  Stopped-coming section: days since last visit, caption `days`.
  Never visited: em-dash at Numeral size, caption `never`.
- **Body:** member name (Body 18/500, truncate with ellipsis past one line) on line 1;
  plan type + phone (Caption 14/400, `steel-700`) on line 2. `no phone` in
  `steel-300` when absent — an owner scanning for who to call needs to see instantly
  that this one cannot be called.
- **Trailing:** `StatusBadge`. Note the row above showing `23 days / Active`: a member
  can be paid up and still have stopped coming. That combination is the most valuable
  row on the screen and the badge must not be suppressed to make the list look tidy.
- **Whole row is the tap target** → Member Profile. No chevron, no per-row buttons.
- **Phone is displayed as text, not a `tel:` link.** The tablet has no reliable
  connectivity and may have no telephony; a link that does nothing is worse than
  text the owner reads off to their own phone.

**Ordering:** Expiring soon — soonest first. Stopped coming — longest absence first,
never-visited sorting as oldest (i.e. top).

**Overlap:** a member can qualify for both sections and appears in both. This is
correct, not a bug: they are two different reasons to call, and de-duplicating would
hide the more urgent one. Do not add a "shown twice" affordance.

**States**

| State | Treatment |
|---|---|
| Both sections empty | One EmptyState, no section headers: *"Nobody needs a call today."* / caption: *"Members show up here when their plan is ending or they've stopped coming."* |
| One section empty | Section header stays with count `0`; a single-line quiet row beneath: *"No one expiring in the next 7 days."* / *"No one's fallen off in the last 14 days."* |
| No members at all (first run) | EmptyState: *"No members yet."* + one text action → New Member tab. |
| Long lists (0–40 typical, no cap) | Whole screen scrolls; section headers scroll with content (no sticky headers — two competing sticky bars on an 8" screen costs more than it returns). |

**Landscape:** two columns — Expiring soon left, Stopped coming right, each scrolling
independently. Below `lg`, stacked as drawn.

---

### 6.2 S2 — Members

The roster. Its job is lookup, not analysis.

```
┌────────────────────────────────────────────────────────────┐
│ RACKIN                                      Your Gym Name  │ 48
├────────────────────────────────────────────────────────────┤
│  Members                                             128   │ 56
├────────────────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────────────────┐ │
│ │ 🔍  Search by name or number                           │ │ 56  reuses search field styling
│ └────────────────────────────────────────────────────────┘ │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ #1001   Placeholder Name                    [Active]   │ │ 56  MemberRow
│ │ #1002   Placeholder Name                    [Expired]  │ │ 56
│ │ #1003   Placeholder Name           [Expiring soon]     │ │ 56
│ │ #1004   Placeholder Name                    [Active]   │ │ 56
│ │                       (scrolls)                        │ │
│ └────────────────────────────────────────────────────────┘ │
├────────────────────────────────────────────────────────────┤
│  [Check-In]    [Follow Up]     [Members]▔    [+ New]        │ 64
└────────────────────────────────────────────────────────────┘
```

- **No Expiring Soon section here** — it moved to S1 (§3.2). The roster is a flat,
  name-ascending list with no pinned groups, so a name found by scrolling is always
  where the alphabet says it is.
- **Search filters in place** — matches name *or* member number, so staff holding a
  physical card can find someone the same way they would on Check-In. Empty query =
  full roster (unlike Check-In's `findMembersByName`, which deliberately returns
  nothing on an empty query; that behavior is correct there and wrong here, so
  Members filters `listMembers()` client-side rather than reusing it as-is).
- **No status filter chips.** See §4 anti-goals.
- Row tap → Member Profile.

**States:** no members → EmptyState *"No members yet."* + action to New Member.
No search match → *"No members match "<query>"."* with the roster still beneath the
field (never a blank screen). 50–400 members is the expected pilot range; the list is
plain scrolling, not virtualized, which is well within budget-tablet capability at
that size.

---

### 6.3 S3 — Member Profile

```
┌────────────────────────────────────────────────────────────┐
│ RACKIN                                      Your Gym Name  │ 48
├────────────────────────────────────────────────────────────┤
│  ‹ Back                                                    │ 56  text button, steel-700
├────────────────────────────────────────────────────────────┤
│  Placeholder Name                                          │     Display 32/700
│  #1004 · Monthly · 0917 000 0000                           │     Mono + Caption
│                                                             │
│  ┌──────┬───────────────────────────────┬───────────────┐  │
│  │  12  │ Covered until 10 Sep 2026     │  [Active]     │  │ 88  numeral gutter
│  │ days │                               │               │  │
│  └──────┴───────────────────────────────┴───────────────┘  │
├────────────────────────────────────────────────────────────┤
│  MEMBER QR                                                 │ 40
│ ┌────────────────────────────────────────────────────────┐ │
│ │        ▓▓▒▒▓▓                                          │ │
│ │        ▒▓▓▒▒▓      Tap to enlarge · Print card         │ │ 140
│ │        ▓▓▒▒▓▓                                          │ │
│ └────────────────────────────────────────────────────────┘ │
│                                                             │
│  RECENT VISITS                                        34   │ 40
│ │ 10 Aug  09:14   numpad                                  │ 56
│ │ 08 Aug  18:02   qr                                      │ 56
│ │ 05 Aug  09:31   search                                  │ 56
│ │ Showing 20 most recent                                  │ 40  caption, steel-700
│                                                             │
│  PAYMENTS                                              6   │ 40
│ │ 01 Aug   500  cash       covers to 31 Aug 2026          │ 56
│ │ 02 Jul   500  transfer   covers to 01 Aug 2026          │ 56
│ │ Showing 20 most recent                                  │ 40
│                        (scrolls)                            │
├────────────────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────────────────┐ │
│ │                   RECORD PAYMENT                       │ │ 72  PressKey, signal-yellow
│ └────────────────────────────────────────────────────────┘ │     sticky above tab bar
├────────────────────────────────────────────────────────────┤
│  [Check-In]    [Follow Up]     [Members]▔    [+ New]        │ 64
└────────────────────────────────────────────────────────────┘
```

- **Status block** carries the numeral gutter: days remaining when active, days
  expired when expired (caption `days ago`), `—` / `unpaid` when no payment exists.
  `Covered until <date>` in Body, badge trailing. This block is the answer to the
  question that brought the owner here.
- **Record Payment is sticky**, above the tab bar, always visible without scrolling —
  the profile's one job and its one yellow element.
- **Histories** are read-only, newest first, capped at `HISTORY_PAGE_SIZE` with a
  plain caption instead of pagination. Section headers show the true total, so a
  capped list never lies about the count.
- **Visits** show date + time (Mono) + method word; reuse the activity-feed method
  icons. **Payments** show date, amount, method, and the resulting `coversUntil` —
  the last column is what makes the stack-on-remaining-coverage rule legible in
  hindsight.
- **Back** returns to the originating tab (Follow Up or Members), which stays
  scrolled where it was. Losing scroll position on a 128-row roster would make the
  owner re-find their place after every call.

**States:** member with no payments → status block reads `unpaid`, badge `Expired`,
payments section shows *"No payments recorded."* Member with no visits → *"No visits
yet."* A deleted/missing member cannot occur (no delete exists), so no not-found
screen is specified.

**Landscape:** identity + status + QR in a left column, the two history lists right.

---

### 6.4 S4 — Record Payment (sheet over S3)

```
┌────────────────────────────────────────────────────────────┐
│ ░░░░░░░░  Member Profile, dimmed (ink-900/40)  ░░░░░░░░░░░ │
│ ░░░░░░░░  name + status stay readable above     ░░░░░░░░░░ │
├────────────────────────────────────────────────────────────┤
│  Record payment                                        ✕   │ 56
│  Placeholder Name · #1004 · Monthly                        │     Caption, steel-700
│                                                             │
│  AMOUNT                                                    │
│ ┌────────────────────────────────────────────────────────┐ │
│ │  <cur> 500                                             │ │ 56  inputmode="decimal"
│ └────────────────────────────────────────────────────────┘ │     prefilled: last amount
│                                                             │
│  METHOD                                                    │
│ ┌──────────────────────────┬─────────────────────────────┐ │
│ │          CASH            │          TRANSFER           │ │ 56  ChoiceGroup
│ └──────────────────────────┴─────────────────────────────┘ │
│                                                             │
│  ┌────────────────────────────────────────────────────────┐│
│  │ Covers until 10 Sep 2026 · 30 days from today          ││ 56  live preview,
│  │ Expired → Active                                       ││     chalk-50 panel
│  └────────────────────────────────────────────────────────┘│
│ ┌────────────────────────────────────────────────────────┐ │
│ │                    RECORD PAYMENT                      │ │ 72  PressKey
│ └────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

- **Amount prefills the member's last payment amount** when one exists — derived from
  their own history, not an invented price list. Blank on first payment. The field is
  selected-on-focus so overtyping is one action.
- **Live coverage preview** updates on every keystroke and is the sheet's most
  important element after the amount: it states the resulting date, the plan duration
  applied, and the status transition (`Expired → Active`). This is where the
  stack-on-remaining-coverage rule becomes visible *before* it is committed.
- **Method has no default.** Cash and transfer are equally likely and a wrong
  prefilled method is a silently wrong record. Confirm stays disabled until both
  amount (> 0) and method are set.
- **Dismiss:** ✕, scrim tap, or Esc. No confirm-discard prompt (§4).
- **On confirm:** sheet closes, profile status block updates in place — badge and
  numeral crossfade over 150ms, new payment row appears at the top of Payments
  briefly outlined in `steel-300`. **No confirmation card.** The celebration card is
  reserved for check-in (`DESIGN.md`); reusing it here would spend the app's one
  moment of celebration on a bookkeeping action.

**Errors:** amount empty / zero / non-numeric → inline `Field` error, *"Enter the
amount received."* Write failure (IndexedDB quota or blocked) → `ErrorBanner` inside
the sheet, sheet stays open with values intact. Never a toast; the sheet is the
context.

---

### 6.5 S5 — New Member

One screen, one confirm. Registration and first payment are never two steps
(`app-flow.md` §7 / PRD 4.6 AC3).

```
┌────────────────────────────────────────────────────────────┐
│ RACKIN                                      Your Gym Name  │ 48
├────────────────────────────────────────────────────────────┤
│  New Member                                                │ 56
├────────────────────────────────────────────────────────────┤
│  MEMBER                                                    │ 40
│  Name                                                      │
│ ┌────────────────────────────────────────────────────────┐ │ 56
│ └────────────────────────────────────────────────────────┘ │
│  Phone · optional                                          │
│ ┌────────────────────────────────────────────────────────┐ │ 56
│ └────────────────────────────────────────────────────────┘ │
│  Plan                                                      │
│ ┌──────────────────────────┬─────────────────────────────┐ │
│ │      WEEKLY · 7 days     │     MONTHLY · 30 days       │ │ 56
│ └──────────────────────────┴─────────────────────────────┘ │
│                                                             │
│  FIRST PAYMENT                                             │ 40
│  Amount                                                    │
│ ┌────────────────────────────────────────────────────────┐ │ 56
│ │  <cur>                                                 │ │
│ └────────────────────────────────────────────────────────┘ │
│  Method                                                    │
│ ┌──────────────────────────┬─────────────────────────────┐ │
│ │          CASH            │          TRANSFER           │ │ 56
│ └──────────────────────────┴─────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐│
│  │ Member #1005 · covers until 10 Sep 2026                ││ 56  live preview
│  └────────────────────────────────────────────────────────┘│
├────────────────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────────────────┐ │
│ │                    REGISTER MEMBER                     │ │ 72  PressKey, sticky
│ └────────────────────────────────────────────────────────┘ │
├────────────────────────────────────────────────────────────┤
│  [Check-In]    [Follow Up]     [Members]     [+ New]▔       │ 64
└────────────────────────────────────────────────────────────┘
```

- **Field order matches how staff actually talk:** name → phone → plan → money. The
  conversation reaches money last.
- **Plan buttons state their duration** (`WEEKLY · 7 days`, `MONTHLY · 30 days`) so
  the flat-30-day rule is legible at the point of choice, not discovered later.
- **Live preview** shows the member number that will be assigned and the resulting
  coverage date. The number appearing *before* confirm lets staff start writing the
  physical card while still talking.
- **Confirm disabled** until name (non-empty, trimmed), plan, amount (> 0), and
  method are all set. Disabled state is `steel-300` fill, per the numpad confirm key
  — the same visual grammar as "not ready yet" on Check-In.
- **Validation is inline, on blur and on submit-attempt**, never a modal. Name empty →
  *"Enter the member's name."* Amount invalid → *"Enter the amount received."*
- **Phone is genuinely optional** — labeled `optional` in the field caption, never
  marked with a required-asterisk system that then has an exception.
- **Duplicate names are blocked by default** — a name that already matches an existing
  member disables Confirm — but overridable: a warning row with a "different person"
  switch appears, and Confirm re-enables once staff explicitly flip it (superseded a
  prior "allowed, the member number disambiguates" call).
- **Write is atomic** (§5.4). A failure leaves the form filled and shows an
  `ErrorBanner` above the confirm key; nothing is half-saved.

**Landscape:** two columns — Member left, First Payment right; preview and confirm
span the full width beneath.

---

### 6.6 S6 — Registration Success

```
┌────────────────────────────────────────────────────────────┐
│ RACKIN                                      Your Gym Name  │ 48
├────────────────────────────────────────────────────────────┤
│                                                             │
│                     ✓  (turf-green)                        │
│                  Placeholder Name is in                    │     Display 32/700
│                                                             │
│                   MEMBER NUMBER                            │     Label
│                                                             │
│                      1005                                  │     Numeral, 72px+
│                                                             │
│              ┌──────────────────────────┐                  │
│              │      ▓▓▒▒▓▓▒▒▓▓          │                  │
│              │      ▒▓▓▒▒▓▓▒▒▓          │                  │ 240 QR, high contrast
│              │      ▓▓▒▒▓▓▒▒▓▓          │                  │
│              └──────────────────────────┘                  │
│           Write this number on the member's card.          │     Body, steel-700
│                                                             │
│              ┌────────────────┐  ┌──────────────────┐      │
│              │   PRINT CARD   │  │       DONE       │      │ 72  secondary | PressKey
│              └────────────────┘  └──────────────────┘      │
├────────────────────────────────────────────────────────────┤
│  [Check-In]    [Follow Up]     [Members]     [+ New]▔       │ 64
└────────────────────────────────────────────────────────────┘
```

- **The member number is the hero** at Numeral role, oversized (72px+) — bigger than
  anything else in the app including the numpad digits. It is read aloud and
  transcribed onto a physical card; this is the Arm's-Length Rule at its most literal.
- **QR is generated offline** from the member id and rendered as inline SVG (never a
  remote image or a hosted generator — no network exists). See §11 OD-1.
- **Print card** opens the browser print dialog against a print-only stylesheet
  (number + QR + name, no app chrome). Untested on the target device; see §11 OD-3.
- **Done** → Check-In tab (`app-flow.md` §7). This screen does not auto-dismiss: staff
  need it up while they write the card.
- This is a screen, not the confirmation card — it holds a QR and two actions and must
  persist. The celebration card's uniqueness to check-in is preserved.

The same `QrCard` component renders the profile QR (§6.3) and the enlarged view.

---

## 7. Copy deck

Every user-visible string, so voice stays consistent and so translation or a gym's
own wording is a single-file change. Voice per `DESIGN.md`: states the problem and
the next action, no apology, no exclamation marks.

| Key | String |
|---|---|
| `tab.followUp` | Follow Up |
| `followUp.title` | Follow Up |
| `followUp.expiring` | Needs renewal |
| `followUp.lapsed` | Stopped coming · 14+ days |
| `followUp.empty` | Nobody needs a call today. |
| `followUp.emptyHint` | Members show up here when their plan needs renewing or they've stopped coming. |
| `followUp.expiringEmpty` | No one needs a renewal call right now. |
| `followUp.lapsedEmpty` | No one's fallen off in the last 14 days. |
| `followUp.never` | never |
| `followUp.today` | today |
| `followUp.tomorrow` | tomorrow |
| `followUp.days` | days |
| `members.title` | Members |
| `members.search` | Search by name or number |
| `members.empty` | No members yet. |
| `members.emptyAction` | Register the first member |
| `members.noMatch` | No members match "{query}". |
| `profile.back` | Back |
| `profile.coveredUntil` | Covered until {date} |
| `profile.expiredOn` | Expired {date} |
| `profile.unpaid` | No payment recorded |
| `profile.qr` | Member QR |
| `profile.qrHint` | Tap to enlarge · Print card |
| `profile.visits` | Recent visits |
| `profile.payments` | Payments |
| `profile.noVisits` | No visits yet. |
| `profile.noPayments` | No payments recorded. |
| `profile.showingRecent` | Showing {n} most recent |
| `profile.record` | Record payment |
| `payment.title` | Record payment |
| `payment.amount` | Amount |
| `payment.method` | Method |
| `payment.cash` | Cash |
| `payment.transfer` | Transfer |
| `payment.preview` | Covers until {date} · {n} days from today |
| `payment.transition` | {from} → {to} |
| `payment.confirm` | Record payment |
| `payment.amountError` | Enter the amount received. |
| `payment.saveError` | Payment not saved. Check the amount and try again. |
| `new.title` | New Member |
| `new.member` | Member |
| `new.name` | Name |
| `new.phone` | Phone · optional |
| `new.plan` | Plan |
| `new.session` | Session · 1 day |
| `new.weekly` | Weekly · 7 days |
| `new.monthly` | Monthly · 30 days |
| `transfer.qr` | Have them scan to transfer |
| `transfer.qrHint` | Record the payment once the transfer shows on their phone. |
| `transfer.qrMissing` | No payment QR saved yet. |
| `name.taken` | #{id} already uses this name. Registering makes a second member. |
| `new.firstPayment` | First payment |
| `new.preview` | Member #{id} · covers until {date} |
| `new.confirm` | Register member |
| `new.nameError` | Enter the member's name. |
| `new.saveError` | Member not saved. Check the details and try again. |
| `success.heading` | {name} is in |
| `success.numberLabel` | Member number |
| `success.hint` | Write this number on the member's card. |
| `success.print` | Print card |
| `success.done` | Done |
| `status.active` | Active |
| `status.expired` | Expired |
| `status.expiringSoon` | Expiring soon |

Dates render as `10 Sep 2026` (day, short month, year) — unambiguous across
conventions, unlike numeric formats, and short enough for a row.

---

## 8. Motion and feedback

`DESIGN.md` bans decorative motion. Authored motion is limited to four cases, all
respecting `prefers-reduced-motion` (the global rule already exists in `index.css`):

| Element | Motion | Duration |
|---|---|---|
| `PressKey` / any pressable | `translateY(2px)` + shadow compress | 80ms |
| `Sheet` entrance | slide up + scrim fade | 150ms ease-out |
| Status badge / numeral after payment | crossfade in place | 150ms |
| New payment row | `steel-300` outline, fades out | 2s |

No screen-transition animation. Tab and profile changes are instant — a staff member
mid-conversation should never wait on a slide.

---

## 9. States, ranges, and edge cases

**Expected pilot data ranges:** 50–400 members · 0–40 Follow Up rows · 0–500 visits
and 0–50 payments per member · names to ~40 characters · amounts to 6 digits.

**The loading rule that matters.** `useLiveQuery` with a default of `[]` (as
`ActivityFeed` currently does) makes "not loaded yet" indistinguishable from "empty",
so an empty state can flash before real data lands. On these screens, call
`useLiveQuery` **without** a default and treat `undefined` as not-yet-loaded: render
the header and an empty content area, never the empty state. Empty states appear only
for a confirmed empty result. This is a one-line difference with a large perceived-
quality cost, and it is the single most likely defect in this build.

| Edge case | Required behavior |
|---|---|
| Member with no payments | Status `Expired`, `No payment recorded`, `—`/`unpaid` in the numeral gutter |
| Member never checked in | Sorts to the top of Stopped coming, gutter shows `—` / `never` |
| Member both expiring and lapsed | Appears in both sections (§6.1) |
| Coverage ends today | `daysRemaining = 0`, caption `today`, status still `Active` |
| Early renewal | `coversUntil` extends from the member's current `coversUntil`, not the payment date — stacks the plan's days on top of remaining coverage instead of shortening it. The preview panel states the resulting date before confirm. |
| Very long name | Truncate with ellipsis in rows; wrap to two lines maximum on the profile |
| Amount with decimals | Accept; display as entered, two decimals maximum |
| Clock changed / timezone | All comparisons use the device clock; dates stored ISO. No correction logic in the pilot. |
| IndexedDB write failure | Inline `ErrorBanner` in context, form/sheet state preserved, nothing partially written |

---

## 10. Accessibility and touch floor

No formal compliance target for the pilot (`PRODUCT.md`); this is the baseline:

- **Touch targets:** 56px minimum, 72px for `PressKey`. Row targets are the full row.
- **Contrast:** body and label text at 4.5:1 minimum on its background. Yellow is
  fill-only behind `ink-900` text, never text-on-white.
- **Status is never color-only** — every badge carries its word.
- **Focus:** `steel-700` 2px `focus-visible` outline on every interactive element,
  matching the existing components (an external keyboard is plausible at a front desk).
- **Sheet:** `role="dialog"`, `aria-modal`, focus trapped, Esc closes, focus returns
  to the Record Payment key.
- **Forms:** every input has a real `<label>`; errors linked via `aria-describedby`
  and announced with `aria-live="polite"`.
- **Icons:** decorative icons `aria-hidden`; meaningful ones labeled (the existing
  activity feed's method icons already do this).
- **The QR is not an accessibility surface** — it is a physical-world artifact. The
  member number beside it is the accessible equivalent and must always be present.

---

## 11. Open decisions — do not invent

| # | Decision | Recommendation |
|---|---|---|
| **OD-1** | **QR generation library.** `qr-scanner` (installed) only *reads* codes; nothing in the project generates them, and generation is required by `PRODUCT.md`. | Add `qrcode` (npm) and render inline SVG — MIT, no network, ~20KB, works in an old WebView. Needs a dependency-addition decision before S6 is built. |
| **OD-2** | **Currency symbol and locale.** No currency is committed anywhere in the repo, and `PRODUCT.md` forbids fabricating pilot specifics. | Define `CURRENCY_SYMBOL` as a single constant in `domain/constants.js` so it is a one-line change. **Confirm the value before implementation** — wireframes show `<cur>`. |
| **OD-3** | **Printing.** `app-flow.md` §7 promises "Print/View QR", but a budget Android tablet at a gym likely has no printer. | Ship `window.print()` + a print stylesheet (zero cost, no dependency), treat View/enlarge as the primary path, and drop Print if the pilot device can't. |
| **OD-4** | **Tab label "Follow Up" vs "Lapsed."** §5.2 recommends the rename; `DESIGN.md` and `app-flow.md` currently say "Lapsed". | Rename. `app-flow.md` is updated alongside this spec; `DESIGN.md`'s tab-bar component spec needs the same one-word edit when implementation lands. |
| **OD-5** | **Amount entry method.** The design system's numpad is the signature control; the amount field currently uses the device keyboard. | Device keyboard with `inputmode="decimal"` for the pilot. A second numpad on the payment sheet would compete with the brand's one signature control and cost vertical space on portrait. Revisit only if staff report the keyboard slows them down. |
| **OD-6** | **The gym's payment QR asset.** Choosing `transfer` shows the gym's receiving QR, read from `frontend/public/payment-qr.png`. No such file exists, and PRODUCT.md forbids inventing one. | The gym saves their own GCash/bank QR at that path — a file swap, no code change. Until then the panel states that no QR is saved rather than showing a broken image, and cash/transfer still record normally. |
| **OD-7** | ~~**Backend rejects `session`.**~~ **Resolved.** `PlanType` gained `session`, `PlanDurations` maps it to 1 day, and `V2__add_session_plan_type.sql` widens the CHECK constraint. Closed as part of shipping sync (TRD §7), which is what made it reachable. | — |
| **OD-8** | **A tablet-assigned member id can collide with a backend-assigned one.** Both sides number from 1001 (`backend-schema.md` §7), and the sync push now sends the tablet's id. With one tablet and no other writer the sequences stay in step, which is the pilot's scope (ADR-001). | The backend answers `409` rather than renumbering, and the tablet drops that record from its queue instead of retrying forever — the member keeps working locally, and the QR card already printed for them stays truthful. A second device would need real id allocation (a per-device prefix or a server-issued block) before this stops being theoretical. |

---

## 12. Build order

Each slice is independently testable and leaves the app working:

1. **Domain + constants** (§5.4) — `membership.js`, `followUp.js`, `payments.js`,
   `members.js`, with unit tests against a seeded Dexie instance (`db.test.js` shows
   the existing pattern). No UI.
2. **Shared components** (§5.3) — `StatusBadge`, `ScreenHeader`, `SectionHeader`,
   `EmptyState`, `Field`, `ChoiceGroup`, `PressKey` (extracted from `Numpad`), `Sheet`.
3. **S5 New Member + S6 Success** — first, because nothing else can be tested against
   real local data until members can be created. Resolves OD-1 and OD-2.
4. **S2 Members** — the simplest read screen; validates `listMembers` and row patterns.
5. **S3 Member Profile + S4 Record Payment** — completes the write loop.
6. **S1 Follow Up** — last, because it is the most valuable screen and benefits from
   real seeded data across a range of dates to look right.
7. **Nav wiring + tab rename** — `App.jsx` state shape (§5.1), `TabBar` label/icon.

Steps 3–6 each replace one `PlaceholderScreen` in `App.jsx`; the app builds and runs
after every step.
