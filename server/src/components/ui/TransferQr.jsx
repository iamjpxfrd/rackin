// The gym's receiving QR, shown when staff pick Transfer so the member can
// scan and pay from their own phone.
//
// RackIn still only RECORDS that a payment happened — it does not process
// one (PRODUCT.md). This is a picture of the gym's own code, nothing more:
// no amount is encoded, no confirmation is read back, and staff still tap
// the confirm key themselves once the member shows them the transfer.
//
// Deliberately not a modal. It appears inline beneath the method choice, so
// it never interrupts a flow that is already inside a sheet, and staff can
// keep editing the amount while the member scans. Tap enlarges it for a
// member standing across the counter.

import { useState } from "react";
import { Maximize2, X } from "lucide-react";

// Supplied by the gym: they save their own GCash / bank QR here. Kept as a
// plain public asset so replacing it is a file swap, not a code change.
const PAYMENT_QR_SRC = "/payment-qr.png";

export default function TransferQr() {
  const [missing, setMissing] = useState(false);
  const [enlarged, setEnlarged] = useState(false);

  if (missing) {
    // Never a broken image icon. States what is wrong and who fixes it.
    return (
      <div className="flex animate-[reveal_150ms_ease-out] flex-col gap-1 rounded-ds-sm border border-steel-300 bg-chalk-50 p-4 motion-reduce:animate-none">
        <p className="font-body text-base font-medium text-ink-900">
          No payment QR saved yet.
        </p>
        <p className="font-body text-sm text-steel-700">
          Add the gym&apos;s GCash or bank QR as payment-qr.png to show it here.
          Cash and transfer still record normally.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="flex animate-[reveal_150ms_ease-out] items-center gap-4 rounded-ds-sm border border-steel-300 bg-surface-white p-4 motion-reduce:animate-none">
        <button
          type="button"
          onClick={() => setEnlarged(true)}
          aria-label="Enlarge payment QR"
          className="shrink-0 rounded-ds-sm border border-steel-300 p-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-steel-700"
        >
          <img
            src={PAYMENT_QR_SRC}
            onError={() => setMissing(true)}
            alt="The gym's payment QR code"
            width={112}
            height={112}
            className="block h-28 w-28 object-contain"
          />
        </button>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="font-body text-lg font-medium text-ink-900">
            Have them scan to transfer
          </p>
          <p className="font-body text-sm text-steel-700">
            Record the payment once the transfer shows on their phone.
          </p>
          <button
            type="button"
            onClick={() => setEnlarged(true)}
            className="mt-1 flex items-center gap-1.5 self-start font-body text-sm font-semibold text-steel-700 underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-steel-700"
          >
            <Maximize2 size={16} strokeWidth={1.75} aria-hidden="true" />
            Enlarge
          </button>
        </div>
      </div>

      {enlarged && (
        <div
          className="fixed inset-0 z-60 flex flex-col items-center justify-center gap-6 bg-ink-900/80 p-6"
          onClick={() => setEnlarged(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Payment QR"
        >
          <div
            className="rounded-ds-lg bg-surface-white p-6 shadow-card"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={PAYMENT_QR_SRC}
              onError={() => setMissing(true)}
              alt="The gym's payment QR code"
              className="block h-[420px] w-[420px] max-w-[70vw] object-contain"
            />
          </div>
          <button
            type="button"
            onClick={() => setEnlarged(false)}
            className="flex h-14 items-center gap-2 rounded-ds-sm bg-surface-white px-6 font-body text-lg font-semibold text-ink-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-surface-white"
          >
            <X size={20} strokeWidth={1.75} aria-hidden="true" />
            Close
          </button>
        </div>
      )}

      <style>{`
        @keyframes reveal {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
