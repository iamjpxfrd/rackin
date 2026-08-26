// Read-only HTTP client for the backend
// ([[Decisions/Web Becomes a Read-Only Dashboard]], accepted 2026-08-22).
//
// server/ no longer writes anything: android/ is the only client that creates
// or edits data now. This replaces the old sync/api.js, which POSTed queued
// local writes — that whole module is gone along with the local outbox it
// served. This one only GETs.
//
// Base URL/key follow the same build-time configuration the old sync layer
// used: unset means this build has no backend to read from yet, which is a
// supported state (an offline preview build), not an error.

/** Where the backend lives, or "" when this build reads from nowhere. */
export function apiBaseUrl() {
  const configured = import.meta.env?.VITE_RACKIN_API_URL ?? "";
  return String(configured).trim().replace(/\/+$/, "");
}

/** The shared key the backend expects, or "" when this build has none. */
export function apiKey() {
  const configured = import.meta.env?.VITE_RACKIN_API_KEY ?? "";
  return String(configured).trim();
}

/** Whether this build has a backend to read from at all. */
export function isApiConfigured() {
  return apiBaseUrl() !== "" && apiKey() !== "";
}

/**
 * GET one endpoint. Resolves with the parsed JSON body, or `null` when this
 * build isn't pointed at a backend — callers treat that the same as "nothing
 * to show yet" rather than special-casing it.
 *
 * Throws on a non-2xx response or a transport failure; every current caller
 * catches this and falls back to an empty read rather than crashing a screen.
 */
export async function getJson(path, { fetchImpl = fetch } = {}) {
  if (!isApiConfigured()) return null;

  const response = await fetchImpl(`${apiBaseUrl()}${path}`, {
    headers: { Authorization: `Bearer ${apiKey()}` },
  });

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`.trim());
  }
  return response.json();
}
