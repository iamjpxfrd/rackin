// Owns the New Member → Success sequence so both screens stay
// presentational. Ported from server/src/components/members/NewMemberFlow.jsx.

import { useState } from "react";
import { useLiveQuery } from "../../hooks/useLiveQuery.js";
import { getNextMemberId } from "../../domain/members.js";
import NewMemberScreen from "./NewMemberScreen.jsx";
import RegistrationSuccess from "./RegistrationSuccess.jsx";

export default function NewMemberFlow({ onDone }) {
  const [registered, setRegistered] = useState(null);
  const nextMemberId = useLiveQuery(() => getNextMemberId());

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
