---
name: RackIn
description: A dark athletic control surface — gym equipment styling carried from the tablet's numpad through to the owner's desktop dashboard.
colors:
  page: "#0a0a0a"
  surface: "#141414"
  surface-2: "#1a1a1a"
  border: "#262626"
  hairline: "#1e1e1e"
  text: "#ffffff"
  text-muted: "#8a8a8a"
  text-dim: "#666666"
  accent: "#d4ff3f"
  accent-soft: "#e8ff8c"
  accent-deep: "#384700"
  danger: "#ff5c5c"
  warning: "#ffb23f"
  topbar: "#000000"
  topbar-border: "#1c1c1c"
  menu-panel: "#ffffff"
  menu-backdrop: "#1c1c1c"
typography:
  display:
    fontFamily: "Zen Dots, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "0.04em"
  heading:
    fontFamily: "Fjalla One, system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "normal"
  label:
    fontFamily: "Fjalla One, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1.3
    letterSpacing: "0.08em"
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "normal"
  mono:
    fontFamily: "IBM Plex Mono, ui-monospace, monospace"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "normal"
  menu-link:
    fontFamily: "Fjalla One, system-ui, sans-serif"
    fontSize: "2.8rem"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "-0.5px"
rounded:
  none: "0px"
  full: "9999px"
components:
  primary-button:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.page}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    height: "52px"
  status-badge-active:
    textColor: "{colors.accent}"
    typography: "{typography.label}"
  status-badge-expired:
    textColor: "{colors.danger}"
    typography: "{typography.label}"
  status-badge-expiring:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.page}"
    typography: "{typography.label}"
  sync-chip-synced:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent}"
    typography: "{typography.label}"
  sync-chip-pending:
    backgroundColor: "{colors.warning}"
    textColor: "{colors.warning}"
    typography: "{typography.label}"
  sync-chip-never:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.danger}"
    typography: "{typography.label}"
  data-table-row:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.body}"
    height: "56px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.none}"
    padding: "20px"
---

# Design System: RackIn

## Overview

**Creative North Star: "Kinetic Court"**

RackIn is still a tool that lives on a counter, not a SaaS product being browsed — the tablet's numpad-to-confirmation loop and the owner's dashboard both answer to the same brief: read instantly, act fast, feel like equipment. Kinetic Court reads that brief as **night-mode athletic gear** — a black playing surface with one acid-lime line marking, like court paint under floodlights — rather than the daylit steel-and-chalk hardware-store read the system started with. The floor is near-black, every surface sits one step lighter than the one behind it, and the single lime accent is reserved for exactly one job: *this needs your attention or your press* — a check-in in progress, a confirm action, a badge that means "active."

Kinetic Court replaced an earlier steel/chalk/signal-yellow direction outright (explored alongside two other directions — "Warm Front Desk," a cream+terracotta front-desk read, and "Night Shift," a dark+neon-mint console read — before this one was chosen and built out across every screen). It is a full reskin, not a repaint: old token names that assumed a light background (`ink-900`, `chalk-50`, `signal-yellow`) are retired rather than repointed, since keeping them would mean a name like "chalk-50" now meaning near-black.

The tablet (`android/`) and the desktop owner dashboard (`server/`) share every token in this file, but they are not the same layout wearing different content — the dashboard uses the width a tablet doesn't have (data tables, two- and three-column grids, a slide-in nav panel) rather than stretching the tablet's single-column screens sideways. See each surface's own screens for composition; this file governs the shared visual language underneath both.

**Key Characteristics:**
- Near-black base, one step lighter per surface (`page` → `surface` → `surface-2`) — depth from layered darkness, never from shadow.
- Acid-lime (`accent`) means "active," "press this," or "this is the number that matters" — reserved, never decorative. Amber means "pending," red means "expired/stopped."
- Sharp corners everywhere except the one place a shape is drawn on purpose: the diagonal-cut chamfer on primary actions, and fully circular avatar badges.
- Flat surfaces, border-only separation — no shadows anywhere in the system.
- The RACKIN wordmark (Zen Dots) is reserved for the tablet's own brand moment and its numpad digits; the desktop dashboard shows the gym's own name instead, never the product's.

## Colors

A near-black scale with one reserved accent — the system reads as dark athletic hardware, not a "dark mode" toggle on a light design.

### Primary
- **Court Lime** (`#D4FF3F`): the single "this is live / press this / this is active" signal — confirm buttons, the active check-in state, the "Active" status badge, the diagonal-cut chamfer fill. A softer tint (**Lime Soft**, `#E8FF8C`) exists for a secondary emphasis inside the same family (e.g. an "Expiring" progress-bar fill sitting beside a solid-lime chip) without competing with it. A darker step (**Lime Deep**, `#384700`, same ~122° hue) exists for the opposite reason: the bright lime measures ~1.16:1 contrast on the staggered menu's white panel — effectively invisible — so lime-hued text or icons on that one light surface use Lime Deep instead. The staggered menu's numbered links (`01`, `02`...) are the first real use of it.

### Secondary
- **Signal Amber** (`#FFB23F`): pending/in-progress state only — a sync queue with unsynced records, "expiring" contexts that aren't the headline lime chip. Reserved strictly for "this is moving but not done yet."
- **Alert Red** (`#FF5C5C`): expired/lapsed/stopped state only — status badges, danger text, a sync status that's gone quiet. Reserved strictly for "this needs the same attention a red light gets."

### Neutral
- **Page Black** (`#0A0A0A`): the app's floor — the surface everything else sits on top of.
- **Panel** (`#141414`): the first layer up — cards, table containers, form fields.
- **Panel Raised** (`#1A1A1A`): hover/selected state on an interactive row — one step lighter than Panel, never a color shift.
- **Border** (`#262626`): the standard 1px separator between panel and floor, and around form fields.
- **Hairline** (`#1E1E1E`): the quieter divider between rows inside one panel — table rows, list rows — subtler than Border since it separates siblings, not surfaces.
- **Text Primary** (`#FFFFFF`): names, headings, primary numbers.
- **Text Muted** (`#8A8A8A`): secondary text that must still be read reliably — column headers, IDs, timestamps, placeholder text, meta lines. Against this system's darkest surfaces (`page` through `surface-2`) this is the *lightest* gray that still clears 4.5:1 body-text contrast; nothing darker is safe for real content.
- **Text Dim** (`#666666`): decorative-only — an icon tint or a divider-adjacent accent where nothing is actually being read. Confirmed to fail 4.5:1 body-text contrast against every surface in this system (3.0–3.45:1), so it never carries text a reader is expected to parse, no matter how minor.

### Named Rules
**The Contrast-Floor Rule.** `text-dim` is not a third text tier — it reads too low-contrast against this palette's dark surfaces to carry real content at any size this system uses. Column headers, IDs, timestamps, and placeholder text all use `text-muted`; `text-dim` is reserved for genuinely decorative tints (an icon glyph, never a string of text).

**The One-Accent Rule.** Court Lime is the only color that means "act on this" or "this is on." Amber and red are status-only (pending / expired) and never used for a call-to-action. A screen with more than one lime element competing for attention is a bug, not a style choice — carried forward from the original system's Meaning-Only Color Rule, just with a different palette underneath it.

**The Gym-Not-Product Rule.** The RACKIN wordmark (Zen Dots) appears only on the tablet app shell and its numpad digits — the product's own brand moment. The owner dashboard shows the gym's own name in the top bar instead (a placeholder constant today, pending a real gym-profile field); Kinetic Court is the shared skin, not a re-branding opportunity on every screen.

## Typography

**Wordmark Font:** Zen Dots (system-ui fallback) — the tablet's brand moment only.
**Heading/Label Font:** Fjalla One (system-ui fallback)
**Body Font:** Inter (system-ui fallback)
**Mono Font:** IBM Plex Mono (ui-monospace fallback)

**Character:** Zen Dots is the one deliberately loud, novelty accent in the system — reserved for the RACKIN wordmark and the tablet numpad's digits, never a general-purpose numeral face. Fjalla One is a tall, condensed, all-caps-friendly grotesk that carries every label, heading, button, and big stat number — industrial and fast to scan, standing in for the old system's Archivo Black numeral role without literally being a numeral face. Inter carries everything a staff member or owner actually reads at length: names, meta text, table cells, form labels. Mono reinforces "this is a fixed identifier" for member IDs and money amounts, exactly as it did before the reskin.

### Hierarchy
- **Display / Wordmark** (400, 18px, Zen Dots, tracked 0.04em): the RACKIN wordmark only — tablet top bar, login numpad. Never used for body or numeral content.
- **Heading** (400, 22px, Fjalla One): screen titles, big stat numbers on Analytics/KPI cards, the staggered menu's huge nav links (2.8rem at that scale specifically).
- **Label** (400, 11–13px, Fjalla One, uppercase, tracked 0.06–0.12em): column headers, status-badge text, section eyebrows, button labels.
- **Body** (400–600, 13–17px, Inter): names, table cell content, form fields, helper text.
- **Mono** (500, 12–14px, IBM Plex Mono): member IDs, money amounts, anywhere a column of numbers needs to align.

### Named Rules
**The Fjalla Emphasis Rule.** Anything that needs to read as a control or a status — a button, a badge, a big number the owner should notice first — is Fjalla One, uppercase, tracked wide. Anything that's prose the reader parses word-by-word — a name, a phone number, a sentence of helper text — is Inter. Mixing the two roles on the same string (an uppercase-tracked sentence, or a name in Fjalla One) is a tell that a component was styled by habit instead of by role.

## Layout

The tablet (`android/`) stays single-column, full-bleed, portrait-first, with a persistent bottom tab bar — the One-Tap-Away Rule from the original system still holds there exactly as written. The desktop dashboard (`server/`) is a different information architecture on the same skin: a fixed top bar (gym name, sync status, a MENU control) over a scrollable content area, with no persistent tab bar at all — navigation is a full-height staggered overlay that slides in from the right, since a desktop owner reviewing figures isn't switching screens every twenty seconds the way front-desk staff are. Desktop screens use the width a tablet doesn't have: two-column Follow Up (Expiring Soon / Stopped Coming side by side), a single full-width data table for Check-In and Members, and multi-column KPI/chart grids on Analytics.

### Named Rules
**The Overlay-Not-Bar Rule.** The dashboard's nav is a full-screen staggered overlay (MENU button → white panel slides in from the right, numbered links stagger into place), never a persistent sidebar or top-level tab row — the desktop surface is reviewed in short, deliberate sessions, not operated continuously the way the tablet is, so trading one tap of indirection for zero permanent chrome is the right trade there and the wrong one on the tablet.

## Elevation & Depth

Flat, everywhere, on both surfaces — no shadows anywhere in the system, not even the original system's one "soft card elevation" exception. Depth is conveyed entirely through the layered-darkness scale (`page` → `surface` → `surface-2`) and 1px borders (`border` for panel-to-floor, `hairline` for row-to-row). A selected or hovered table row lifts by shifting to `surface-2` and gaining a 3px lime inset border on its leading edge — never a shadow.

### Named Rules
**The No-Shadow Rule.** If a component needs to read as "raised" or "focused," reach for a lighter background step or a lime border accent, never `box-shadow`. This is a stricter version of the original system's Mechanical-Not-Ambient Rule: Kinetic Court has no ambient-shadow vocabulary left at all, mechanical or otherwise.

## Shapes

Sharp corners everywhere (`0px` radius) — no exceptions on cards, buttons, tables, or form fields. Two deliberate departures from that flatness: fully circular avatar badges (member initials, in a member detail context), and the **diagonal-cut chamfer** — a single corner clipped at a 45° angle — on primary buttons and the confirm/active-tab treatment, drawn with CSS `clip-path` on the desktop and with `react-native-svg` on the tablet (React Native has no native `clip-path` equivalent). The chamfer is the one shape flourish the system allows itself; it never appears on more than one element in the same view.

## Components

### Primary Button
The confirm/action surface — the chamfer is what makes it read as "press this" rather than a plain rectangle.
- **Shape:** full-width or content-width, diagonal-cut chamfer (bottom-right corner, 12–14px cut), 0px radius everywhere else.
- **Fill:** `accent` background, `page`-colored text — dark text on the one light-value color in the system, for contrast.
- **Typography:** Label role, uppercase, tracked wide.
- **Hover:** slight opacity reduction (`~0.9`), no color shift, no shadow.

### Status Badge
- **Active:** no fill — a small lime dot + lime uppercase text. The quietest treatment, since "active" is the expected/common case.
- **Expired:** the same dot-plus-text pattern in `danger` red.
- **Expiring Soon:** the one badge that inverts the pattern — solid lime fill, `page`-colored text, no dot. The single state the owner should act on today gets the highest-emphasis treatment; the other two stay quiet by comparison.
- Color is never the only signal — every badge pairs its color with a text label, exactly as the original system required.

### Sync Status Chip
Desktop-only — reports the tablet's last self-reported outbox state (depth/age) in the dashboard's top bar.
- **Shape:** bordered pill-less rectangle, 2px solid border in the state color, background the same color at ~12% opacity, a small color-matched dot.
- **Content:** a bold uppercase LABEL (`SYNCED` / `N PENDING` / `NOT SYNCED`) plus a muted DETAIL string (relative time or queue depth) — two distinct text weights in one chip so the "what" and the "when" don't compete.
- **States:** `accent` (caught up), `warning` (queue has pending items), `danger` (never reported, or stale past the freshness window).

### Data Table
The dashboard's primary content shape — Check-In's activity log, Members' roster, Store's transaction ledger.
- **Header row:** `page`-colored background (one step darker than the table body, an inversion that separates header from data at a glance), Label-role column names in `text-dim`, `border`-colored bottom rule.
- **Body rows:** `surface` background, `hairline` divider between rows, no divider under the last row, Body-role text.
- **Row height:** 56px (matches the original system's activity-feed-row height exactly — a value that survived the reskin).

### Staggered Menu
The desktop dashboard's sole navigation surface — see Layout's Overlay-Not-Bar Rule.
- **Backdrop layer:** `menu-backdrop` (`#1C1C1C`), slides in from the right immediately on open.
- **Panel layer:** `menu-panel` (pure white — the one place in the whole system a surface inverts to light), slides in ~80ms behind the backdrop for a layered reveal, `clamp(260px, 38vw, 420px)` wide.
- **Links:** Heading-role at menu-link scale (2.8rem), uppercase, near-black text (lime on hover), a small **Lime Deep** two-digit index (`01`, `02`...) trailing each label at a shared text baseline — not absolutely positioned, so it never drifts from the label's own line regardless of font metrics. Lime Deep, not Court Lime itself: the bright accent is nearly invisible on this panel's white background (see Colors). The list is vertically centered in whatever height the top bar leaves, not pinned to the top — five short links in a tall panel need a deliberate anchor or the space below them reads as unfinished. Each link staggers into place with its own transition delay keyed to its index — first link settles first.

### Cards
- **Shape:** 0px radius, 1px `border`-colored edge, `surface` fill, 20px internal padding.
- **Header:** an optional Label-role title (uppercase, `text-muted`) and an optional right-aligned action, separated from body content by a 16px gap rather than a rule line.

## Do's and Don'ts

### Do:
- **Do** reserve Court Lime for exactly one meaning per screen — "active," "press this," or the single number the reader should see first. Amber and red stay status-only.
- **Do** use the diagonal-cut chamfer on primary actions only — one per view, never as a general button style.
- **Do** pair every status color with a text label; color is never the only signal.
- **Do** show the gym's own name on the dashboard's top bar, never the RACKIN wordmark — Zen Dots stays on the tablet.
- **Do** build depth from the `page` → `surface` → `surface-2` step scale and border color, never from `box-shadow`.

### Don't:
- **Don't** use the old steel/chalk/signal-yellow palette (`ink-900`, `chalk-50`, `signal-yellow`, `turf-green`, `rubber-red`) anywhere — that system was fully retired when Kinetic Court was adopted, not layered underneath it.
- **Don't** add a shadow anywhere, not even a soft one on a floating overlay — depth is background-step-and-border only, with no exception for modals or cards.
- **Don't** round a corner — sharp everywhere except circular avatars and the diagonal-cut chamfer, which is a clip, not a radius.
- **Don't** put a persistent sidebar or tab row on the desktop dashboard, or a hamburger/overlay menu on the tablet — each surface keeps the navigation pattern suited to how it's actually used (see Layout).
- **Don't** use Zen Dots for anything but the RACKIN wordmark and the tablet numpad's digits — it is a novelty accent, not a general display face.
- **Don't** set real text — a label, an ID, a timestamp, a placeholder — in `text-dim`. It fails 4.5:1 contrast against every surface this system uses; `text-muted` is the darkest safe tier for anything a reader is meant to parse.
