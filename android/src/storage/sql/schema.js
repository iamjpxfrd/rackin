// SQLite schema for the RN storage adapter (Task 3). Copied verbatim from
// server/src/storage/sql/schema.js — this file is driver-agnostic (just SQL
// strings), so there's nothing RN-specific to change. Duplicated rather than
// imported across a package boundary because android/ and server/ aren't
// wired into a shared workspace yet (open item in Task 3's "New" section);
// keep the two copies in sync by hand until that's resolved.
//
// Field names mirror the Dexie stores in server/db/db.js exactly (camelCase,
// same columns) so a record read from either backend is shaped identically
// to domain code.
//
// This is deliberately a second, independent local schema — not the backend
// Postgres schema in docs/architecture/backend-schema.md. Payments and
// check-ins there use snake_case and a DB-generated id; here they stay
// camelCase and keep Dexie's ++id auto-increment convention, because this is
// still the on-device store domain code reads and writes directly.

export const PRIMARY_KEYS = {
  members: "id",
  payments: "id",
  checkIns: "id",
  outbox: "id",
  staff: "id",
  deviceState: "key",
};

export const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS members (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    planType TEXT,
    phone TEXT,
    isStudent INTEGER DEFAULT 0,
    createdAt TEXT,
    clientUuid TEXT UNIQUE
  )`,
  `CREATE INDEX IF NOT EXISTS idx_members_name ON members(name)`,

  `CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    memberId TEXT NOT NULL,
    amount REAL NOT NULL,
    method TEXT,
    paidAt TEXT,
    coversUntil TEXT,
    clientUuid TEXT UNIQUE,
    recordedById TEXT,
    recordedByName TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS idx_payments_memberId ON payments(memberId)`,
  `CREATE INDEX IF NOT EXISTS idx_payments_coversUntil ON payments(coversUntil)`,

  // timestamp/method use `checkIns`' own naming (not the backend's check_in) —
  // this is the Dexie store name domain code already expects.
  `CREATE TABLE IF NOT EXISTS checkIns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    memberId TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    method TEXT,
    clientUuid TEXT UNIQUE,
    recordedById TEXT,
    recordedByName TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS idx_checkIns_memberId ON checkIns(memberId)`,
  `CREATE INDEX IF NOT EXISTS idx_checkIns_timestamp ON checkIns(timestamp)`,

  // `body` holds the exact JSON payload enqueue() was given — SQLite has no
  // structured column type, so it is stored serialized and parsed back out
  // on every read (queries.js).
  `CREATE TABLE IF NOT EXISTS outbox (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kind TEXT NOT NULL,
    body TEXT NOT NULL,
    clientUuid TEXT,
    queuedAt TEXT,
    attempts INTEGER DEFAULT 0,
    status TEXT NOT NULL,
    lastError TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS idx_outbox_status ON outbox(status)`,
  `CREATE INDEX IF NOT EXISTS idx_outbox_clientUuid ON outbox(clientUuid)`,

  `CREATE TABLE IF NOT EXISTS staff (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    createdAt TEXT,
    retiredAt TEXT,
    clientUuid TEXT UNIQUE
  )`,

  `CREATE TABLE IF NOT EXISTS deviceState (
    "key" TEXT PRIMARY KEY,
    value TEXT
  )`,
];

// Columns added after a table already shipped to a device: `CREATE TABLE IF
// NOT EXISTS` above only takes effect on a fresh install, so an existing
// local db (this app has no migration framework yet) needs each of these
// added by hand — guarded by checking PRAGMA table_info first, since SQLite
// errors on `ALTER TABLE ... ADD COLUMN` for a column that's already there.
const COLUMN_MIGRATIONS = [
  {
    table: "members",
    column: "isStudent",
    ddl: "ALTER TABLE members ADD COLUMN isStudent INTEGER DEFAULT 0",
  },
];

async function applyColumnMigrations(driver) {
  for (const { table, column, ddl } of COLUMN_MIGRATIONS) {
    const info = await driver.all(`PRAGMA table_info(${table})`, []);
    const hasColumn = info.some((row) => row.name === column);
    if (!hasColumn) await driver.run(ddl, []);
  }
}

export async function applySchema(driver) {
  for (const statement of SCHEMA_STATEMENTS) {
    await driver.run(statement, []);
  }
  await applyColumnMigrations(driver);
}
