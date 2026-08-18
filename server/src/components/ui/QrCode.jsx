// Member QR, generated on-device (frontend-spec.md §11 OD-1).
//
// Rendered as inline SVG from the module matrix — never a remote image or a
// hosted generator, because no network exists at the gym. The `qrcode`
// package is pure JS with no runtime dependency of its own.
//
// The QR is not an accessibility surface: it is a physical-world artifact.
// The member number printed beside it is the accessible equivalent, and it
// is always present.

import { useMemo } from "react";
import QRCode from "qrcode";

export default function QrCode({ value, size = 112, className = "" }) {
  const modules = useMemo(() => {
    try {
      // errorCorrectionLevel M survives the scuffing a gym membership card
      // gets in a pocket, without inflating the module count.
      const { modules: matrix } = QRCode.create(String(value), {
        errorCorrectionLevel: "M",
      });
      return matrix;
    } catch {
      return null;
    }
  }, [value]);

  if (!modules) return null;

  const { size: count, data } = modules;
  const rects = [];
  for (let y = 0; y < count; y += 1) {
    for (let x = 0; x < count; x += 1) {
      if (data[y * count + x]) {
        rects.push(<rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" />);
      }
    }
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${count} ${count}`}
      shapeRendering="crispEdges"
      fill="var(--color-ink-900)"
      role="img"
      aria-label={`QR code for member ${value}`}
      className={className}
    >
      <rect x="0" y="0" width={count} height={count} fill="var(--color-surface-white)" />
      {rects}
    </svg>
  );
}
