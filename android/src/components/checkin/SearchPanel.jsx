// Name search never dead-ends check-in (PRD 4.3). Ported from
// server/src/components/checkin/SearchPanel.jsx.

import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Search } from "lucide-react-native";
import { findMembersByName } from "../../domain/checkIn.js";
import { colors } from "../../theme/colors.js";

export default function SearchPanel({ onSelect, disabled }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);

  useEffect(() => {
    let cancelled = false;
    findMembersByName(query).then((matches) => {
      if (!cancelled) setResults(matches);
    });
    return () => {
      cancelled = true;
    };
  }, [query]);

  return (
    <View className="flex-col gap-3">
      <View className="h-16 flex-row items-center gap-2 rounded-ds-sm border border-steel-300 bg-surface-white px-4">
        <Search size={20} strokeWidth={1.75} color={colors.steel700} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          editable={!disabled}
          placeholder="Search by name"
          placeholderTextColor={colors.steel300}
          className="flex-1 bg-transparent font-body text-lg text-ink-900"
        />
      </View>

      <ScrollView className="max-h-96 rounded-ds-sm border border-steel-300 bg-surface-white">
        {query.trim() && results.length === 0 && (
          <Text className="px-4 py-3 font-body text-base text-steel-700">
            No members match "{query.trim()}"
          </Text>
        )}
        {results.map((member) => (
          <Pressable
            key={member.id}
            onPress={() => onSelect(member.id)}
            disabled={disabled}
            accessibilityRole="button"
            className="h-14 w-full flex-row items-center justify-between border-b border-steel-300 px-4 disabled:opacity-50"
          >
            <Text className="font-body text-lg text-ink-900">{member.name}</Text>
            <Text className="font-mono text-base text-steel-700">#{member.id}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
