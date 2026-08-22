// Stands in for dexie-react-hooks' useLiveQuery, so every component ported
// from server/src/components/ can keep the exact same call —
// `useLiveQuery(() => someQuery(), deps)` or `useLiveQuery(() => someQuery(),
// deps, defaultValue)` — just importing from here instead.
//
// What's different underneath: Dexie's real useLiveQuery re-runs a query only
// when a table it actually touched was written to, tracked automatically at
// the Table/WhereClause level with no wiring required. RN's SQLite store has
// no equivalent instrumentation, so this re-runs on *any* committed write to
// *any* table (see storage/store.js's onStoreChange/notifyChanged) rather than
// the one that mattered to this particular query.
//
// That's a deliberate simplification, not a missing feature: the app is a
// single-tablet kiosk (ADR-001) with a handful of small tables and no
// concurrent writers, so an occasional needless re-render costs nothing a
// user would notice. Precise per-table tracking (extending queries.js's
// notify to fire per-table and subscribing only to the tables a query
// touches) is available if this ever stops being true, but nothing in Task 3
// needed it yet.

import { useEffect, useState } from "react";
import { onStoreChange } from "../storage/store.js";

export function useLiveQuery(querier, deps = [], defaultValue = undefined) {
  const [result, setResult] = useState(defaultValue);

  useEffect(() => {
    let cancelled = false;

    const run = () => {
      Promise.resolve(querier()).then((value) => {
        if (!cancelled) setResult(value);
      });
    };

    run();
    const unsubscribe = onStoreChange(run);
    return () => {
      cancelled = true;
      unsubscribe();
    };
    // deps is caller-supplied, exactly like dexie-react-hooks' own contract —
    // this hook re-runs `querier` when deps change, same as the original.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return result;
}
