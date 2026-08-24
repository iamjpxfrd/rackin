# Deploy the Backend to Render

This is the pilot's actual deployment target — see
`docs/architecture/ADR-002-build-the-backend-before-the-pilot.md` for why the
backend exists and what it is/isn't load-bearing for. It covers deploying via
Render's Blueprint (`render.yaml` at the repo root). For local development see
`docs/how-to/run-the-backend-locally.md`.

## 1. Prerequisites

- A Render account (free) at [render.com](https://render.com), with the
  `iamjpxfrd/rackin` GitHub repo connected.
- The dev API key from `backend/config/local.properties` — you'll need a
  **new, different** key for production. Generate one the same way:
  `openssl rand -base64 32`. Never reuse the local dev key here; it's already
  in a gitignored file on one machine, which is a different threat model
  from a key that has to survive being deployed.

## 2. Create the Blueprint

1. In the Render dashboard: **New > Blueprint**.
2. Select the `rackin` repo. Render finds `render.yaml` at the repo root
   automatically.
3. Render shows a plan: one web service (`rackin-backend`, Docker, free
   plan) and one Postgres database (`rackin-db`, free plan).
4. You'll be prompted for `RACKIN_API_KEY` — the only `sync: false` env var
   in the Blueprint, meaning Render asks for it once here rather than reading
   it from the file. Paste the key you generated in step 1.
5. Click **Apply**. Render provisions the database first, then builds the
   Docker image (`backend/Dockerfile`) and deploys the web service.

The first build takes a few minutes — it's a full Maven build from a cold
dependency cache inside the image, not an incremental one.

## 3. Verify

Render assigns a URL like `https://rackin-backend.onrender.com`. Confirm the
schema landed and the API answers:

```bash
curl https://rackin-backend.onrender.com/actuator/health
# {"status":"UP"}

curl -H "Authorization: Bearer YOUR_PROD_KEY" \
  https://rackin-backend.onrender.com/api/checkins/lapsed
# [] (or a real list, on a database with members)
```

A `401` on the second command means the key you set in step 2.4 doesn't
match what you're sending — check the Render dashboard's environment tab for
the service, not just what you typed during setup (paste errors happen).

## 4. Point the Android build at it

Once verified, the tablet build needs the same two values `android/.env.local`
uses for local testing, but pointed at Render instead of a LAN IP:

```
EXPO_PUBLIC_RACKIN_API_URL=https://rackin-backend.onrender.com
EXPO_PUBLIC_RACKIN_API_KEY=<the same prod key from step 1>
```

For an EAS build (as opposed to local Expo Go testing), these need to be set
as EAS environment variables (`eas env:create`) for whichever build profile
you're using, then the app rebuilt — `EXPO_PUBLIC_*` values are inlined at
build time, not read at runtime, so an existing build can't be repointed
without a rebuild.

## 5. Free-tier behavior worth knowing

- **The web service spins down after 15 minutes of no traffic** and takes
  ~30-60 seconds to wake on the next request. The first check-in of the day
  may sync slowly; this is expected on the free plan, not a bug. Per
  ADR-002, no front-desk flow ever waits on sync succeeding, so this cannot
  block a check-in — only delays when it eventually lands on the backend.
- **The free Postgres database expires after 90 days** and Render deletes
  it. Before that happens, either upgrade the database plan or export/
  reimport the data to a fresh free instance — there's no automatic
  migration path.

## 6. Troubleshooting

**Build fails with `Nothing to compile` or dependency errors**

Check the build logs in the Render dashboard, not just the deploy status —
a Docker build failure and a container crash-on-startup look the same from
the outside ("deploy failed") but need different fixes.

**Container starts then immediately exits**

Almost always a missing/wrong env var — `RACKIN_API_KEY` blank fails loudly
by design (see `SecurityConfig`'s comment), and a bad `DB_HOST`/`DB_PORT`/
`DB_NAME` fails the same way `run-the-backend-locally.md`'s
`Could not resolve placeholder` case does, just in Render's logs instead of
a local terminal.

**`Schema-validation: missing table` after a fresh deploy**

Flyway should apply all migrations automatically on first boot (same as
local dev) — if this happens, check the deploy logs for a Flyway error above
the Hibernate one; Flyway failing silently-then-Hibernate-complaining-second
is the same failure pattern `run-the-backend-locally.md` describes for a
local setup, just with the two phases logged further apart.
