// SQLite schema for the RN storage adapter (Task 2, Phase 2). Field names
// mirror the Dexie stores in db.js exactly (camelCase, same columns) so a
// record read from either backend is shaped identically to domain code.
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

export async function applySchema(driver) {
  for (const statement of SCHEMA_STATEMENTS) {
    await driver.run(statement, []);
  }
}
