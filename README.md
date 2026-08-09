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

### 3. Backend Setup (Spring Boot — optional):

- Navigate to the `backend` directory.
- Requires JDK 21.
- Runs against H2 out of the box for local development; PostgreSQL is the production target.

**Start the backend:**

```bash
./mvnw spring-boot:run
```

The backend API will be available at `http://localhost:8080`

The backend is an **optional sync target, not a dependency** for any core flow. It is scheduled last (Phase 8) precisely so the product loop is validated before the infrastructure is built. See [ADR-001](docs/architecture/ADR-001-checkin-input-and-offline-architecture.md).

---

## 🏗️ Architecture

```
React Frontend (Vite - Port 5173)
       ↓
Domain Layer (checkInMember / registerMember / recordPayment)
       ↓
IndexedDB via Dexie  ← SOURCE OF TRUTH
       ↓
Sync Queue (optional, fires on browser `online` event)
       ↓
Spring Boot Backend (Port 8080)
       ↓
PostgreSQL (H2 for local dev)
```

The domain layer sits between UI and storage so that numpad, QR scan, and name search all call the **same** `checkInMember(memberId, method)` function — no duplicated business logic per input method. The sync step is drawn deliberately outside the critical path: nothing in check-in waits on it, checks its status, or degrades if it never runs.

---

## 🛠️ Tech Stack

- **Frontend**: ReactJS 19 (Vite 8, single-page app)
- **Styling**: Tailwind CSS 4
- **Local Storage**: IndexedDB via [Dexie.js](https://dexie.org/) — source of truth for the pilot
- **Backend**: Spring Boot 3.5 (Java 21, Spring Data JPA, Bean Validation)
- **Database**:
  - IndexedDB (on-tablet, authoritative)
  - PostgreSQL (backend sync target)
  - H2 (local backend development)
- **QR Generation & Scanning**: Client-side JS libraries — no server round-trip, no per-member cost
- **Hosting (pilot)**: Static build, served from the tablet itself — $0, no infrastructure required

---

## 📴 Offline-First System Details

RackIn treats connectivity as absent by default rather than as a degraded case:

1. **Local writes only**: Every check-in, registration, and payment is written to IndexedDB immediately. No network call sits in any user-facing path.
2. **Client-assigned identity**: `member.id` is a sequential string (`"1001"`, `"1002"`, …) assigned on the tablet — a database auto-increment can't be assigned safely offline, which is why the id is not an integer PK.
3. **Sync idempotency**: Every local record carries a client-generated `clientUuid`. The backend upserts on that key, so a retried or interrupted sync can never duplicate a check-in or payment.
4. **One-way push**: Sync runs tablet → backend only, batched, triggered on the browser's `online` event rather than polled. The tablet stays authoritative; no multi-device conflict resolution is needed at pilot scope.
5. **Silent failure**: Sync errors never surface to staff. The queue stays intact and retries — a sync failure has zero impact on gym operations, so surfacing it would only create confusion with no actionable next step.

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
- [PRD — User stories & acceptance criteria](docs/architecture/prd.md)
- [TRD — Domain contract & sync API](docs/architecture/trd.md)
- [Backend Schema — Tables, constraints, indexes](docs/architecture/backend-schema.md)
- [System Design — Consolidated architecture view](docs/architecture/system-design.md)
- [App Flow — Screen-to-screen paths](docs/design/app-flow.md)
- [Design System — Visual language & component specs](docs/design/design-system.md)

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
| <img src="https://avatars.githubusercontent.com/u/112413548?v=4" width="50"> | Darwin Darryl Largoza | Developer / UI-UX Designer | [@Dadaisuk1](https://github.com/Dadaisuk1) |

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

**During the pilot, the tablet is the only copy of the data.** IndexedDB on a single device is the source of truth, and cloud sync is not enabled — if the tablet is lost, wiped, or damaged, the gym's check-in and payment history goes with it. This is an accepted pilot-scope risk, not an oversight; the paper logbook remains the fallback until the device is replaced. Do not treat RackIn as a system of record for financial or membership disputes until backend sync is deployed.

---

## 📫 Contact

For any inquiries or feedback, please contact the project team via their GitHub profiles listed above.
