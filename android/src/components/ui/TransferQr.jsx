// The gym's receiving QR, shown when staff pick Transfer so the member can
// scan and pay from their own phone (frontend-spec.md §6.5). Ported from
// server/src/components/ui/TransferQr.jsx, reskinned to Kinetic Court.
// RackIn only RECORDS that a payment happened — it does not process one
// (PRODUCT.md): no amount is encoded, no confirmation is read back, staff
// still tap REGISTER themselves once the member shows them the transfer.
//
// The web version's "missing QR" fallback (a public asset that might 404 at
// runtime) doesn't apply here — assets/payment-qr.png (the gym's real code,
// copied over from server/public/) is bundled at build time, so it's always
// present; a missing file would fail the Metro build itself, not something
// to guard against at render time.

import { useState } from "react";
import { Image, Modal, Pressable, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { Maximize2, X } from "lucide-react-native";
import Touchable, { usePressFlash } from "./Touchable.jsx";
import { colors } from "../../theme/colors.js";

const PAYMENT_QR = require("../../../assets/payment-qr.png");

export default function TransferQr() {
  const [enlarged, setEnlarged] = useState(false);
  // Borderless "Enlarge" link and the solid-white modal Close button both
  // get a scale pulse only — see Touchable.jsx's header for why a
  // rectangular flash doesn't suit either surface.
  const enlargeLinkPress = usePressFlash();
  const closePress = usePressFlash();

  return (
    <>
      <View className="flex-row items-center gap-4 border border-border bg-card p-4">
        <Touchable
          onPress={() => setEnlarged(true)}
          accessibilityLabel="Enlarge payment QR"
          className="shrink-0 border border-border p-1"
        >
          <Image source={PAYMENT_QR} style={{ width: 88, height: 88 }} resizeMode="contain" />
        </Touchable>

        <View className="min-w-0 flex-1 flex-col gap-1">
          <Text className="font-body-medium text-base text-white">
            Have them scan to transfer
          </Text>
          <Text className="font-body text-sm text-muted">
            Record the payment once the transfer shows on their phone.
          </Text>
          <Pressable
            onPress={() => {
              enlargeLinkPress.trigger();
              setEnlarged(true);
            }}
            accessibilityRole="button"
            className="mt-1 self-start"
          >
            <Animated.View
              style={[enlargeLinkPress.scaleStyle, { flexDirection: "row", alignItems: "center", gap: 6 }]}
            >
              <Maximize2 size={16} strokeWidth={1.75} color={colors.textMuted} />
              <Text className="font-body text-sm text-muted">Enlarge</Text>
            </Animated.View>
          </Pressable>
        </View>
      </View>

      <Modal visible={enlarged} transparent animationType="fade" onRequestClose={() => setEnlarged(false)}>
        <Pressable
          onPress={() => setEnlarged(false)}
          className="flex-1 items-center justify-center gap-6 bg-black/80 p-6"
        >
          <View className="bg-white p-6">
            <Image source={PAYMENT_QR} style={{ width: 280, height: 280 }} resizeMode="contain" />
          </View>
          <Pressable
            onPress={() => {
              closePress.trigger();
              setEnlarged(false);
            }}
            accessibilityRole="button"
            className="h-14 bg-white px-6"
          >
            <Animated.View
              style={[closePress.scaleStyle, { flexDirection: "row", alignItems: "center", gap: 8, height: "100%" }]}
            >
              <X size={20} strokeWidth={1.75} color={colors.page} />
              <Text className="font-body-semibold text-lg text-page">Close</Text>
            </Animated.View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
