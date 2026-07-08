# Contributing to RackIn

RackIn is intentionally small right now — a single-gym pilot, not a
general product. Contributions are welcome, but please read the
project's boundaries before proposing new features.

## Before you open a PR

1. **Check the ADRs in `docs/architecture`.** If your change touches
   check-in flow, storage, or input methods, it likely intersects
   with a documented decision. Propose a new ADR if you're overriding
   one.
2. **Check the design system in `docs/design`.** UI changes should
   derive colors, type, and spacing from the existing tokens rather
   than introducing new ad hoc values.
3. **Respect the offline-first constraint.** Nothing in `src/lib`
   (the domain layer) should assume a network connection is
   available. If a feature needs one, it belongs behind the optional
   sync layer, not the core check-in path.

## Project structure

- `src/lib/` — domain logic (`checkInMember`, `registerMember`,
  `recordPayment`, `getLapsedMembers`, `getExpiringMembers`). All
  input methods (numpad, QR, search) call into this layer — don't
  duplicate business logic per input method.
- `src/db/` — the single persistence interface (IndexedDB via Dexie).
  Swappable later for a sync-enabled backend without touching UI or
  domain logic.
- `src/components/` — UI only. Should not talk to `src/db` directly;
  go through `src/lib`.

## Local development

```bash
npm install
npm run dev
```

## Commit style

Plain, descriptive commit messages in the imperative mood
("Add lapsed members query", not "Added" or "Adding"). No strict
format enforced yet at this project size.

## Scope for the pilot

Please don't open PRs for: multi-gym support, online payment
processing, member-facing app/login, or class scheduling. These are
explicitly deferred — see the README and ADR-001 for why.
