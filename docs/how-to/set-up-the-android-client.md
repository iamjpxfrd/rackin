# Set Up the Android Client (React Native / Expo)

`android/` is deliberately empty right now — this guide walks through
scaffolding it yourself with `create-expo-app`, so the setup is something
you've actually done rather than something that showed up pre-built.

It covers local development only — EAS builds and app store submission are
out of scope until [[Task 2]] Phase 5 gets further along.

All commands run from the repo root unless stated otherwise.

## 1. Prerequisites

| Requirement | Notes |
| --- | --- |
| Node.js 18 or later | `node --version`. Verified against Node 25. |
| The **Expo Go** app on a physical Android or iOS phone | Free, from the Play Store / App Store. This is the fastest path — no Android Studio, no emulator, no build step. |
| Git | To clone the repository. |

Android Studio (SDK + emulator) is **not required** for the steps below.
It only becomes necessary once the app needs a native module Expo Go doesn't
bundle (see [[Decisions/QR Scanning Uses expo-camera]] — `expo-camera` was
chosen specifically because it *is* bundled into Expo Go, unlike
`react-native-vision-camera`). Cross that bridge in Phase 3, not now — see
the troubleshooting section below if you end up there by accident.

Your phone and computer must be on the **same wifi network** — Expo's dev
server (Metro) is discovered over LAN by default.

## 2. Scaffold the project

The `android/` folder already exists (empty, tracked in git so the repo
layout is visible) — scaffold into it directly:

```bash
npx create-expo-app@latest android --template blank
```

`--template blank` gives plain JavaScript, matching `server/`'s convention —
no TypeScript scaffolding to translate against.

You'll be asked: **"You are creating a project inside of an existing Git
repository. Skip initializing a new git repository?"** — answer **Y**. This
repo's own `.git` at the root already covers `android/`; it must not get a
nested repository of its own.

This also installs dependencies for you (`npm install` runs as part of the
scaffold) — no separate install step needed.

## 3. Start the dev server

```bash
cd android
npm start
```

This starts Metro (Expo's bundler) and prints a QR code in the terminal,
plus a small menu (`a` for Android emulator, `w` for web preview, etc.).

## 4. Verify — run it on your phone

1. Open the **Expo Go** app.
2. Scan the QR code from step 3 (Android: in-app scanner; iOS: the phone's
   Camera app, which hands off to Expo Go).
3. Expect the default Expo starter screen — an "Open up App.js to start
   working on your app!" message on a plain background.

If it loads, the whole chain (Metro → LAN → Expo Go → JS bundle) works.

## 5. Troubleshooting

**`npm run build` / `npm run dev`: "Missing script"**

Those are `server/`'s (Vite) script names, not Expo's. Use `npm start` (or
`npm run android` / `npm run ios` / `npm run web`).

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

Running this once also generates a native `android/` subfolder inside the
project (and would generate `ios/` on macOS) via `expo prebuild` — both are
gitignored by the scaffold's own `.gitignore` (`/android`, `/ios`), so this
doesn't pollute the repo either way. Avoid this path entirely until a real
native module actually needs it — the whole point of choosing `expo-camera`
([[Decisions/QR Scanning Uses expo-camera]]) was to keep camera work inside
Expo Go for as long as possible.

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

**Metro can't find the project / picks up files from `server/`**

Run every command from inside `android/`, not the repo root. The two
projects are siblings with independent `package.json`/`node_modules` — there
is no workspace link between them (yet — see Task 2 Phase 5).

## 6. What's next

This scaffold is Task 2 Phase 5's first item. See [[Task 2]] for the full
plan — notably, `android/` won't yet have:

- The storage adapter (`server/src/storage/sql/` already has the SQL logic
  proven against `better-sqlite3`; Phase 2 still needs the thin
  `expo-sqlite` driver wrapper written and dropped in here).
- Any of the domain logic (`server/src/domain/`) or actual screens — those
  get ported in Phase 4.
- The `expo-camera` QR scanner (Phase 3).

None of that belongs in the scaffold itself — it's the empty starting point
those phases build on, not a partial port.
