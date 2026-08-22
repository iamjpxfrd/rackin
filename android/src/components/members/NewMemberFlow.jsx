// Owns the New Member → Success sequence so both screens stay
// presentational. Ported from server/src/components/members/NewMemberFlow.jsx.

import { useEffect, useState } from "react";
import { generateMemberId } from "../../domain/members.js";
import NewMemberScreen from "./NewMemberScreen.jsx";
import RegistrationSuccess from "./RegistrationSuccess.jsx";

export default function NewMemberFlow({ onDone }) {
  const [registered, setRegistered] = useState(null);
  // Generated once per flow, not via useLiveQuery — the code is now random,
  // so re-running on every store write (useLiveQuery's global invalidation)
  // would re-roll the previewed number out from under whoever is reading it.
  const [nextMemberId, setNextMemberId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    generateMemberId().then((id) => {
      if (!cancelled) setNextMemberId(id);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (registered) {
    return (
      <RegistrationSuccess
        member={registered}
        onDone={() => {
          setRegistered(null);
          onDone();
        }}
      />
    );
  }

  return (
    // Undefined until the first read resolves; the preview reads "—" rather
    // than flashing a wrong number.
    <NewMemberScreen nextMemberId={nextMemberId ?? "—"} onRegistered={setRegistered} />
  );
}
