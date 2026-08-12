// Who is responsible for what happens at the desk.
//
// This is attribution, not authentication. It records who did something; it
// does not stop anyone doing it. The distinction is the whole design: a PIN on
// a shared front-desk tablet gets shared within a day, and then every record
// carries a name that may be false — worse than no attribution at all, because
// absent data is honestly absent while wrong data is confidently wrong.
//
// Real authentication is a separate problem, and belongs with the owner
// dashboard where the threat is someone outside the gym (ADR-002).

import { db, generateClientUuid } from "../../db/db.js";

const ON_DESK_KEY = "onDeskStaffId";

/**
 * Staff who can currently be on the desk, name-ascending.
 * Retired people are excluded here but still resolve on old records.
 */
export async function listStaff() {
  const everyone = await db.staff.toArray();
  return everyone
    .filter((person) => !person.retiredAt)
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Everyone ever added, including retired, for resolving historical names. */
export function listAllStaff() {
  return db.staff.toArray();
}

/**
 * Add a member of staff. The gym supplies these names — PRODUCT.md forbids
 * inventing pilot specifics, so there is no seeded list.
 */
export async function addStaff(name) {
  const trimmedName = String(name ?? "").trim();
  if (!trimmedName) {
    throw new Error("Enter the staff member's name.");
  }

  const existing = await db.staff.toArray();
  const duplicate = existing.find(
    (person) => !person.retiredAt && person.name.toLowerCase() === trimmedName.toLowerCase(),
  );
  if (duplicate) {
    // Unlike members, duplicate staff names are blocked. A member number
    // disambiguates two Marias on the roster; two Marias in an attribution
    // field disambiguate nothing, and the whole point is knowing which one.
    throw new Error(`${duplicate.name} is already on the staff list.`);
  }

  const person = {
    id: generateClientUuid(),
    name: trimmedName,
    createdAt: new Date().toISOString(),
    retiredAt: null,
    clientUuid: generateClientUuid(),
  };
  await db.staff.add(person);
  return person;
}

/**
 * Retire someone who has left. Never a delete: they still took payments last
 * month, and those records have to keep naming somebody.
 */
export async function retireStaff(staffId) {
  await db.staff.update(staffId, { retiredAt: new Date().toISOString() });
  // Retiring whoever is currently on the desk would otherwise leave the tablet
  // attributing new records to someone who has gone home for good.
  if ((await getOnDeskId()) === staffId) {
    await clearOnDesk();
  }
}

/** Who the tablet will credit for what happens next, or null if nobody. */
export async function getOnDesk() {
  const staffId = await getOnDeskId();
  if (!staffId) return null;

  const person = await db.staff.get(staffId);
  // Retired mid-shift, or the record vanished: better to ask again than to
  // keep stamping a name the gym has retired.
  if (!person || person.retiredAt) {
    await clearOnDesk();
    return null;
  }
  return person;
}

export async function setOnDesk(staffId) {
  const person = await db.staff.get(staffId);
  if (!person || person.retiredAt) {
    throw new Error("That staff member is not on the list.");
  }
  await db.deviceState.put({ key: ON_DESK_KEY, value: staffId });
  return person;
}

export function clearOnDesk() {
  return db.deviceState.delete(ON_DESK_KEY);
}

async function getOnDeskId() {
  const stored = await db.deviceState.get(ON_DESK_KEY);
  return stored?.value ?? null;
}

/**
 * The attribution stamp written onto a record.
 *
 * The name is denormalised alongside the id on purpose. The id is what a
 * dashboard groups by; the name is what was true when the money changed hands,
 * and correcting a spelling next month must not silently rewrite who took a
 * payment in March.
 *
 * A null stamp is a legitimate value — it means nobody was signed in, which is
 * the honest record of an unattributed action rather than a reason to refuse it.
 */
export function attributionFor(person) {
  if (!person) {
    return { recordedById: null, recordedByName: null };
  }
  return { recordedById: person.id, recordedByName: person.name };
}
