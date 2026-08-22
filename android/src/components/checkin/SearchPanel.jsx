// Name search never dead-ends check-in (PRD 4.3). Ported from
// server/src/components/checkin/SearchPanel.jsx, reskinned to Kinetic
// Court.

import { useEffect, useState } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";
import { Search } from "lucide-react-native";
import { findMembersByName } from "../../domain/checkIn.js";
import Touchable from "../ui/Touchable.jsx";
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
      <View className="h-16 flex-row items-center gap-2 border border-border bg-card px-4">
        <Search size={20} strokeWidth={1.75} color={colors.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          editable={!disabled}
          placeholder="Search by name"
          placeholderTextColor={colors.border}
          className="flex-1 bg-transparent font-body text-lg text-white"
        />
      </View>

      <ScrollView className="max-h-96 border border-border bg-card">
        {query.trim() && results.length === 0 && (
          <Text className="px-4 py-3 font-body text-base text-muted">
            No members match "{query.trim()}"
          </Text>
        )}
        {results.map((member) => (
          <Touchable
            key={member.id}
            onPress={() => onSelect(member.id)}
            disabled={disabled}
            className="h-14 w-full flex-row items-center justify-between border-b border-hairline px-4"
          >
            <Text className="font-body text-lg text-white">{member.name}</Text>
            <Text className="font-heading text-base text-muted">#{member.id}</Text>
          </Touchable>
        ))}
      </ScrollView>
    </View>
  );
}
