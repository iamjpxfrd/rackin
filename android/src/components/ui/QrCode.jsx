// Member QR, generated on-device (frontend-spec.md §11 OD-1). Ported from
// server/src/components/ui/QrCode.jsx — same `qrcode` module-matrix
// generation (pure JS, no runtime dependency of its own), rendered with
// react-native-svg's primitives instead of raw <svg>/<rect> since there's no
// DOM here. Never a remote image or hosted generator — no network exists at
// the gym.
//
// The QR is not an accessibility surface: it is a physical-world artifact.
// The member number shown beside it (RegistrationSuccess.jsx) is the
// accessible equivalent, and it is always present.

import { useMemo } from "react";
import QRCode from "qrcode";
import Svg, { Rect } from "react-native-svg";
import { colors } from "../../theme/colors.js";

export default function QrCode({ value, size = 112 }) {
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
        rects.push(<Rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={colors.page} />);
      }
    }
  }

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${count} ${count}`}>
      <Rect x={0} y={0} width={count} height={count} fill="#ffffff" />
      {rects}
    </Svg>
  );
}
