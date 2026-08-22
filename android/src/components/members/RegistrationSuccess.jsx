// S6 — Registration Success (frontend-spec.md §6.6). Ported from
// server/src/components/members/RegistrationSuccess.jsx, reskinned to
// Kinetic Court. The member number is the hero — the Arm's-Length Rule at
// its most literal, read aloud and transcribed onto a physical card — sized
// larger than anything else in the app, including the numpad digits. Set in
// font-heading (Fjalla One), not font-display (Zen Dots): the latter is
// reserved for the wordmark and the numpad's own digits only
// (tailwind.config.js), and a member # is exactly the "badge" role
// font-heading already owns elsewhere.
//
// "Print card" is dropped: the web version already calls it best-effort
// (frontend-spec.md §11 OD-3, no printer assumed for the pilot), and RN has
// no window.print() to fall back to. The number and QR on screen are what
// actually gets written onto the card.

import { CheckCircle2 } from "lucide-react-native";
import { Text, View } from "react-native";
import QrCode from "../ui/QrCode.jsx";
import { PressableDiagonalCut } from "../ui/DiagonalCut.jsx";
import { colors } from "../../theme/colors.js";

export default function RegistrationSuccess({ member, onDone }) {
  return (
    <View className="flex-1 bg-page">
      <View className="flex-1 items-center justify-center gap-8 px-4">
        <View className="items-center gap-3">
          <CheckCircle2 size={44} strokeWidth={1.75} color={colors.accent} />
          <Text className="text-center font-body-bold text-3xl text-white">
            {member.name} is in
          </Text>
        </View>

        <View className="items-center gap-1">
          <Text className="font-heading text-xs tracking-[0.08em] text-muted">
            MEMBER NUMBER
          </Text>
          <Text className="font-heading text-8xl leading-none text-white">{member.id}</Text>
        </View>

        <View className="items-center gap-4">
          <View className="border border-border bg-white p-4">
            <QrCode value={member.id} size={176} />
          </View>
          <Text className="font-body text-base text-muted">
            Write this number on the member&apos;s card.
          </Text>
        </View>
      </View>

      <View className="border-t border-border bg-card p-4">
        <PressableDiagonalCut
          onPress={onDone}
          color={colors.accent}
          style={{ height: 62, alignItems: "center", justifyContent: "center" }}
        >
          <Text className="font-heading text-lg tracking-wider text-page">DONE</Text>
        </PressableDiagonalCut>
      </View>
    </View>
  );
}
