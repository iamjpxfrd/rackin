// Small structural pieces shared across list-style screens. Ported from
// server/src/components/ui/Layout.jsx, reskinned to Kinetic Court. Only
// SectionHeader/Panel/EmptyState so far — the web version's ScreenHeader
// isn't ported because the Kinetic Court design doesn't use a per-screen
// title row anywhere (the tab bar already names the active tab); add it
// here if a later screen's mockup actually calls for one.

import { Text, View } from "react-native";

/** Uppercase eyebrow above a section, matching the activity feed's. */
export function SectionHeader({ children, count, accentCount = false }) {
  return (
    <View className="h-8 flex-row items-center justify-between">
      <Text className="font-heading text-[11px] tracking-[0.1em] text-muted">{children}</Text>
      {count !== undefined && (
        <Text className={`font-heading text-xs ${accentCount ? "text-accent" : "text-white"}`}>
          {count}
        </Text>
      )}
    </View>
  );
}

/**
 * Zero-result panel. One sentence, optionally one action — no illustration,
 * no apology (DESIGN.md voice).
 */
export function EmptyState({ title, hint, action }) {
  return (
    <View className="items-center gap-3 border border-border bg-card px-6 py-10">
      <Text className="text-center font-body text-lg text-white">{title}</Text>
      {hint && <Text className="text-center font-body text-sm text-muted">{hint}</Text>}
      {action}
    </View>
  );
}

/** Card surface that groups list rows, with hairline dividers between them. */
export function Panel({ children }) {
  return <View className="overflow-hidden border border-border bg-card">{children}</View>;
}
