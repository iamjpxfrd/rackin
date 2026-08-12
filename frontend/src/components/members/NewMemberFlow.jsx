// Owns the New Member → Success sequence so both screens stay presentational.

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { getNextMemberId } from "../../../db/db.js";
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
    <NewMemberScreen
      // Undefined until the first read resolves; the preview reads "—"
      // rather than flashing a wrong number.
      nextMemberId={nextMemberId ?? "—"}
      onRegistered={setRegistered}
    />
  );
}
