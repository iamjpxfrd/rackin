// Phase 1 exit criteria (Implementation Plan Section 3):
// "can create/read/query all three stores via a test script with no UI"
// and records persist across a simulated reload.

import { describe, it, expect, beforeEach } from 'vitest';
import { db, generateClientUuid, getNextMemberId, resetDatabase } from './db';

describe('schema — all three stores', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('creates and reads a member', async () => {
    const id = await getNextMemberId();
    await db.members.add({
      id,
      name: 'Test Member',
      planType: 'monthly',
      phone: null,
      createdAt: new Date().toISOString(),
      clientUuid: generateClientUuid(),
    });

    const stored = await db.members.get(id);
    expect(stored.name).toBe('Test Member');
    expect(stored.phone).toBeNull();
  });

  it('creates and reads a payment linked to a member', async () => {
    const memberId = await getNextMemberId();
    await db.members.add({ id: memberId, name: 'Payer', planType: 'weekly' });

    await db.payments.add({
      memberId,
      amount: 500,
      method: 'cash',
      paidAt: new Date().toISOString(),
      coversUntil: new Date(Date.now() + 7 * 86400000).toISOString(),
      clientUuid: generateClientUuid(),
    });

    const payments = await db.payments.where('memberId').equals(memberId).toArray();
    expect(payments).toHaveLength(1);
    expect(payments[0].amount).toBe(500);
  });

  it('creates and reads a check-in linked to a member', async () => {
    const memberId = await getNextMemberId();
    await db.members.add({ id: memberId, name: 'Checker', planType: 'monthly' });

    await db.checkIns.add({
      memberId,
      timestamp: new Date().toISOString(),
      method: 'numpad',
      clientUuid: generateClientUuid(),
    });

    const checkIns = await db.checkIns.where('memberId').equals(memberId).toArray();
    expect(checkIns).toHaveLength(1);
    expect(checkIns[0].method).toBe('numpad');
  });
});

describe('getNextMemberId — sequential assignment', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('starts at 1001', async () => {
    const id = await getNextMemberId();
    expect(id).toBe('1001');
  });

  it('increments as members are added', async () => {
    await db.members.add({ id: '1001', name: 'First' });
    const nextId = await getNextMemberId();
    expect(nextId).toBe('1002');
  });
});

describe('clientUuid — sync idempotency keys', () => {
  it('generates a unique value on every call', () => {
    const a = generateClientUuid();
    const b = generateClientUuid();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[0-9a-f-]{36}$/i);
  });
});

describe('offline persistence guarantee (PRD 4.10)', () => {
  it('data survives across a simulated reload', async () => {
    await resetDatabase();
    const id = await getNextMemberId();
    await db.members.add({ id, name: 'Persisted Member', planType: 'monthly' });

    // Simulate "reload" by opening a fresh Dexie handle onto the
    // same underlying IndexedDB — this is what actually happens
    // when the tablet browser restarts.
    const reopened = new (Object.getPrototypeOf(db).constructor)('rackin');
    reopened.version(1).stores({
      members: 'id, name, planType, phone, createdAt, clientUuid',
      payments: '++id, memberId, paidAt, coversUntil, clientUuid',
      checkIns: '++id, memberId, timestamp, method, clientUuid',
    });

    const stillThere = await reopened.members.get(id);
    expect(stillThere.name).toBe('Persisted Member');
    reopened.close();
  });
});
