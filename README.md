# RackIn

**A staff-operated, offline-first check-in system for small gyms.**

RackIn replaces the front-desk paper logbook with a tablet app that
works with no wifi, no member smartphones, and no per-member cost.
Staff check members in with a numpad, a QR card, or a name search —
and get automatic visibility into who's lapsed, who's expiring soon,
and what today's traffic looks like, all from data the front desk was
already collecting by hand.

> Why "RackIn"? A weight rack is the thing every gym has and every
> member touches — it's the front desk equivalent of home base. "Rack
> in" reads the way staff already talk ("let me rack you in"), and it
> avoids sounding like a generic SaaS product name.

## Status

🟡 **Pre-MVP** — architecture and design system finalized, pilot build
in progress for a single gym.

## Why this exists

A logbook only stores what's written down. It can't tell an owner who
stopped showing up, whose membership quietly expired while they kept
checking in, or what attendance looks like over time. RackIn answers
all of that automatically from the same front-desk interaction that
used to just produce a page of handwriting.

## Core principles

- **Offline-first, always.** The app must fully function with no
  network connection. Local storage is the source of truth for the
  pilot; cloud sync is optional and additive, never required.
- **Nothing required of the member.** No app to install, no login, no
  smartphone, no data plan. A member needs only a number they can
  remember — a QR card is a convenience layer on top of that, not a
  replacement for it.
- **Staff-operated.** One tablet, one person entering data. Every
  interaction is designed to be fast enough to survive a busy front
  desk.
- **Small first, expand later.** Built and piloted for one gym, one
  device. Multi-location, online payments, and class scheduling are
  explicitly out of scope until the pilot proves the core loop.

## Features (MVP)

- Numpad check-in by member number
- QR card check-in (optional, resolves to the same member lookup as
  the numpad — see [ADR-001](docs/architecture/ADR-001-checkin-input-and-offline-architecture.md))
- Name search fallback
- Live "today's activity" feed
- Automatic **lapsed members** list (no check-in in 14+ days)
- Automatic **expiring soon** list (plan lapses within 7 days)
- On-the-spot new member registration + payment recording
- Weekly / monthly plan support, structured for more plan types later

## Explicitly not in the MVP

- Member-facing app or login
- Multi-gym / multi-device support
- Online payment processing (records that payment happened; doesn't
  process it)
- Automated billing reminders or auto-renewal
- Class scheduling or trainer booking

See [docs/architecture](docs/architecture) for the full reasoning
behind these boundaries.

## Repository structure

```
rackin/
├── src/
│   ├── components/     # UI components (numpad, activity feed, member list, etc.)
│   ├── db/             # Local persistence layer (IndexedDB) — single storage interface
│   ├── lib/            # Domain logic: checkInMember, registerMember, recordPayment, etc.
│   └── styles/         # Design tokens (see docs/design/design-system.md)
├── public/              # Static assets
├── docs/
│   ├── architecture/    # ADRs
│   └── design/          # Design system spec
├── package.json
└── README.md
```

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| UI | React (single-page app) | Component reuse across numpad / QR / search input adapters, see ADR-001 |
| Local storage | IndexedDB (via Dexie.js) | Fully offline, survives restarts, no server dependency for v1 |
| QR generation/scanning | Client-side JS libraries | No server round-trip, no per-member cost |
| Hosting (pilot) | Static build, runs from the tablet | $0, no infrastructure required |
| Future sync (optional) | Supabase (or similar) | Free tier, good offline/online reconciliation, additive only |

## Getting started

```bash
git clone https://github.com/<your-org>/rackin.git
cd rackin
npm install
npm run dev
```

The app runs entirely in the browser — no backend setup is required
for local development or for the pilot deployment.

## Documentation

- [ADR-001: Check-in input methods & offline architecture](docs/architecture/ADR-001-checkin-input-and-offline-architecture.md)
- [Design system](docs/design/design-system.md)

## Validating the pilot

Rather than interviews first, RackIn is validated by putting a working
build in front of one gym owner and watching what actually happens:
does staff use it unprompted, does the paper logbook fall out of use,
and does the owner act on the lapsed-members list. See
[docs/architecture](docs/architecture) for the reasoning behind this
approach.

## License

MIT — see [LICENSE](LICENSE).
