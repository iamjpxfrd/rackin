// Check-in reads. Recording a check-in is android/'s job now
// ([[Decisions/Web Becomes a Read-Only Dashboard]], accepted 2026-08-22):
// checkInMember and the numpad/search/QR lookups that fed it
// (findMembersByName) are gone along with the create-flow screens that
// called them.

// TODO(dashboard reads): no backend endpoint returns a live "today's
// activity" feed yet — only /api/checkins/lapsed, /api/payments/expiring,
// and /api/members/{id}/status exist. Stubbed empty until a matching read
// endpoint exists, rather than reaching back into local storage that no
// longer exists or inventing one. See
// [[Decisions/Web Becomes a Read-Only Dashboard]].
export async function getTodaysActivity() {
  return [];
}
