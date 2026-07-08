// Local persistence layer — IndexedDB via Dexie.
// This is the sole source of truth for the pilot (fully offline).
// Swapping in cloud sync later means changing this file and the
// sync queue, not the domain layer (src/lib) or any UI component.

import Dexie from 'dexie';

export const db = new Dexie('rackin');

db.version(1).stores({
  members: 'id, name, planType, createdAt',
  payments: '++id, memberId, paidAt, coversUntil',
  checkIns: '++id, memberId, timestamp, method',
});
