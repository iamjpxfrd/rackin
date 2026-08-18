import { useEffect, useRef, useState } from "react";
import QrScannerLib from "qr-scanner";

const DUPLICATE_SCAN_COOLDOWN_MS = 5000;

// QR is an accelerant on top of the same lookup, not a parallel flow
// (ADR-001) — this component only decodes and hands the id back;
// CheckInScreen still owns the single checkInMember call so numpad,
// search, and QR share one code path.
export default function QrScanner({ onDecode, onUnavailable }) {
  const videoRef = useRef(null);
  const [status, setStatus] = useState("starting");
  const onDecodeRef = useRef(onDecode);
  const onUnavailableRef = useRef(onUnavailable);
  const lastScanRef = useRef({ memberId: null, at: 0 });

  useEffect(() => {
    onDecodeRef.current = onDecode;
    onUnavailableRef.current = onUnavailable;
  });

  useEffect(() => {
    let cancelled = false;

    const scanner = new QrScannerLib(
      videoRef.current,
      (result) => {
        const memberId = result.data.trim();
        if (!memberId) return;
        const now = Date.now();
        // A card held in frame across the confirmation card's auto-dismiss
        // window would otherwise re-trigger the same check-in.
        if (
          memberId === lastScanRef.current.memberId &&
          now - lastScanRef.current.at < DUPLICATE_SCAN_COOLDOWN_MS
        ) {
          return;
        }
        lastScanRef.current = { memberId, at: now };
        onDecodeRef.current(memberId);
      },
      {
        preferredCamera: "environment",
        highlightScanRegion: false,
        highlightCodeOutline: false,
        maxScansPerSecond: 10,
        returnDetailedScanResult: true,
        onDecodeError: () => {},
      },
    );

    scanner
      .start()
      .then(() => {
        if (!cancelled) setStatus("ready");
      })
      .catch(() => {
        // Camera unavailable, permission denied, or no camera on this
        // device — the parent falls back to numpad instantly (PRD 4.2 AC2).
        if (!cancelled) onUnavailableRef.current();
      });

    return () => {
      cancelled = true;
      scanner.stop();
      scanner.destroy();
    };
  }, []);

  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-ds-sm border border-steel-300 bg-ink-900">
      <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />

      {status === "starting" && (
        <div className="absolute inset-0 flex items-center justify-center bg-ink-900">
          <p className="font-body text-base text-surface-white">Starting camera…</p>
        </div>
      )}

      {status === "ready" && (
        <>
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-2/3 w-2/3 rounded-ds-sm border-2 border-signal-yellow" />
          </div>
          <p className="pointer-events-none absolute inset-x-0 bottom-3 text-center font-body text-sm text-surface-white">
            Point the camera at a QR card
          </p>
        </>
      )}
    </div>
  );
}
