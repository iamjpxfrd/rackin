// S3 — Member Profile (frontend-spec.md §6.3). Ported from
// server/src/components/members/MemberProfileScreen.jsx, reskinned to
// Kinetic Court. No canvas mockup exists for this screen yet — built
// directly from the web version's already-specified layout using the
// established Kinetic Court vocabulary (Layout.jsx, StatusBadge,
// DiagonalCut, QrCode), since nothing here is a new visual direction to
// settle first.
//
// "Print card" is dropped from the Member QR section — same reasoning as
// RegistrationSuccess.jsx: no window.print() equivalent, and the web
// version already treats printing as best-effort with no printer assumed.
//
// Tap-to-enlarge added 2026-08-22, same Modal pattern as TransferQr.jsx's
// payment QR — a member holding their own phone up to photograph this code
// needs it bigger than the 84px inline size, not just easier for the
// front-desk camera to scan.

import { useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { ChevronLeft, Hash, Maximize2, ScanLine, Search, X } from "lucide-react-native";
import { getMemberProfile } from "../../domain/members.js";
import { useLiveQuery } from "../../hooks/useLiveQuery.js";
import {
  HISTORY_PAGE_SIZE,
  formatAmount,
  formatDate,
  formatDayMonth,
  formatTime,
  membershipTypeLabel,
  planDuration,
  planLabel,
} from "../../domain/constants.js";
import { SectionHeader, Panel } from "../ui/Layout.jsx";
import StatusBadge from "../ui/StatusBadge.jsx";
import QrCode from "../ui/QrCode.jsx";
import Amount from "../ui/Amount.jsx";
import { PressableDiagonalCut } from "../ui/DiagonalCut.jsx";
import Touchable, { usePressFlash } from "../ui/Touchable.jsx";
import RecordPaymentSheet from "./RecordPaymentSheet.jsx";
import PaymentDetailSheet from "./PaymentDetailSheet.jsx";
import { colors } from "../../theme/colors.js";

const METHOD_ICON = { numpad: Hash, qr: ScanLine, search: Search };
const METHOD_LABEL = { numpad: "Numpad", qr: "QR", search: "Search" };

/** Gutter contents for the status block: days left, days expired, or unpaid. */
function statusGutter({ status, daysRemaining, coversUntil }) {
  if (!coversUntil) return { value: "—", caption: "unpaid" };
  if (status === "active") {
    if (daysRemaining === 0) return { value: "0", caption: "today" };
    return { value: String(daysRemaining), caption: daysRemaining === 1 ? "day" : "days" };
  }
  return { value: String(Math.abs(daysRemaining)), caption: "days ago" };
}

export default function MemberProfileScreen({ memberId, onBack }) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [qrEnlarged, setQrEnlarged] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const profile = useLiveQuery(() => getMemberProfile(memberId), [memberId]);
  // Borderless controls (Back, the "Enlarge" text link, the enlarged QR
  // modal's Close) get a scale pulse only — see Touchable.jsx's header for
  // why a rectangular flash doesn't suit a surface with no fill of its own.
  const backPress = usePressFlash();
  const enlargeLinkPress = usePressFlash();
  const closePress = usePressFlash();

  if (profile === undefined) {
    return <View className="flex-1 bg-page" />;
  }
  if (profile === null) {
    return (
      <View className="flex-1 items-center justify-center bg-page p-6">
        <Text className="font-body text-base text-muted">Member not found.</Text>
      </View>
    );
  }

  const { member, status, isExpiringSoon, coversUntil } = profile;
  const gutter = statusGutter(profile);
  const plan = planLabel(member.planType);
  const membershipTag = membershipTypeLabel(member);

  return (
    <View className="flex-1 bg-page">
      <View className="h-14 flex-row items-center px-2">
        <Pressable
          onPress={() => {
            backPress.trigger();
            onBack();
          }}
          accessibilityRole="button"
          className="h-14 flex-row items-center gap-1 px-2"
        >
          <Animated.View style={[backPress.scaleStyle, { flexDirection: "row", alignItems: "center", gap: 4 }]}>
            <ChevronLeft size={20} strokeWidth={1.75} color={colors.textMuted} />
            <Text className="font-body-medium text-lg text-muted">Back</Text>
          </Animated.View>
        </Pressable>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="gap-6 px-4 pb-4">
        <View className="gap-1.5">
          <Text className="font-body-bold text-3xl text-white">{member.name}</Text>
          <Text className="font-body text-sm text-muted">
            <Text className="font-heading text-base text-white">#{member.id}</Text>
            {"  ·  "}
            {plan}
            {membershipTag ? ` · ${membershipTag}` : ""}
            {member.phone ? ` · ${member.phone}` : ""}
          </Text>
        </View>

        {/* The answer to the question that brought staff here. */}
        <View className="h-24 flex-row items-stretch overflow-hidden border border-border bg-card">
          <View className="w-20 shrink-0 items-center justify-center gap-0.5 border-r border-hairline">
            <Text className="font-heading text-4xl leading-none text-white">{gutter.value}</Text>
            <Text className="text-[13px] text-muted">{gutter.caption}</Text>
          </View>
          <View className="min-w-0 flex-1 justify-center gap-1 px-4">
            <Text className="font-body-medium text-base text-white">
              {coversUntil
                ? status === "active"
                  ? `Covered until ${formatDate(coversUntil)}`
                  : `Expired ${formatDate(coversUntil)}`
                : "No payment recorded"}
            </Text>
            <Text className="font-body text-sm text-muted">
              {plan} plan · {planDuration(member.planType)} from last payment
            </Text>
          </View>
          <View className="w-28 shrink-0 items-center justify-center pr-3">
            <StatusBadge status={status} isExpiringSoon={isExpiringSoon} />
          </View>
        </View>

        <View className="gap-2">
          <SectionHeader>MEMBER QR</SectionHeader>
          <View className="flex-row items-center gap-4 border border-border bg-card p-4">
            <Touchable
              onPress={() => setQrEnlarged(true)}
              accessibilityLabel="Enlarge member QR"
              className="shrink-0 border border-border p-2"
            >
              <QrCode value={member.id} size={84} />
            </Touchable>
            <View className="min-w-0 flex-1 gap-1">
              <Text className="font-body-medium text-base text-white">Member card code</Text>
              <Text className="font-body text-sm text-muted">
                Hold this up to the camera to check in.
              </Text>
              <Pressable
                onPress={() => {
                  enlargeLinkPress.trigger();
                  setQrEnlarged(true);
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
        </View>

        <View className="gap-2">
          <SectionHeader count={profile.checkInCount}>RECENT VISITS</SectionHeader>
          {profile.checkIns.length === 0 ? (
            <Panel>
              <Text className="px-4 py-4 font-body text-base text-muted">No visits yet.</Text>
            </Panel>
          ) : (
            <>
              <Panel>
                {profile.checkIns.map((visit, index) => {
                  const Icon = METHOD_ICON[visit.method] ?? Hash;
                  return (
                    <View
                      key={visit.id}
                      className={`h-14 flex-row items-center px-4 ${
                        index === profile.checkIns.length - 1 ? "" : "border-b border-hairline"
                      }`}
                    >
                      <Text className="w-20 shrink-0 font-heading text-sm text-white">
                        {formatDayMonth(visit.timestamp)}
                      </Text>
                      <Text className="w-16 shrink-0 text-right font-heading text-sm text-muted">
                        {formatTime(visit.timestamp)}
                      </Text>
                      <Text className="min-w-0 flex-1 px-2 font-body text-sm text-muted">
                        {METHOD_LABEL[visit.method] ?? visit.method}
                      </Text>
                      <Icon size={16} strokeWidth={1.75} color={colors.textMuted} />
                    </View>
                  );
                })}
              </Panel>
              {profile.checkInCount > HISTORY_PAGE_SIZE && (
                <Text className="font-body text-xs text-muted">
                  Showing {HISTORY_PAGE_SIZE} most recent
                </Text>
              )}
            </>
          )}
        </View>

        <View className="gap-2">
          <SectionHeader count={profile.paymentCount}>PAYMENTS</SectionHeader>
          {profile.payments.length === 0 ? (
            <Panel>
              <Text className="px-4 py-4 font-body text-base text-muted">No payments recorded.</Text>
            </Panel>
          ) : (
            <>
              <Panel>
                {profile.payments.map((payment, index) => (
                  <Touchable
                    key={payment.id}
                    onPress={() => setSelectedPayment(payment)}
                    accessibilityLabel={`${formatAmount(payment.amount)} paid ${formatDate(payment.paidAt)}, view details`}
                    className={`h-14 flex-row items-center px-4 ${
                      index === profile.payments.length - 1 ? "" : "border-b border-hairline"
                    }`}
                  >
                    <Text className="w-16 shrink-0 font-heading text-sm text-white">
                      {formatDayMonth(payment.paidAt)}
                    </Text>
                    <Amount
                      value={payment.amount}
                      wrapperClassName="w-20 shrink-0"
                      textClassName="font-heading text-sm"
                      color={colors.textPrimary}
                    />
                    <Text className="w-20 shrink-0 font-body text-sm text-muted">
                      {payment.method === "cash" ? "Cash" : "Transfer"}
                    </Text>
                    <Text
                      numberOfLines={1}
                      className="min-w-0 flex-1 text-right font-body text-xs text-muted"
                    >
                      covers to {formatDate(payment.coversUntil)}
                    </Text>
                  </Touchable>
                ))}
              </Panel>
              {profile.paymentCount > HISTORY_PAGE_SIZE && (
                <Text className="font-body text-xs text-muted">
                  Showing {HISTORY_PAGE_SIZE} most recent
                </Text>
              )}
            </>
          )}
        </View>
      </ScrollView>

      <View className="border-t border-border bg-card p-4">
        <PressableDiagonalCut
          onPress={() => setSheetOpen(true)}
          color={colors.accent}
          style={{ height: 62, alignItems: "center", justifyContent: "center" }}
        >
          <Text className="font-heading text-lg tracking-wider text-page">RECORD PAYMENT</Text>
        </PressableDiagonalCut>
      </View>

      {sheetOpen && (
        <RecordPaymentSheet
          profile={profile}
          onClose={() => setSheetOpen(false)}
          // The live query re-runs on the write, so the status block updates
          // in place. No confirmation card here: that celebration is
          // check-in's alone (DESIGN.md).
          onRecorded={() => setSheetOpen(false)}
        />
      )}

      {selectedPayment && (
        <PaymentDetailSheet
          payment={selectedPayment}
          member={member}
          onClose={() => setSelectedPayment(null)}
        />
      )}

      <Modal
        visible={qrEnlarged}
        transparent
        animationType="fade"
        onRequestClose={() => setQrEnlarged(false)}
      >
        <Pressable
          onPress={() => setQrEnlarged(false)}
          className="flex-1 items-center justify-center gap-6 bg-black/80 p-6"
        >
          <View className="bg-white p-6">
            <QrCode value={member.id} size={280} />
          </View>
          <Pressable
            onPress={() => {
              closePress.trigger();
              setQrEnlarged(false);
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
    </View>
  );
}
