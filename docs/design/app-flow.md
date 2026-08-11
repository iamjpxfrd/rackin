# App Flow — Rackin (Gym Check-In System)

**Status:** Draft v1
**Based on:** PRD v1
**Maps to:** design system (`docs/design/design-system.md`)

## 1. Navigation shell

Persistent bottom/side tab bar, always visible, four destinations —
matches the design system's tab bar spec:

```
[Check-In] [Follow Up] [Members] [+ New]
```

Tab 2 was renamed from "Lapsed" to "Follow Up" when expiring-soon merged
into it — see `frontend-spec.md` §3.2 and §5.2.

No hamburger menu, no nested navigation — staff need every core
destination one tap away at all times (PRD 4.1–4.9 all live behind
these four tabs).

## 2. Flow: Check-in (numpad) — PRD 4.1

```
[Check-In tab, default screen]
       │
       ▼
Staff enters member number on numpad
       │
       ├─ valid number, member found ──► Confirmation card
       │                                  (name + visit count)
       │                                  auto-dismiss 2.5s
       │                                  ──► back to Check-In, feed updates
       │
       └─ invalid/unmatched number ──► Inline error
                                        "No member found for #114 —
                                        try search by name"
                                        ──► numpad stays active, no dead end
```

**State notes:**
- Numpad "Check-In" key stays disabled until a number is entered
  (per design system numpad key spec).
- Confirmation card is a lightweight overlay, not a screen
  transition — staff should be able to check the next member in
  immediately without navigating back.

## 3. Flow: Check-in (QR) — PRD 4.2

```
[Check-In tab]
       │
       ▼
Staff taps "Scan QR" (secondary control next to numpad)
       │
       ▼
Camera view opens (same screen, overlay or split-pane)
       │
       ├─ scan succeeds ──► same Confirmation card as numpad flow
       │                     (method recorded as "qr")
       │
       └─ scan fails / camera unavailable / times out
                 │
                 ▼
          Falls back to numpad instantly — no error modal,
          no separate screen, no re-navigation required
```

**Design intent (per ADR-001):** QR is an accelerant on top of the
same lookup, not a parallel flow — so this diagram deliberately
converges back into the numpad flow rather than branching into a
separate confirmation path.

## 4. Flow: Check-in (name search) — PRD 4.3

```
[Check-In tab]
       │
       ▼
Staff taps "Search by name"
       │
       ▼
Text input, filtered list appears as staff types
       │
       ▼
Staff taps a result
       │
       ▼
Same Confirmation card as numpad/QR flows
(method recorded as "search")
```

## 5. Flow: Today's activity feed — PRD 4.4

Not a separate screen — lives alongside the numpad on the Check-In
tab (per design system's two-pane tablet layout: numpad left, feed
right; stacks on portrait).

```
[Check-In tab]
   ┌───────────────┬───────────────────┐
   │   Numpad /     │  Today's Activity   │
   │   Search / QR  │  10:02  #114  numpad│
   │                │  10:05  #087  qr    │
   │                │  10:09  #212  search│
   └───────────────┴───────────────────┘
```

Feed updates live as any check-in flow (4.1–4.3) completes — no
manual refresh, no navigation required.

## 6. Flow: Follow Up — lapsed + expiring soon — PRD 4.5, 4.9

```
[Follow Up tab]
       │
       ▼
Section 1 — Expiring soon: coverage ends within 7 days,
            soonest-first (acting here prevents a lapse)
Section 2 — Stopped coming: no check-in in 14+ days,
            oldest-last-visit-first; never-visited sorts oldest
       │
       ├─ both empty: "Nobody needs a call today."
       │
       └─ tap a member row ──► Member Profile screen
                                (see Flow 8)
```

Both sections answer one question — who needs a call today — so they
live on one screen; the Members tab stays a pure roster. A member who
qualifies for both appears in both (two different reasons to call).
Prevention sits above cure, hence expiring-soon first.

Single-purpose screen — no filtering/sorting controls in the pilot
(per PRD open question: thresholds may become configurable later,
not required now).

## 7. Flow: New member registration + payment — PRD 4.6

```
[+ New tab]
       │
       ▼
Registration form:
  - Name (required)
  - Plan type: weekly / monthly (required)
       │
       ▼
Same screen, payment section:
  - Amount
  - Method: cash / transfer
       │
       ▼
Staff confirms
       │
       ▼
Member registered + payment recorded in one action
Member number auto-assigned
QR code generated automatically
       │
       ▼
Success screen: shows assigned number + QR code,
option to "Print/View QR" or "Done"
       │
       ▼
──► returns to Check-In tab
```

**Design intent:** registration and first payment are one flow, not
two screens with a save-and-continue step — matches PRD 4.6 AC3
directly (no separate system, no double entry).

## 8. Flow: Member profile — reached from Lapsed, Members, or search

```
Member Profile
  - Name, member number, QR code (viewable/printable)
  - Status badge: Active / Expired / Expiring soon
  - Check-in history (recent visits, with method icon)
  - Payment history
       │
       ├─ "Record Payment" ──► Flow 9
       │
       └─ back ──► previous tab
```

## 9. Flow: Record payment (existing member) — PRD 4.7

```
Member Profile ──► "Record Payment"
       │
       ▼
  - Amount
  - Method: cash / transfer
       │
       ▼
Confirm
       │
       ▼
coversUntil extended automatically from payment date + plan duration
Status updates (Expired ──► Active) immediately
       │
       ▼
──► back to Member Profile, updated status visible
```

## 10. Flow: Members list + status — PRD 4.8

```
[Members tab]
       │
       ▼
Full member list, name-ascending, each row shows status badge
(Active / Expired / Expiring soon — per design system status badge spec)
       │
       ├─ search filters in place, by name or member number
       │
       └─ tap any row ──► Member Profile (Flow 8)
```

No pinned "Expiring Soon" section here — it moved to the Follow Up tab
(Flow 6), so the roster stays flat and a name is always where the
alphabet says it is.

## 11. Offline behavior — PRD 4.10 (cross-cutting, not a discrete flow)

Every flow above (2–10) completes fully with the device offline —
there is no "waiting for connection" state anywhere in this app flow.
This isn't a screen to design; it's a constraint every screen above
must satisfy, per ADR-001 and PRD 4.10.

## 12. Full screen map

```
                    ┌───────────────┐
                    │  Tab Bar (always visible) │
                    └───────────────┘
        ┌──────────┬──────────┬──────────┬──────────┐
        ▼           ▼          ▼          ▼
   Check-In    Follow Up    Members    + New
   (numpad/     Expiring     List      Registration
    QR/search   + Lapsed      │            │
    + feed)        │          │            │
        │          ▼          ▼            ▼
        │      Member    Member Profile  Success
        │      Profile        │        (QR code)
        │          │          │            │
        └──────────┴────┬─────┘            │
                         ▼                  │
                  Record Payment            │
                         │                  │
                         └──────────────────┘
                     (all return to originating tab)
```

## 13. Open items carried from PRD

These remain unresolved and affect this flow if answered differently:

- If phone number is added to registration (PRD open question), it
  would add one field to Flow 7 and one line to Member Profile
  (Flow 8) — no structural change to the flow otherwise.
- If lapsed/expiring thresholds become staff-configurable, that adds
  a settings entry point not currently in the tab bar — would need
  a decision on where it lives (likely a small icon in the top bar,
  not a fifth tab, to avoid diluting the four primary destinations).
