// S6 — Registration Success (frontend-spec.md §6.6).
//
// The member number is the hero, larger than anything else in the app
// including the numpad digits: it is read aloud and transcribed onto a
// physical card. That is the Arm's-Length Rule at its most literal.
//
// Deliberately NOT the confirmation card — that celebration belongs to
// check-in alone (DESIGN.md). This screen holds a QR and two actions and
// must persist while staff write the card, so it never auto-dismisses.

import { CheckCircle2 } from "lucide-react";
import QrCode from "../ui/QrCode.jsx";
import PressKey, { GhostKey } from "../ui/PressKey.jsx";

export default function RegistrationSuccess({ member, onDone }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-8 overflow-y-auto px-4 py-4">
        <div className="flex flex-col items-center gap-3">
          <CheckCircle2 size={44} strokeWidth={1.75} className="text-turf-green" />
          <p className="text-center font-body text-3xl font-bold text-ink-900">
            {member.name} is in
          </p>
        </div>

        <div className="flex flex-col items-center gap-1">
          <span className="font-body text-[13px] font-semibold uppercase tracking-[0.08em] text-steel-700">
            Member number
          </span>
          <span className="font-numeral text-8xl leading-none text-ink-900">
            {member.id}
          </span>
        </div>

        <div className="flex flex-col items-center gap-4">
          <div className="rounded-ds-lg border border-steel-300 bg-surface-white p-4">
            <QrCode value={member.id} size={208} />
          </div>
          <p className="font-body text-lg text-steel-700">
            Write this number on the member&apos;s card.
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-stretch gap-3 border-t border-steel-300 bg-chalk-50 p-4">
        {/* Print is best-effort: the pilot tablet may have no printer at all
            (frontend-spec.md §11 OD-3), so it stays secondary to the number
            and QR already on screen. */}
        <GhostKey onClick={() => window.print()}>Print card</GhostKey>
        <div className="flex-1">
          <PressKey onClick={onDone}>DONE</PressKey>
        </div>
      </div>
    </div>
  );
}
