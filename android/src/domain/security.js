// A single shared staff PIN gates the Members tab (Task 5's Security Measures
// item). Purely local/device-side, same trust model and storage pattern as
// pricing.js's promo toggle — no PIN set is the default, and leaves the tab
// open exactly as before, so staff always have a way to reach the one screen
// that lets them set a PIN in the first place.

import { store } from "../storage/store.js";

const MEMBERS_PIN_KEY = "membersPin";

export async function getMembersPin() {
  const stored = await store.deviceState.get(MEMBERS_PIN_KEY);
  return stored?.value ?? null;
}

export async function setMembersPin(pin) {
  await store.deviceState.put({ key: MEMBERS_PIN_KEY, value: pin });
}

export async function clearMembersPin() {
  await store.deviceState.delete(MEMBERS_PIN_KEY);
}
