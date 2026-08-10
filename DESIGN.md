---
name: RackIn
description: A gym-equipment control panel for the front desk, not a SaaS dashboard.
colors:
  ink-900: "#15181C"
  steel-700: "#3A4046"
  steel-300: "#C7CDD3"
  chalk-50: "#F1F2F0"
  surface-white: "#FFFFFF"
  signal-yellow: "#F2B705"
  rubber-red: "#C43D3D"
  turf-green: "#3F8F5F"
typography:
  numeral:
    fontFamily: "Archivo Black, Barlow Condensed SemiBold, system-ui, sans-serif"
    fontSize: "40px"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "normal"
  display:
    fontFamily: "Inter, IBM Plex Sans, system-ui, sans-serif"
    fontSize: "32px"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "normal"
  headline:
    fontFamily: "Inter, IBM Plex Sans, system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "normal"
  label:
    fontFamily: "Inter, IBM Plex Sans, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "0.08em"
  body:
    fontFamily: "Inter, IBM Plex Sans, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "normal"
  mono:
    fontFamily: "IBM Plex Mono, ui-monospace, monospace"
    fontSize: "16px"
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "normal"
  caption:
    fontFamily: "Inter, IBM Plex Sans, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.3
    letterSpacing: "normal"
rounded:
  sm: "6px"
  lg: "12px"
components:
  numpad-key:
    backgroundColor: "{colors.surface-white}"
    textColor: "{colors.ink-900}"
    typography: "{typography.numeral}"
    rounded: "{rounded.sm}"
    size: "72px"
  numpad-key-confirm:
    backgroundColor: "{colors.signal-yellow}"
    textColor: "{colors.ink-900}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    height: "72px"
  status-badge-active:
    backgroundColor: "{colors.turf-green}"
    textColor: "{colors.turf-green}"
    typography: "{typography.caption}"
    rounded: "{rounded.sm}"
  status-badge-expired:
    backgroundColor: "{colors.rubber-red}"
    textColor: "{colors.rubber-red}"
    typography: "{typography.caption}"
    rounded: "{rounded.sm}"
  status-badge-expiring:
    backgroundColor: "{colors.signal-yellow}"
    textColor: "{colors.ink-900}"
    typography: "{typography.caption}"
    rounded: "{rounded.sm}"
  confirmation-card:
    backgroundColor: "{colors.surface-white}"
    textColor: "{colors.ink-900}"
    typography: "{typography.display}"
    rounded: "{rounded.lg}"
    padding: "32px"
  activity-feed-row:
    backgroundColor: "{colors.surface-white}"
    textColor: "{colors.ink-900}"
    typography: "{typography.body}"
    height: "56px"
  tab-bar-item:
    backgroundColor: "{colors.chalk-50}"
    textColor: "{colors.steel-700}"
    typography: "{typography.caption}"
    height: "64px"
---

# Design System: RackIn

## Overview

**Creative North Star: "The Gym Equipment Control Panel"**

RackIn's one screen-job is getting a staff member from "who just walked in" to "checked in, confirmed" in under two seconds, standing up, often one-handed, under variable light, repeated every twenty seconds at peak. That job is the brief — this is a **tool that lives on a counter**, closer in spirit to a point-of-sale terminal, a shop scale, or gym equipment itself than to a SaaS product or admin dashboard.

The numpad is the signature element and the brand: every other screen stays quiet and functional so the numpad can read as a physical control — chunky, high-contrast, satisfying to press, styled after gym equipment keypads and weight-plate numerals rather than a generic phone dialer. The palette pulls from gym hardware itself: brushed steel, rubber flooring, chalk dust, and the one warning-tape yellow found on a loading bay.

Deliberately rejected: warm cream + terracotta serif, near-black + acid-neon accent, and broadsheet hairline-rule newspaper — the three generic AI-design defaults, none of which read as "gym equipment control panel."

**Key Characteristics:**
- The numpad is treated as a physical control, not a form input.
- Near-neutral steel/chalk base keeps the interface calm and legible under variable front-desk lighting.
- Color carries meaning only — yellow means "press this," red/green mean expired/active — never decoration.
- Flat, solid, pressable surfaces; no glassy neumorphism.
- Minimal, purposeful motion only; nothing decorative or scroll-triggered.

## Colors

Near-neutral steel and chalk base with three meaning-only accents; nothing decorative.

### Primary
- **Signal Yellow** (`#F2B705`): the single "press this" signal — primary/confirm actions, active tab indicator. A nod to warning-tape yellow on gym equipment. Never used for text-on-white (fails contrast) — fill only, behind dark text.

### Secondary
- **Turf Green** (`#3F8F5F`): active/paid/success state only — status badges, confirmation check icon. Reserved strictly for status meaning.
- **Rubber Red** (`#C43D3D`): lapsed/expired/destructive state only — status badges, alerts. Reserved strictly for status meaning.

### Neutral
- **Ink 900** (`#15181C`): primary text, key numerals — the darkest tone in the system.
- **Steel 700** (`#3A4046`): secondary text, icons, inactive tab items.
- **Steel 300** (`#C7CDD3`): borders, dividers, disabled states.
- **Chalk 50** (`#F1F2F0`): app background.
- **Surface White** (`#FFFFFF`): cards, numpad keys, elevated surfaces.

### Named Rules
**The Meaning-Only Color Rule.** Yellow, red, and green never decorate. Yellow means "press this," green means active/paid, red means expired/lapsed — nothing else on screen carries color, so staff can scan status at a glance without reading text. (Confirmed during the system's own critique pass: an initial idea to color-code tab bar icons was cut for exactly this reason — the tab bar stays monochrome steel.)

## Typography

**Display / Numeral Font:** Archivo Black, with Barlow Condensed SemiBold as an alternate (system-ui fallback)
**Body Font:** Inter, with IBM Plex Sans as an alternate (system-ui fallback)
**Label/Mono Font:** IBM Plex Mono (ui-monospace fallback)

**Character:** A heavy, slightly condensed grotesk carries numerals and big status numbers — readable from arm's length, fast, industrial. A plain, highly legible grotesk carries names, lists, and buttons — nothing decorative, this is a tool, not a magazine. Mono reinforces "this is a fixed identifier" for member numbers and timestamps, so columns of numbers scan cleanly.

### Hierarchy
- **Numeral** (800, 40px, line-height 1): numpad digits and other large status numbers (visit counts, days-until-expiry). Must read from arm's length instantly.
- **Display** (700, 32px, line-height 1.15): the confirmation card's member name — the single most important thing on screen at the moment it appears.
- **Headline** (700, 24px, line-height 1.2): screen titles.
- **Label** (600, 13px, uppercase, tracked 0.08em): section eyebrows.
- **Body** (400–500, 18px, line-height 1.4): list items, buttons, names in lists.
- **Mono** (500, 16px): member numbers.
- **Caption** (400, 14px): timestamps and secondary metadata.

### Named Rules
**The Arm's-Length Rule.** Numerals that a staff member must read at a glance while standing (numpad digits, visit counts) never drop below the Numeral role's weight and size. This is a speed-under-pressure tool; type never gets precious at the expense of legibility.

## Layout

Single-column, full-bleed on tablet, no navigation chrome to hunt through. Tablet landscape runs two-pane — numpad/input on the left, live activity feed on the right — collapsing to a single stacked column on portrait (numpad/input on top, feed below), which is the primary orientation on the pilot's target device (a budget Android tablet). A thin top bar (product/gym label) sits above the content; a persistent tab bar with four large touch targets (Check-In / Lapsed / Members / New Member) sits fixed at the bottom, since staff switch between these constantly and cannot afford a hamburger menu or nested navigation.

All interactive touch targets are generous (minimum 56px height; numpad keys 72px) — built for speed under pressure, not precision tapping.

### Named Rules
**The One-Tap-Away Rule.** Every core destination (Check-In, Lapsed, Members, New Member) stays reachable in exactly one tap, always visible, no menu to open first.

## Elevation & Depth

Flat surfaces with a single subtle shadow — not soft neumorphism. Depth should read as solid and pressable (like a mechanical key), never glassy or floating. The numpad key is the one place depth actively communicates state: it starts elevated and visibly compresses on press.

### Shadow Vocabulary
- **Key-rest** (`box-shadow: 0 4px 0 var(--steel-300)`): numpad key at rest — a hard, mechanical shadow, not a soft ambient one.
- **Key-pressed** (`box-shadow: 0 1px 0 var(--steel-300)`, `transform: translateY(2px)`): numpad key mid-press — shadow compresses as the key travels down, mimicking a physical click.
- **Card-elevation** (soft drop shadow, standard card elevation): confirmation card and other overlays — the one place a softer shadow is appropriate, since it's floating above the page, not simulating a mechanical surface.

### Named Rules
**The Mechanical-Not-Ambient Rule.** Shadows on interactive controls (numpad keys) are hard-edged and state-driven, simulating a physical mechanism. Shadows on passive containers (cards) may be soft and ambient. Don't mix the two vocabularies on the same element.

## Shapes

Squared corners with a small, consistent radius (6px) on most surfaces — enough to feel modern without reading as playful or consumer. The confirmation card, as the one moment of celebration in the app, gets a slightly larger radius (12px) to feel a touch softer than the workaday controls around it. No pill shapes, no fully rounded buttons anywhere in the system.

## Components

### Numpad key
The signature component and the brand's core physical metaphor — styled after gym equipment keypads and weight-plate numerals.
- **Shape:** 72×72px minimum touch target, 6px radius, 1px `steel-300` border, `surface-white` fill.
- **Digit:** `ink-900`, Numeral role (Archivo Black, 40px, 800).
- **Press state:** `translateY(2px)`, shadow compresses from Key-rest to Key-pressed — mimics a mechanical click, ~80ms.
- **Confirm/Check-In key:** full-width, `signal-yellow` fill, `ink-900` text, same press mechanic. Disabled state (until a valid number is entered): `steel-300` fill, no shadow.

### Status badge
- **Active:** `turf-green` background at 12% opacity, `turf-green` text, small dot indicator, label "Active".
- **Expired / Lapsed:** `rubber-red` background at 12% opacity, `rubber-red` text, small dot indicator, label "Expired".
- **Expiring soon:** `signal-yellow` background at 16% opacity, `ink-900` text, label "Expiring soon".
- Color is never the only signal — every badge pairs its color with a text label.

### Activity feed row
- Mono timestamp (`steel-700`) + member number, name in Body role, check-in method icon (numpad / QR / search) at the trailing edge.
- 56px row height, 1px `steel-300` divider between rows.

### Confirmation card
The one moment of celebration in an otherwise purely functional app — appears on every successful check-in.
- **Shape:** centered overlay, `surface-white`, 12px radius, Card-elevation drop shadow.
- **Content:** member name at Display role (32px/700), "Visit #N this month" in Mono role at `steel-700`, `turf-green` check icon.
- **Behavior:** scale+fade entrance (~150ms), auto-dismisses after 2.5s, tapping anywhere dismisses early. Respects `prefers-reduced-motion` (drops to an instant state change).

### Inputs / Fields
- **Style:** `steel-300` 1px border, `surface-white` fill, 6px radius, Body-role text.
- **Focus:** `steel-700` 2px outline, visible for any external keyboard use.

### Navigation (tab bar)
- 4 items, icon + label, 64px height, `chalk-50` background.
- **Active:** `ink-900` icon/label, 2px `signal-yellow` top border.
- **Inactive:** `steel-700` icon/label.

## Do's and Don'ts

### Do:
- **Do** treat the numpad as a physical control, not a form: real press depth, a distinct confirm key, nothing rounded-pill or flat-default about it.
- **Do** reserve yellow, red, and green strictly for their assigned meanings (press / expired / active) — never as decoration elsewhere on screen.
- **Do** pair every status color with a text label; color is never the only signal.
- **Do** keep every touch target at least 56px (72px for numpad keys) — this is a speed tool used under pressure.
- **Do** respect `prefers-reduced-motion` on the confirmation card and any other authored motion.

### Don't:
- **Don't** use warm cream + terracotta serif, near-black + neon accent, or broadsheet hairline-newspaper styling — all three were explicitly rejected as generic AI-design defaults that don't read as "gym equipment control panel."
- **Don't** add a hamburger menu, nested navigation, or hide any of the four core destinations behind a menu.
- **Don't** use `signal-yellow` as text-on-white — it fails contrast; fill only, behind dark text.
- **Don't** add decorative motion (parallax, page-load choreography, scroll-triggered reveals) — this app is used by someone standing at a counter mid-task, not browsing.
