// Ported from server/src/components/checkin/QrScanner.jsx (qr-scanner + a
// <video> element on web) to expo-camera's CameraView on RN, reskinned to
// Kinetic Court. Same contract: only decode and hand the id back to
// CheckInScreen, which still owns the single checkInMember call so numpad,
// search, and QR share one code path (ADR-001).

import { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";

const DUPLICATE_SCAN_COOLDOWN_MS = 5000;

export default function QrScanner({ onDecode, onUnavailable }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [ready, setReady] = useState(false);
  const onDecodeRef = useRef(onDecode);
  const onUnavailableRef = useRef(onUnavailable);
  const lastScanRef = useRef({ memberId: null, at: 0 });
  const attemptedRef = useRef(false);

  useEffect(() => {
    onDecodeRef.current = onDecode;
    onUnavailableRef.current = onUnavailable;
  });

  useEffect(() => {
    if (attemptedRef.current || !permission) return;
    attemptedRef.current = true;
    (async () => {
      let result = permission;
      if (!result.granted && result.canAskAgain) {
        result = await requestPermission();
      }
      if (result.granted) {
        setReady(true);
      } else {
        // Permission denied, or no camera on this device — the parent falls
        // back to numpad instantly (PRD 4.2 AC2), same as the web version's
        // scanner.start().catch().
        onUnavailableRef.current();
      }
    })();
  }, [permission, requestPermission]);

  function handleScan({ data }) {
    const memberId = data.trim();
    if (!memberId) return;
    const now = Date.now();
    // A card held in frame across the confirmation card's auto-dismiss
    // window would otherwise re-trigger the same check-in.
    if (
      memberId === lastScanRef.current.memberId &&
      now - lastScanRef.current.at < DUPLICATE_SCAN_COOLDOWN_MS
    ) {
      return;
    }
    lastScanRef.current = { memberId, at: now };
    onDecodeRef.current(memberId);
  }

  return (
    <View className="gap-2">
      <View className="relative aspect-square w-full overflow-hidden border border-border bg-card">
        {ready ? (
          <>
            <CameraView
              style={{ flex: 1 }}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
              onBarcodeScanned={handleScan}
            />
            <View pointerEvents="none" className="absolute inset-0">
              <View className="absolute left-[18px] top-[18px] h-8 w-8 border-l-[3px] border-t-[3px] border-accent" />
              <View className="absolute right-[18px] top-[18px] h-8 w-8 border-r-[3px] border-t-[3px] border-accent" />
              <View className="absolute bottom-[18px] left-[18px] h-8 w-8 border-b-[3px] border-l-[3px] border-accent" />
              <View className="absolute bottom-[18px] right-[18px] h-8 w-8 border-b-[3px] border-r-[3px] border-accent" />
            </View>
          </>
        ) : (
          <View className="flex-1 items-center justify-center">
            <Text className="font-body text-base text-muted">Starting camera…</Text>
          </View>
        )}
      </View>
      {ready && (
        <Text className="text-center font-body text-sm text-muted">
          Point camera at member's QR code
        </Text>
      )}
    </View>
  );
}
