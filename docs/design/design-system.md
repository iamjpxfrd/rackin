# Design System — Gym Check-In (Staff Tablet App)

## 1. Grounding

**Subject:** a front-desk tablet at a single province gym, operated by
staff, replacing a paper logbook.
**Audience:** gym staff — not members. Used standing up, often
one-handed, sometimes in direct sun near a window or under dim
fluorescent light, by people who may be checking someone in every 20
seconds during peak hours.
**The page's one job:** get a staff member from "who just walked in"
to "checked in, confirmed" in under two seconds, with zero ambiguity
about whether it worked.

That job — fast, repeated, thumb-driven, unambiguous — is the brief.
Not a marketing site, not a dashboard to admire. A **tool that lives on
a counter**, closer in spirit to a point-of-sale terminal, a shop
scale, or gym equipment itself than to a SaaS product.

I'm deliberately steering away from the three generic AI-design
defaults (warm cream + terracotta serif; near-black + acid accent;
broadsheet hairline-rule newspaper). None of them read as "gym
equipment control panel," which is the actual identity this needs.

## 2. Design plan

### Signature element
**The numpad *is* the brand.** Every other screen is quiet and
functional; the numpad is treated like a physical control — chunky,
high-contrast, satisfying to press, styled after gym equipment
keypads and weight-plate numerals rather than a generic phone dialer.
Large numerals in a heavy grotesk, keys with real depth (shadow that
compresses on press), and a distinct "confirm" key styled like a
plate-loaded button, not a rounded default.

### Color — "steel & chalk"
Inspired by gym hardware: brushed steel, rubber flooring, chalk dust,
and the one warning-tape yellow you'd find on a loading bay.

| Token | Hex | Use |
|---|---|---|
| `--ink-900` | `#15181C` | Primary text, key numerals |
| `--steel-700` | `#3A4046` | Secondary text, icons |
| `--steel-300` | `#C7CDD3` | Borders, dividers, disabled state |
| `--chalk-50` | `#F1F2F0` | App background |
| `--surface-white` | `#FFFFFF` | Cards, numpad keys |
| `--signal-yellow` | `#F2B705` | Primary action, active/confirm state |
| `--rubber-red` | `#C43D3D` | Lapsed/expired alerts, destructive actions |
| `--turf-green` | `#3F8F5F` | Active/paid/success state |

Rationale: near-neutral chalk/steel base keeps the interface calm and
legible under variable lighting; yellow is used sparingly as the
single "press this" signal (a nod to warning-tape yellow on gym
equipment, not a decorative gradient); red and green are reserved
*only* for status meaning (expired vs. active), never for decoration,
so staff can scan by color at a glance.

### Type
- **Display / numerals:** a heavy, slightly condensed grotesk (e.g.
  **Archivo Black** or **Barlow Condensed SemiBold**) for the numpad
  digits and big status numbers (visit counts, days-until-expiry).
  Numerals need to be readable from arm's length, fast.
- **Body / UI labels:** **Inter** or **IBM Plex Sans** — a plain,
  highly legible grotesk for names, lists, buttons. Nothing
  decorative; this is a tool, not a magazine.
- **Utility / data:** **IBM Plex Mono** for member numbers and
  timestamps in the activity feed — mono reinforces "this is a fixed
  identifier," and makes columns of numbers scan cleanly.

Type scale (base 16px, tablet-first):
| Role | Size | Weight |
|---|---|---|
| Numpad digit | 40px | 800 |
| Confirmation name | 32px | 700 |
| Screen title | 24px | 700 |
| Section label (eyebrow) | 13px, uppercase, tracked | 600 |
| Body / list item | 18px | 400–500 |
| Member number (mono) | 16px | 500 |
| Caption / timestamp | 14px | 400 |

### Layout concept
Single-column, full-bleed on tablet, no navigation chrome to hunt
through — a persistent bottom or side tab bar with four large touch
targets (Check-In / Lapsed / Members / New Member), since staff
switch between these constantly and can't afford a hamburger menu.

```
┌─────────────────────────────────────┐
│  GYM NAME             [staff badge] │  ← thin top bar, always present
├───────────────────┬───────────────--┤
│                    │                │
│   NUMPAD           │  TODAY'S       │
│   [1][2][3]        │  ACTIVITY      │
│   [4][5][6]        │  10:02 #114    │
│   [7][8][9]        │  10:05 #087    │
│   [ ][0][⌫]        │  10:09 #212    │
│   [  CHECK IN  ]    │  ...           │
│                    │                │
├────────────────────┴────────────────┤
│ [Check-In] [Lapsed] [Members] [+New] │  ← persistent tab bar
└───────────────────────────────────────┘
```

Two-pane on tablet landscape (numpad left, live feed right) collapses
to stacked single-column on portrait/mobile — numpad on top, feed
below the fold.

Cards and lists use **generous touch targets (min 56px height)**,
**flat surfaces with a single subtle shadow** (not soft neumorphism —
this needs to read as solid and pressable, not glassy), and **squared
corners with a small consistent radius (6px)** — enough to feel
modern, not so much it feels playful/consumer.

### Motion
Minimal, purposeful only:
- Numpad keys: a quick press-depth animation (translateY + shadow
  compression, ~80ms) — tactile feedback standing in for a physical
  click.
- Check-in confirmation: a brief scale+fade card entrance (~150ms),
  auto-dismisses after 2.5s — fast enough not to block the next
  check-in.
- No page-load choreography, no decorative parallax. This app is
  used by someone standing at a counter mid-task, not browsing.

## 3. Critique pass

Checked against generic defaults: no cream/terracotta, no
near-black/neon, no hairline-newspaper grid — confirmed distinct.
Removed one accessory before finalizing: an initial idea to color-code
each tab bar icon differently was cut — tab bar stays monochrome
steel, and color (yellow/red/green) is reserved strictly for
check-in/status meaning, so color always tells staff something true
rather than just decorating navigation.

## 4. Core components

### Numpad key
- 72×72px minimum touch target, `--surface-white` fill, `--steel-300`
  1px border, 6px radius
- Digit in `--ink-900`, Archivo Black, 40px
- Press state: `translateY(2px)`, shadow reduces from `0 4px 0
  var(--steel-300)` to `0 1px 0 var(--steel-300)` — mimics a
  mechanical key
- Confirm/Check-In key: full-width, `--signal-yellow` fill,
  `--ink-900` text, same press mechanic, disabled (steel-300, no
  shadow) until a valid number is entered

### Status badge
- Active: `--turf-green` bg at 12% opacity, `--turf-green` text, small
  dot indicator
- Expired / Lapsed: `--rubber-red` bg at 12% opacity, `--rubber-red`
  text, small dot indicator
- Expiring soon: `--signal-yellow` bg at 16% opacity, `--ink-900` text

### Activity feed row
- Mono timestamp (`--steel-700`) + member number, name in body font,
  check-in method icon (numpad / QR / search) at trailing edge, 56px
  row height, 1px `--steel-300` divider between rows

### Confirmation card (on successful check-in)
- Centered overlay, `--surface-white`, 12px radius, drop shadow
- Member name at 32px/700
- "Visit #N this month" in mono, `--steel-700`
- Green check icon, `--turf-green`
- Auto-dismisses; tapping anywhere dismisses early

### Tab bar
- 4 items, icon + label, 64px height, `--chalk-50` bg, active item
  gets `--ink-900` icon/label + 2px `--signal-yellow` top border;
  inactive items `--steel-700`

## 5. Accessibility & quality floor

- All touch targets ≥ 56px (numpad keys 72px) — built for speed under
  pressure, not precision tapping
- Color is never the only signal — status badges always pair color
  with a text label ("Active," "Expired," "Expiring soon")
- Contrast: `--ink-900` on `--chalk-50` and `--surface-white` both
  exceed WCAG AA at body sizes; `--signal-yellow` is never used for
  text-on-white (fails contrast) — only as a fill behind dark text
- Visible focus states on all interactive elements (steel-700 2px
  outline) for any external keyboard use
- Respects `prefers-reduced-motion`: press/scale animations drop to
  instant state changes

## 6. Voice & microcopy

- Confirmation: **"Checked in — [Name], visit 12 this month."** Not
  "Success!" — say what happened and to whom.
- Lapsed list empty state: **"No one's fallen off in the last 14
  days."** Plain, no false cheer.
- Failed lookup: **"No member found for #114 — try search by name."**
  States the problem and the next action, doesn't apologize.
- New member button: **"New Member"**, not "Add" or "Create" — matches
  what staff call the action out loud at the desk.
