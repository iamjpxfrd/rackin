// Segmented choice control for Plan and Payment method (frontend-spec.md
// §6.5). Ported from server/src/components/ui/ChoiceGroup.jsx, reskinned to
// Kinetic Court: the selected option is a diagonal-cut accent fill, the same
// treatment CheckInScreen's mode tabs use — unselected stays a bordered box.
// No default selection anywhere in this app: a wrong prefill would silently
// misrecord a plan or payment method (DESIGN.md).

import { Pressable, Text, View } from "react-native";
import { DiagonalCut } from "./DiagonalCut.jsx";
import { colors } from "../../theme/colors.js";

// The mockup's exact contrast color for a secondary line of text sitting on
// the accent fill (PhoneNewMember.dc.html's plan-duration caption) — a dark
// olive rather than pure black, so it reads as "muted" without disappearing
// against lime the way textMuted/textDim would.
const ACCENT_MUTED = "#3a4a10";

export default function ChoiceGroup({ label, options, value, onChange }) {
  return (
    <View className="flex-col gap-1.5">
      <Text className="font-body-medium text-sm text-muted">{label}</Text>
      <View accessibilityRole="radiogroup" accessibilityLabel={label} className="flex-row gap-2">
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <Pressable
              key={option.value}
              onPress={() => onChange(option.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              className="flex-1"
            >
              {selected ? (
                <DiagonalCut
                  color={colors.accent}
                  cutPercent={88}
                  style={{ height: 58, alignItems: "center", justifyContent: "center", gap: 1 }}
                >
                  <Text className="font-body-bold text-sm text-page">{option.label}</Text>
                  {option.detail && (
                    <Text className="font-body text-[10px]" style={{ color: ACCENT_MUTED }}>
                      {option.detail}
                    </Text>
                  )}
                </DiagonalCut>
              ) : (
                <View className="h-[58px] items-center justify-center gap-[1px] border border-border bg-card">
                  <Text className="font-body-bold text-sm text-white">{option.label}</Text>
                  {option.detail && <Text className="font-body text-[10px] text-dim">{option.detail}</Text>}
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
