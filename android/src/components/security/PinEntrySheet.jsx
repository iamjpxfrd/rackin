// Gates the Members tab behind a single shared staff PIN (Task 5's Security
// Measures item — no PIN/auth concept existed anywhere in the app before
// this). Reuses Sheet + Numpad + Toast rather than a new visual direction,
// same as Member Profile/Record Payment skipping a fresh /design pass when
// there's nothing new to settle — every piece here already exists in
// Kinetic Court.

import { useState } from "react";
import Sheet from "../ui/Sheet.jsx";
import Numpad from "../checkin/Numpad.jsx";
import { showToast } from "../ui/Toast.jsx";

const PIN_LENGTH = 4;

export default function PinEntrySheet({ mode, expectedPin, onUnlock, onSave, onClose }) {
  const [value, setValue] = useState("");

  function handleSubmit(entered) {
    if (mode === "unlock") {
      if (entered === expectedPin) {
        onUnlock();
      } else {
        showToast("Wrong PIN", "warning");
        setValue("");
      }
      return;
    }
    onSave(entered);
  }

  return (
    <Sheet
      title={mode === "unlock" ? "Staff PIN" : "Set Members Tab PIN"}
      subtitle={
        mode === "unlock"
          ? "Enter the staff PIN to open Members."
          : "Staff will need this PIN to open Members."
      }
      onClose={onClose}
    >
      <Numpad
        value={value}
        onChange={setValue}
        onSubmit={handleSubmit}
        label={mode === "unlock" ? "UNLOCK" : "SAVE"}
        placeholder="PIN"
        maxLength={PIN_LENGTH}
        mask
      />
    </Sheet>
  );
}
