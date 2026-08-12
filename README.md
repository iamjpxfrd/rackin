# RackIn – Offline-First Gym Check-In Platform

![Project Status](https://img.shields.io/badge/Status-Pre--MVP-yellow)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.5-brightgreen.svg)](https://spring.io/projects/spring-boot)
[![React](https://img.shields.io/badge/React-19.2-blue.svg)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-8.1-purple.svg)](https://vite.dev/)
[![Dexie](https://img.shields.io/badge/Dexie-IndexedDB-orange.svg)](https://dexie.org/)

RackIn is a staff-operated tablet platform that replaces the front-desk paper logbook at small gyms. It works with no wifi, no member smartphones, and no per-member cost. Staff check members in with a numpad, a QR card, or a name search — and the gym gets automatic visibility into who's lapsed, who's expiring soon, and what today's traffic looks like, all from data the front desk was already collecting by hand.

> Why "RackIn"? A weight rack is the thing every gym has and every member touches — it's the front desk equivalent of home base. "Rack in" reads the way staff already talk ("let me rack you in"), and it avoids sounding like a generic SaaS product name.

---

## ✨ Features

RackIn is built around one interaction the front desk already performs, and everything it can reveal:

- **🔢 Numpad Check-In:** The primary path, always available, zero new hardware. Staff enter a member number and get a confirmation card with the member's name and visit count for the month — written to local storage in under 200ms with no network call in the critical path.
- **📷 QR Card Check-In:** An optional accelerant, not a dependency. The tablet's own camera scans a gym-issued card that encodes the member's existing number — no member device, no app, no second identity system. Any scan failure falls back to the numpad instantly, on the same screen.
- **🔍 Name Search Fallback:** Check-in never dead-ends. Partial-name filtering resolves to the same lookup as numpad and QR, so a forgotten number is never a blocker.
- **📋 Live Activity Feed:** The live-updating equivalent of the old logbook page — timestamp, member, and check-in method, most recent first, updating without a manual refresh.
- **📉 Automatic Lapsed-Member Detection:** Surfaces every member with no check-in in 14+ days, oldest-visit-first. This is the single thing a paper logbook can never do, and the primary reason the system is worth building.
- **⏳ Expiring-Soon Detection:** Flags members whose plan lapses within 7 days, soonest-first, so staff can give a heads-up before a membership quietly runs out.
- **🧑‍💼 Staff Attribution:** Shifts change, so every check-in and payment records who was on the desk. Staff sign in once per shift; the payment sheet confirms who it will credit, with a one-tap override — so a handover nobody remembered to record is caught at the money rather than at month end. Attribution, not authentication: there is no password, deliberately, because a shared PIN would make every record *look* verified while being unverifiable.
- **💳 Registration & Payment in One Action:** New member, plan type, first payment, auto-assigned member number, and generated QR code — one flow, no double entry, no separate system.
- **📴 Offline as a Hard Requirement:** Every feature above functions fully with the device offline. There is no "waiting for connection" state anywhere in the app, by design — not graceful degradation, a constraint.

---

## 🚀 Getting Started

To get a local copy up and running, follow these simple steps:

### 1. Clone the repository:

```bash
git clone <repository_url>
cd rackin
```

### 2. Frontend Setup (Vite + React):

- Navigate to the `frontend` directory.
- Install dependencies (`npm install`).

**Start the development server:**

```bash
npm run dev
```

**Open your browser at** `http://localhost:5173`

The frontend runs entirely in the browser and requires no backend to be running — local persistence is the source of truth. This is the only step needed for the pilot deployment.

To also push to a backend, copy `frontend/.env.example` to `.env.local` and set the API URL. Leaving it unset is a supported configuration, not a broken one: the app runs offline-only, and writes still queue, so setting it later pushes the accumulated history rather than starting from empty.

```properties
VITE_RACKIN_API_URL=http://localhost:8080
```

Vite reads this at startup — restart `npm run dev` after changing it.

### 3. Backend Setup (Spring Boot — optional):

- Navigate to the `backend` directory.
- Requires **JDK 21** and **PostgreSQL 16+**. Local development runs the same engine as production, deliberately: the repositories use native SQL with Postgres-specific behaviour, and developing against H2 would leave those paths untested until deploy. H2 is used only by the test suite.
- Create the database and supply `DB_PASSWORD` first — see [Run the Backend Locally](docs/how-to/run-the-backend-locally.md), which covers role creation, the credential file, and troubleshooting.

**Start the backend:**

```bash
./mvnw spring-boot:run          # Git Bash / macOS / Linux
.\mvnw.cmd spring-boot:run      # PowerShell
```

The backend API will be available at `http://localhost:8080`. Flyway owns the schema and applies migrations on startup; Hibernate runs with `ddl-auto=validate` and will refuse to start on a mismatch rather than altering anything itself.

**Run the tests** — these need no database at all, so they work before you have finished the steps above:

```bash
./mvnw test
```

The backend is an **optional sync target, not a dependency** for any core flow. It is scheduled last precisely so the product loop is validated before the infrastructure is built. See [ADR-001](docs/architecture/ADR-001-checkin-input-and-offline-architecture.md).

---

## 🔐 Authentication

Every `/api/**` endpoint requires a shared key on the `Authorization` header:

```
Authorization: Bearer <RACKIN_API_KEY>
```

The backend **refuses to start** without `RACKIN_API_KEY` set — the same rule the project already applies to `DB_PASSWORD`. An API that answers with the gym's full membership and payment history must never come up open, and a default key would be worse than none: the app would look protected while accepting a key anyone can read in the repository.

`/actuator/health` and the Swagger endpoints stay open. Health carries no gym data and a deploy has to be able to ask whether the service is up; Swagger describes the shape of the API rather than its contents, and is disabled outright in the `prod` profile.

**A key, not a login, because the client is a device.** There is no user model here — staff attribution records *who was at the desk* and proves nothing (that's the point of it). Per-person authentication belongs with the owner dashboard, where the caller is a human and the threat is someone outside the gym.

### ⚠️ What this does and does not protect

| | |
| --- | --- |
| ✅ **Stops** | Anyone who can reach the host reading or writing the gym's data. Before this, that was every unauthenticated request. |
| ❌ **Does not stop** | Someone holding the tablet. The key ships inside the browser bundle, so devtools reveals it. |

That second row is a real limit, not an oversight: **a browser application cannot hold a secret from its own user.** Anything shipped to the client is readable by whoever has the client. What the key buys is turning "anyone who finds the URL" into "anyone who has the tablet" — a meaningful step for a device that sits behind a front desk, and the honest ceiling for this class of client.

Do not read this section as "the API is secure". Read it as "the API is closed to the internet".

---

## 📖 API Reference (Swagger)

With the backend running, the API documents itself:

| | |
| --- | --- |
| **Swagger UI** | [http://localhost:8080/swagger-ui.html](http://localhost:8080/swagger-ui.html) |
| **OpenAPI spec** | [http://localhost:8080/v3/api-docs](http://localhost:8080/v3/api-docs) |

Both are **disabled in the `prod` profile** — the public sync target ships no API explorer.

Every endpoint mirrors a frontend domain function 1:1. The backend introduces no business logic of its own, only persistence and a network transport for it (TRD §5).

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/members` | Register a member **and** their first payment, in one call |
| `GET` | `/api/members/{id}/status` | Derived membership status |
| `POST` | `/api/checkins` | Record a check-in |
| `GET` | `/api/checkins/lapsed?days=14` | Members who have stopped coming |
| `POST` | `/api/payments` | Record a renewal |
| `GET` | `/api/payments/expiring?days=7` | Memberships about to lapse |

Three things about these that are easy to miss, and all three exist because the client is a tablet that may have been offline for hours:

- **`clientUuid` is an idempotency key, not a comment.** Replaying a request returns the original result rather than creating a second member, double-counting a visit, or extending a membership twice.
- **Writes accept the tablet's own timestamps** (`createdAt`, `paidAt`, `timestamp`). A check-in recorded at 6am and pushed at 9pm is stored at 6am. Omit them and the server fills them in.
- **Registration accepts a `memberId` the tablet already assigned offline**, because that number is printed on the member's QR card. A `409` means the number belongs to someone else.

Try it: `POST /api/members` on an empty database returns `"memberId": "1001"` — ids are sequential strings starting at 1001. To inspect what landed, see [inspect-the-database.sql](docs/how-to/inspect-the-database.sql).

---

## 🏗️ Architecture

```
React Frontend (Vite - Port 5173)
       ↓
Domain Layer (checkInMember / registerMember / recordPayment)
       ↓
IndexedDB via Dexie  ← SOURCE OF TRUTH
       │
       ├── local record  ──┐
       └── outbox entry  ──┘  one transaction, so a queued write cannot be lost
                 ↓
Sync Queue (optional — after each write, on `online`, and on a retry timer)
                 ↓
Spring Boot Backend (Port 8080)
                 ↓
PostgreSQL
```

The domain layer sits between UI and storage so that numpad, QR scan, and name search all call the **same** `checkInMember(memberId, method)` function — no duplicated business logic per input method. The sync step is drawn deliberately outside the critical path: nothing in check-in waits on it, checks its status, or degrades if it never runs.

The local record and its queue entry commit **together**. Queuing after the write would leave a crash window in which a member exists on the tablet but is never pushed — the worst kind of loss, because the tablet would still show them and nothing anywhere would report it.

---

## 🛠️ Tech Stack

- **Frontend**: ReactJS 19 (Vite 8, single-page app)
- **Styling**: Tailwind CSS 4
- **Local Storage**: IndexedDB via [Dexie.js](https://dexie.org/) — source of truth for the pilot
- **Backend**: Spring Boot 3.5 (Java 21, Spring Data JPA, Bean Validation)
- **Database**:
  - IndexedDB (on-tablet, authoritative)
  - PostgreSQL (backend sync target, and local development — same engine as production)
  - H2 (backend test suite only, so tests need no running database)
- **Schema migrations**: Flyway (`ddl-auto=validate` — Hibernate never alters a schema)
- **API docs**: springdoc-openapi → Swagger UI, disabled in production
- **QR Generation & Scanning**: Client-side JS libraries — no server round-trip, no per-member cost
- **Hosting (pilot)**: Static build, served from the tablet itself — $0, no infrastructure required

---

## 📴 Offline-First System Details

RackIn treats connectivity as absent by default rather than as a degraded case:

1. **Local writes only**: Every check-in, registration, and payment is written to IndexedDB immediately. No network call sits in any user-facing path.
2. **Client-assigned identity**: `member.id` is a sequential string (`"1001"`, `"1002"`, …) assigned on the tablet — a database auto-increment can't be assigned safely offline, which is why the id is not an integer PK.
3. **Sync idempotency**: Every local record carries a client-generated `clientUuid`. The backend looks it up before writing and replays the original result, so a sync retried after a lost response can never duplicate a member, inflate a visit count, or extend a membership twice.
4. **Real timestamps, not arrival times**: Each queued write carries the moment it actually happened. Without this, a day of offline check-ins pushed at closing time would land together and read as one simultaneous rush — and the lapsed report reads exactly that data.
5. **One-way push**: Sync runs tablet → backend only. The tablet stays authoritative and the backend never pushes changes down; with one device at pilot scope there is nothing to reconcile, and two-way sync would introduce conflict resolution the product does not need. A record created directly on the backend will therefore never appear on the tablet.
6. **Three triggers**: after every local write (the common case when the wifi works), on the browser's `online` event (drain what accumulated offline), and on a retry timer that runs **only while the queue is non-empty** — covering wifi that reports `online` but has no route to the backend, which fires no event when the route returns. The timer stops when the queue drains, so an idle tablet polls nothing.
7. **Ordered draining**: the queue drains oldest-first and stops at the first retryable failure rather than skipping past it. A payment that outran its registration would be refused for an unknown member, turning one transient failure into a run of permanent ones.
8. **Silent failure**: Sync errors never surface to staff. The queue stays intact and retries — a sync failure has zero impact on gym operations, so surfacing it would only create confusion with no actionable next step. A `4xx` is the one thing not retried: the backend understood the request and refused it, so it is set aside and kept for debugging instead of wedging everything behind it.

### Checking on sync

Because failures are silent by design, there is no UI that will ever tell you a record did not arrive. Dev builds expose the queue on the console instead (stripped from production):

```js
await window.rackinSync.pending()        // still waiting to be pushed
await window.rackinSync.rejected()       // refused by the backend, reason on lastError
await window.rackinSync.push()           // push now, without waiting for a trigger
await window.rackinSync.retryRejected()  // re-queue refusals after fixing the cause
await window.rackinSync.resync()         // rebuild the queue from every local record
await window.rackinSync.wipeLocal()      // erase local data — next member is #1001 again
await window.rackinSync.wipeLocal({ keepStaff: true })   // …but keep the staff list
```

**Clearing test data between runs** takes both sides, tablet first — otherwise a
sync repopulates the backend in between:

```js
await window.rackinSync.wipeLocal({ keepStaff: true })   // then reload the page
```

```bash
psql -U rackin_app -h localhost -d rackin -f docs/how-to/flush-all-data.sql
```

`resync()` is the answer when the backend's copy has diverged and the tablet's version is the one to trust, which it always is. It is safe to run repeatedly: the backend dedupes on `clientUuid`, so records already there are accepted as no-ops and only the genuinely missing ones are written.

---

## 🚫 Explicitly Not in the MVP

Scope is held small on purpose so the pilot is finishable and testable:

| Deferred feature                            | Why                                                           |
| ------------------------------------------- | ------------------------------------------------------------- |
| Member-facing app or login                  | Violates the "member needs nothing" constraint                |
| Multi-gym / multi-device support            | Single-gym, single-device pilot first                         |
| Online payment processing                   | RackIn _records_ that payment happened; it doesn't process it |
| Automated billing reminders / auto-renewal  | Not needed to validate the core value                         |
| Class scheduling or trainer booking         | Unrelated to the sign-in/membership loop                      |
| Additional plan types (annual, punch cards) | Data model supports it later; not needed for the pilot        |

---

## 📚 Documentation

- [ADR-001 — Check-in input methods & offline architecture](docs/architecture/ADR-001-checkin-input-and-offline-architecture.md)
- [ADR-002 — Why the backend was built before the pilot required it](docs/architecture/ADR-002-build-the-backend-before-the-pilot.md)
- [PRD — User stories & acceptance criteria](docs/architecture/prd.md)
- [TRD — Domain contract & sync API](docs/architecture/trd.md)
- [Backend Schema — Tables, constraints, indexes](docs/architecture/backend-schema.md)
- [System Design — Consolidated architecture view](docs/architecture/system-design.md)
- [App Flow — Screen-to-screen paths](docs/design/app-flow.md)
- [Design System — Visual language & component specs](docs/design/design-system.md)
- [Frontend Spec — Screen-by-screen behaviour & open decisions](docs/design/frontend-spec.md)

**How-to guides**

- [Run the Backend Locally](docs/how-to/run-the-backend-locally.md) — database setup, credentials, troubleshooting
- [Inspect the Database](docs/how-to/inspect-the-database.sql) — ready-to-run queries for checking what synced
- [Flush All Data](docs/how-to/flush-all-data.sql) — **destructive**; clears pilot test data from the backend

---

## ✅ Validating the Pilot

Rather than interviews first, RackIn is validated by putting a working build in front of one gym owner and watching what actually happens — observed, not self-reported:

1. **Adoption:** staff use the app without being reminded to, within the first week.
2. **Displacement:** the paper logbook visibly falls out of use.
3. **Owner action:** shown the lapsed-members list, the owner acts on at least one entry rather than just acknowledging it.

If these are genuinely true, that's the signal to invest in cloud sync, a second device, or further features. If not, that's equally valuable to know before building further.

---

## 👨‍💻 Project Team

| Profile                                                                      | Name                  | Role                       | GitHub Username                            |
| ---------------------------------------------------------------------------- | --------------------- | -------------------------- | ------------------------------------------ |
| <img src="https://avatars.githubusercontent.com/u/112413548?v=4" width="50"> | Darwin Darryl Jean E. Largoza | Developer / UI-UX Designer | [@Dadaisuk1](https://github.com/Dadaisuk1) |

---

## 🙏 Acknowledgments

- The pilot gym's owner and front-desk staff, whose paper logbook defined the actual requirements
- [Dexie.js](https://dexie.org/) for making IndexedDB usable as a real offline source of truth
- [Spring Boot](https://spring.io/projects/spring-boot) and [Vite](https://vite.dev/) for the project scaffolding

---

## ⚖️ License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

**Copyright (c) 2026 RackIn contributors**

---

## ⚠️ Disclaimer

**Unless a backend is configured, the tablet is the only copy of the data.** IndexedDB on a single device is the source of truth, and sync is off by default — if the tablet is lost, wiped, or damaged, the gym's check-in and payment history goes with it. This is an accepted pilot-scope risk, not an oversight; the paper logbook remains the fallback until the device is replaced.

Sync is implemented and can be switched on by setting `VITE_RACKIN_API_URL`, which removes that single-copy risk. It does **not** yet make RackIn safe as a system of record for financial or membership disputes: the backend is a push target, not a verified ledger, and a record refused by the backend is set aside silently by design. Reconcile against the tablet before relying on either side in a dispute.

**One device only.** The tablet and backend both assign member numbers starting at 1001, by different formulas that agree only while a single tablet is the sole writer. Adding a second device without solving id allocation will collide — and the failure is not clean: a colliding registration is refused while the payments that reference it are accepted onto whichever member already holds that number. Tracked as OD-8 in the [frontend spec](docs/design/frontend-spec.md).

---

## 📫 Contact

For any inquiries or feedback, please contact the project team via their GitHub profiles listed above.
