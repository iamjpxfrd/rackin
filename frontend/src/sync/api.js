// HTTP transport for the sync push (TRD 5).
//
// The base URL comes from the build, not from a settings screen: the pilot ships
// one tablet pointed at one backend, and PRODUCT.md rules out configuration UI
// that would imply a flexibility the product does not have. Leaving it unset is
// a supported configuration — the app is fully functional offline-only, which
// is exactly how ADR-001 describes the pilot.

/**
 * Refused for a reason retrying cannot fix: the request was understood and
 * rejected on its merits (4xx). Kept distinct from a transport failure because
 * the two demand opposite handling — one must stop being retried, the other
 * must keep being retried.
 */
export class SyncRejectedError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "SyncRejectedError";
    this.status = status;
  }
}

/** Where the backend lives, or "" when this build syncs nowhere. */
export function syncBaseUrl() {
  const configured = import.meta.env?.VITE_RACKIN_API_URL ?? "";
  return String(configured).trim().replace(/\/+$/, "");
}

/**
 * The shared key the backend expects, or "" when this build has none.
 *
 * Worth being clear about what this is: a key inside a browser bundle is not a
 * secret from whoever holds the tablet — devtools reveals it. It closes the API
 * to the internet, not to the device's user. That is the honest limit of any
 * credential a browser app can carry, and the reason real per-person
 * authentication belongs with the owner dashboard rather than here (ADR-002).
 */
export function syncApiKey() {
  const configured = import.meta.env?.VITE_RACKIN_API_KEY ?? "";
  return String(configured).trim();
}

/**
 * Whether this build has a backend to push to at all.
 *
 * Both parts are required. A URL without a key would queue writes, send them,
 * and collect a 401 on every one — which, since 4xx is permanent, would mark
 * the gym's entire history as rejected rather than retrying it later.
 */
export function isSyncConfigured() {
  return syncBaseUrl() !== "" && syncApiKey() !== "";
}

/**
 * POST one operation. Resolves with the parsed body on success, throws
 * SyncRejectedError on 4xx, and a plain Error on anything else — including a
 * transport failure, which is the ordinary case for a gym with no wifi.
 */
export async function postJson(path, body, { fetchImpl = fetch } = {}) {
  const response = await fetchImpl(`${syncBaseUrl()}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${syncApiKey()}`,
    },
    body: JSON.stringify(body),
  });

  if (response.ok) {
    return parseBody(response);
  }

  const detail = await describeFailure(response);
  if (response.status >= 400 && response.status < 500) {
    throw new SyncRejectedError(detail, response.status);
  }
  throw new Error(detail);
}

async function parseBody(response) {
  if (response.status === 204) return null;
  try {
    return await response.json();
  } catch {
    // A 2xx with an unreadable body still means the backend accepted the write,
    // which is the only thing the caller acts on.
    return null;
  }
}

// The backend answers errors two ways (TRD 8): {error} for a message, or a list
// of {field, reason} for validation. Both are flattened to one line, since this
// is only ever read from a log — sync failures are silent to staff (PRD 4.10).
async function describeFailure(response) {
  const prefix = `${response.status} ${response.statusText}`.trim();
  try {
    const parsed = await response.json();
    if (parsed?.error) {
      return `${prefix}: ${parsed.error}`;
    }
    if (Array.isArray(parsed) && parsed.length > 0) {
      const fields = parsed.map((item) => `${item.field} ${item.reason}`).join("; ");
      return `${prefix}: ${fields}`;
    }
  } catch {
    // Fall through to the bare status line.
  }
  return prefix;
}
