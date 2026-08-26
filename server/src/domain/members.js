// Member reads (frontend-spec.md §5.4, PRD 4.8). Registration and profile
// edits are android/'s job now
// ([[Decisions/Web Becomes a Read-Only Dashboard]], accepted 2026-08-22):
// registerMember, getNextMemberId, and suggestNames (the New Member flow's
// name-completion helper) are gone along with the screens that called them.

// TODO(dashboard reads): no backend endpoint returns a member's full profile
// (payment + check-in history) yet — only /api/members/{id}/status exists,
// which is a status summary, not the history this screen wants. Stubbed
// until a matching read endpoint exists. See
// [[Decisions/Web Becomes a Read-Only Dashboard]].
export async function getMemberProfile() {
  return null;
}

/**
 * The full roster, name-ascending, each row carrying its derived status.
 *
 * TODO(dashboard reads): no backend endpoint returns the full roster yet.
 * Stubbed empty until one exists. See
 * [[Decisions/Web Becomes a Read-Only Dashboard]].
 *
 * @returns {Promise<Array<{ member: object, status: string, isExpiringSoon: boolean }>>}
 */
export async function listMembers() {
  return [];
}

/**
 * Roster filter for the Members tab: matches name OR member number, so
 * staff holding a physical card can find someone the same way they would
 * on Check-In. An empty query returns the whole roster.
 */
export function filterMembers(rows, query) {
  const needle = String(query ?? "").trim().toLowerCase();
  if (!needle) return rows;
  return rows.filter(
    ({ member }) =>
      member.name.toLowerCase().includes(needle) || member.id.includes(needle),
  );
}

/**
 * Total members on the roster — drives the app's first-run empty states.
 *
 * TODO(dashboard reads): no backend endpoint for a member count yet.
 * Stubbed to 0 until one exists. See
 * [[Decisions/Web Becomes a Read-Only Dashboard]].
 */
export async function memberCount() {
  return 0;
}
