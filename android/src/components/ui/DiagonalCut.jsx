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

import { Pressable, View } from "react-native";
import Animated from "react-native-reanimated";
import Svg, { Polygon } from "react-native-svg";
import { usePressFlash } from "./Touchable.jsx";

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

/**
 * A tappable DiagonalCut — the `Pressable` → scale-pulse → `DiagonalCut`
 * stack that every solid-color action button in the app repeats (CHECK IN,
 * RECORD PAYMENT, REGISTER MEMBER, LOG A TRANSACTION, …). Scale-only, no
 * flash overlay: a rectangular flash wouldn't match this shape, and the
 * button is already a solid color, so a same-color flash would be invisible
 * anyway (see Touchable.jsx's header for the full reasoning).
 */
export function PressableDiagonalCut({
  onPress,
  disabled,
  color,
  cutPercent,
  style,
  wrapperStyle,
  accessibilityLabel,
  children,
}) {
  const { trigger, scaleStyle } = usePressFlash();

  function handlePress() {
    if (disabled) return;
    trigger();
    onPress();
  }

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={wrapperStyle}
    >
      <Animated.View style={scaleStyle}>
        <DiagonalCut color={color} cutPercent={cutPercent} style={style}>
          {children}
        </DiagonalCut>
      </Animated.View>
    </Pressable>
  );
}
