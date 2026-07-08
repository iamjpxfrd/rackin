import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/db';
import { checkInMember, getLapsedMembers } from './checkIn';

describe('checkInMember', () => {
  beforeEach(async () => {
    await db.members.clear();
    await db.checkIns.clear();
    await db.members.add({ id: '1001', name: 'Test Member', planType: 'monthly' });
  });

  it('records a check-in and returns the member', async () => {
    const { member, visitCountThisMonth } = await checkInMember('1001', 'numpad');
    expect(member.name).toBe('Test Member');
    expect(visitCountThisMonth).toBe(1);
  });

  it('throws for an unknown member id', async () => {
    await expect(checkInMember('9999', 'numpad')).rejects.toThrow('No member found');
  });
});

describe('getLapsedMembers', () => {
  it('returns members with no check-in history', async () => {
    await db.members.clear();
    await db.checkIns.clear();
    await db.members.add({ id: '1002', name: 'Never Checked In', planType: 'weekly' });

    const lapsed = await getLapsedMembers(14);
    expect(lapsed.some((l) => l.member.id === '1002')).toBe(true);
  });
});
