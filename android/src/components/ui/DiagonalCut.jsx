// Kinetic Court's signature shape: a rectangle with the bottom-right corner
// cut at an angle (the web mockup's `clip-path: polygon(0 0, 100% 0, X% 100%,
// 0% 100%)`). RN's style engine has no clip-path — Yoga only understands
// border-radius for corner shaping — so this draws the cut as an SVG
// polygon behind the content instead of clipping a plain View.
//
// `cutPercent` matches the clip-path's second X coordinate: 100 = a plain
// rectangle, 90 = the corner cut starts 10% of the width in from the right
// edge. The polygon is drawn in a 0-100 viewBox with
// preserveAspectRatio="none" so X and Y each scale to the real pixel size
// independently — a percentage cut stays proportional to width regardless
// of height, exactly like the CSS version.

import { View } from "react-native";
import Svg, { Polygon } from "react-native-svg";

export function DiagonalCut({ color, cutPercent = 92, style, children }) {
  return (
    <View style={[{ overflow: "hidden" }, style]}>
      <Svg
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        width="100%"
        height="100%"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <Polygon points={`0,0 100,0 ${cutPercent},100 0,100`} fill={color} />
      </Svg>
      {children}
    </View>
  );
}
