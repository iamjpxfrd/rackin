# Set Up the Mobile Client (React Native / Expo)

This guide takes you from a fresh clone to a running Expo app on your own
phone. It covers local development only — EAS builds and app store
submission are out of scope until [[Task 2]] Phase 5 gets there.

`mobile_client/` already exists in this repo, scaffolded with
`create-expo-app`. This guide both explains how it was created and how to run
it, so it's reproducible if the folder is ever regenerated.

All commands run from the `mobile_client/` directory unless stated otherwise.

## 1. Prerequisites

| Requirement | Notes |
| --- | --- |
| Node.js 18 or later | `node --version`. Scaffolded and tested against Node 25. |
| The **Expo Go** app on a physical Android or iOS phone | Free, from the Play Store / App Store. This is the fastest path — no Android Studio, no emulator, no build step. |
| Git | To clone the repository. |

Android Studio (SDK + emulator) is **not required** for the steps below.
It only becomes necessary once the app needs a native module Expo Go doesn't
bundle (see [[Decisions/QR Scanning Uses expo-camera]] — `expo-camera` was
chosen specifically because it *is* bundled into Expo Go, unlike
`react-native-vision-camera`). Cross that bridge in Phase 3, not now.

Your phone and computer must be on the **same wifi network** — Expo's dev
server (Metro) is discovered over LAN by default.

## 2. How the scaffold was created

Already done in this repo — this is what running it again from scratch looks
like, for reference:

```bash
npx create-expo-app@latest mobile_client --template blank
```

`--template blank` gives plain JavaScript (matching `web_client`'s
convention — no TypeScript scaffolding to translate against). When prompted
about being inside an existing git repository, answer **Y** (skip — this
repo's own `.git` at the root already covers `mobile_client/`; it must not
get its own nested repository).

## 3. Install dependencies

```bash
cd mobile_client
npm install
```

Already done if you're using the committed scaffold — `node_modules/` is
gitignored, so a fresh clone needs this step.

## 4. Start the dev server

```bash
npm start
```

This starts Metro (Expo's bundler) and prints a QR code in the terminal,
plus a small menu (`a` for Android emulator, `w` for web preview, etc.).

## 5. Verify — run it on your phone

1. Open the **Expo Go** app.
2. Scan the QR code from step 4 (Android: in-app scanner; iOS: the phone's
   Camera app, which hands off to Expo Go).
3. Expect the default Expo starter screen — an "Open up App.js to start
   working on your app!" message on a plain background.

If it loads, the whole chain (Metro → LAN → Expo Go → JS bundle) works.

## 6. Troubleshooting

**`npm run build` / `npm run dev`: "Missing script"**

Those are `web_client`'s (Vite) script names, not Expo's. Use `npm start`
(or `npm run android` / `npm run ios` / `npm run web`).

**Pressed `s` at the `npm start` prompt and now it wants a "development
build" instead of Expo Go**

`s` toggles between the two modes. A development build is a *different*
workflow — it needs a custom native app installed on the phone, not the
Expo Go app, and building one locally (`npx expo run:android`) requires
Android Studio's SDK and `adb` on `PATH`. If you don't have those installed,
this is the wrong mode. Fix: stop the server (Ctrl+C), run `npm start`
again, and don't press `s` — stay on "Using Expo Go".

**`npx expo run:android` fails with `Failed to resolve the Android SDK
path` / `'adb' is not recognized`**

Expected if Android Studio isn't installed — this command compiles a real
native Android app, unlike `npm start`'s Expo Go path, and needs:

1. Android Studio installed (includes the SDK Manager).
2. An Android SDK Platform **and Android SDK Platform-Tools** installed via
   the SDK Manager (Platform-Tools is what provides `adb`).
3. `ANDROID_HOME` set to the SDK path (typically
   `%LOCALAPPDATA%\Android\Sdk` on Windows).
4. `%ANDROID_HOME%\platform-tools` added to `PATH`, then a fresh terminal.

Running this once also generates `android/` (and would generate `ios/` on
macOS) via `expo prebuild` — both are already gitignored
(`/android`, `/ios`), so this doesn't affect the repo either way. Avoid this
path entirely until a real native module actually needs it — the whole
point of choosing `expo-camera` ([[Decisions/QR Scanning Uses expo-camera]])
was to keep camera work inside Expo Go for as long as possible.

**QR code scans but the app never loads / spins forever**

Almost always a network issue — the phone can't reach Metro over LAN
(corporate/guest wifi that isolates clients, or a firewall on the dev
machine). Force it over the internet instead of LAN:

```bash
npm start -- --tunnel
```

**`npm install` reports vulnerabilities**

These come from the scaffold's own transitive dependencies (Metro, Babel,
etc.), not from any code in this repo. Do **not** run
`npm audit fix --force` reflexively — it can bump Expo/React Native to
versions that don't match each other. If a real fix is needed later, bump
the whole scaffold with `npx expo install --fix` instead, which resolves
versions Expo actually supports together.

**`expo` command not found / wrong version behavior**

Don't install `expo-cli` globally — that tool is deprecated. `npm start`
above runs the project-local `expo` binary via the `start` script in
`package.json`; there's nothing to install globally.

**Metro can't find the project / picks up files from `web_client/`**

Run every command from inside `mobile_client/`, not the repo root. The two
projects are siblings with independent `package.json`/`node_modules` — there
is no workspace link between them (yet — see Task 2 Phase 5).

## 7. What's next

This scaffold is Task 2 Phase 5's first item. See [[Task 2]] for the full
plan — notably, `mobile_client` doesn't yet have:

- The storage adapter (`web_client/src/storage/sql/` already has the SQL
  logic proven against `better-sqlite3`; Phase 2 still needs the thin
  `expo-sqlite` driver wrapper written and dropped in here).
- Any of the domain logic (`web_client/src/domain/`) or actual screens —
  those get ported in Phase 4.
- The `expo-camera` QR scanner (Phase 3).

None of that is in this scaffold on purpose — it's the empty starting point
those phases build on, not a partial port.
