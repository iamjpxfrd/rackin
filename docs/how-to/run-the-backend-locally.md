# Run the Backend Locally

This guide takes you from a fresh clone to a running Rackin backend with a
verified database schema.

It covers local development only. For production deployment see
`docs/how-to/deploy-the-backend-to-render.md`; for the API contract itself,
start the backend and open Swagger UI (step 5).

All commands run from the `backend/` directory unless stated otherwise.

## 1. Prerequisites

| Requirement | Notes |
| --- | --- |
| Java 21 or later | `java -version`. The build targets 21; newer JDKs work. |
| PostgreSQL 16 or later | `psql --version`. Developed against 18. |
| Git | To clone the repository. |

Maven is **not** required — the repository bundles the Maven wrapper (`mvnw`,
`mvnw.cmd`).

On Windows, `psql` is not added to `PATH` by the installer. Either add it or use
the full path, which for PostgreSQL 18 is:

```
C:\Program Files\PostgreSQL\18\bin\psql.exe
```

The rest of this guide writes `psql` for brevity.

## 2. Create the database and role

Run all three commands. **Do not skip the second** — a role created without a
password cannot authenticate, and the backend fails at startup rather than at
role creation, which makes the cause easy to misread.

```bash
# 1. Create the login role
psql -U postgres -h localhost -c "CREATE ROLE rackin_app LOGIN"

# 2. Set its password — prompts twice, and is never written to shell history
psql -U postgres -h localhost -c "\password rackin_app"

# 3. Create the database, owned by that role
psql -U postgres -h localhost -c "CREATE DATABASE rackin OWNER rackin_app"
```

Each command prompts for your `postgres` superuser password.

The database must be **owned by** `rackin_app`, not merely granted to it. On
PostgreSQL 15 and later the `public` schema no longer grants `CREATE` to all
users, and ownership is what allows Flyway to create tables.

## 3. Supply the credential

Copy the template and set the password you chose in step 2:

```bash
cp config/local.properties.example config/local.properties
```

Edit `config/local.properties`:

```properties
DB_PASSWORD=the-password-you-just-set
RACKIN_API_KEY=paste-a-generated-key-here
```

Generate the key with `openssl rand -base64 32`. **Both are required** — the
backend refuses to start without either, deliberately: the sync API answers with
the gym's full membership and payment history, and an app that starts with a
guessed key looks protected while accepting a key anyone can read.

The web client needs the *same* key in `server/.env.local` as
`VITE_RACKIN_API_KEY`, or every sync request comes back `401`.

This file is gitignored. `application.properties` imports it with
`optional:file:`, so its absence is not an error — CI and production supply
`DB_PASSWORD` as a real environment variable instead.

`DB_URL` and `DB_USERNAME` are also available in that file, but both already
default to the database you just created and can be left commented out.

## 4. Start the backend

```bash
./mvnw spring-boot:run          # Git Bash / macOS / Linux
.\mvnw.cmd spring-boot:run      # PowerShell
```

The `dev` profile is active by default.

On the first run, Flyway creates its `flyway_schema_history` table and applies
`V1__create_member_payment_checkin.sql`, which creates the `member`, `payment`,
and `check_in` tables. Flyway logs each step — look for a line reporting that
one migration was applied and the schema is now at version 1.

Subsequent runs find the schema already at version 1 and apply nothing.

Startup is complete when you see:

```
Started BackendApplication in <n> seconds
```

The backend listens on port 8080.

> Flyway owns the schema. Hibernate runs with `ddl-auto=validate`, so it checks
> that the entities match the tables and refuses to start on a mismatch — it
> will never alter the schema itself.

## 5. Verify

Confirm the schema landed:

```bash
psql -U rackin_app -h localhost -d rackin -c "\dt"
```

Expect four tables: `check_in`, `flyway_schema_history`, `member`, `payment`.

Then exercise the API through Swagger UI:

```
http://localhost:8080/swagger-ui.html
```

Register a member using **POST /api/members** → *Try it out*. On an empty
database the response returns `"memberId": "1001"` — ids are sequential strings
starting at 1001. Pass that id to **GET /api/members/{id}/status** and expect
`"status": "active"`.

The raw OpenAPI document is at `http://localhost:8080/v3/api-docs`.

## 6. Run the tests

```bash
./mvnw test
```

Tests need no running database. They activate a `test` profile that uses
in-memory H2 with Flyway disabled, building the schema from the JPA entities
instead. You can run them before completing steps 2 and 3.

## 7. Troubleshooting

**`FATAL: password authentication failed for user "rackin_app"`**

The role exists but has no password, or the password in
`config/local.properties` does not match. Re-run step 2's second command to set
it, then make the two agree.

**`Could not resolve placeholder 'DB_PASSWORD'`** (or `'RACKIN_API_KEY'`)

`config/local.properties` is missing or does not define it. Complete step 3.
Confirm the file is at `backend/config/local.properties` — the import path is
relative to the `backend/` directory.

**`rackin.api-key is not set`**

The property resolved to an empty value. It must be a real key; blank is refused
on purpose, so the API cannot come up open.

**Every request returns `401`**

The key in `server/.env.local` does not match the one in
`backend/config/local.properties`, or Vite was not restarted after the file
changed — it reads `.env` files only at startup. Check with:

```bash
curl -i -H "Authorization: Bearer $YOUR_KEY" http://localhost:8080/api/checkins/lapsed
```

A `401` there means the key is wrong. A `200` means the backend is fine and the
problem is on the frontend side.

**`Schema-validation: missing table [member]`**

Hibernate connected to a database Flyway has not migrated. Check that `DB_URL`
points at `rackin` and not another database, then confirm with the `\dt`
command in step 5.

**`Web server failed to start. Port 8080 was already in use.`**

An earlier instance is still running. Stop it, or start on another port:

```bash
./mvnw spring-boot:run -Dspring-boot.run.arguments=--server.port=8081
```

## 8. Changing the schema later

Never edit a migration that has already run — Flyway records a checksum for
each applied migration and refuses to start when one changes. Add a new file
instead:

```
src/main/resources/db/migration/V2__short_description.sql
```

Entities and migrations must stay in step, because `ddl-auto=validate` compares
them at every startup. See `docs/architecture/backend-schema.md` §8 for the
migration strategy and the reasoning behind it.
