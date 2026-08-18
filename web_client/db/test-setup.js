// Vitest runs in Node, which has no IndexedDB by default.
// fake-indexeddb provides a spec-compliant in-memory implementation
// so Dexie (src/db/db.js) works identically in tests as in the
// browser, letting us test the "survives across simulated reload"
// guarantee (PRD 4.10) without a real browser.
//
// Install: npm install -D fake-indexeddb

import 'fake-indexeddb/auto';
