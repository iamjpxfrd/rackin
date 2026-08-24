// Hardware/gesture back button support (2026-08-25 follow-up). RN's native
// `Modal` already intercepts the back press via `onRequestClose`
// (CheckoutModal/CheckInAgainModal use this), but the app's other overlays
// — Sheet, ConfirmDialog, ConfirmationCard — are plain absolutely-positioned
// Views, which Android's back button walks straight past to the default
// "exit the app" behavior. This is the shared registration those need.
//
// Multiple mounted listeners stack correctly with no extra work here:
// RN's BackHandler invokes listeners in reverse-registration order and
// stops at the first one that returns true, so an open sheet floating over
// Member Profile floating over a tab closes just the sheet on one back
// press, same as a tap on its own close button would.
import { useEffect } from "react";
import { BackHandler } from "react-native";

export function useBackHandler(onBackPress, enabled = true) {
  useEffect(() => {
    if (!enabled) return undefined;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      onBackPress();
      return true;
    });
    return () => subscription.remove();
  }, [onBackPress, enabled]);
}
