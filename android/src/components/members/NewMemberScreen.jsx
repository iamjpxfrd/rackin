// S5 — New Member (frontend-spec.md §6.5, PRD 4.6). Ported from
// server/src/components/members/NewMemberScreen.jsx, reskinned to Kinetic
// Court and matched to PhoneNewMember.dc.html: name, plan, payment method,
// amount, one confirm. Registration and the first payment are ONE screen
// with ONE confirm, never two steps with a save-and-continue. Field order
// matches how staff actually talk: name → phone → plan → money, the
// conversation reaches money last.

import { useEffect, useState } from "react";
import { ScrollView, Switch, Text, View } from "react-native";
import { registerMember } from "../../domain/members.js";
import { getOnDesk } from "../../domain/staff.js";
import { computeCoversUntil } from "../../domain/membership.js";
import { isPromoActive, setPromoActive, suggestedAmount } from "../../domain/pricing.js";
import {
  CURRENCY_SYMBOL,
  PLAN_TYPES,
  formatDate,
  planDuration,
  planLabel,
} from "../../domain/constants.js";
import { SectionHeader } from "../ui/Layout.jsx";
import Field from "../ui/Field.jsx";
import ChoiceGroup from "../ui/ChoiceGroup.jsx";
import TransferQr from "../ui/TransferQr.jsx";
import { PressableDiagonalCut } from "../ui/DiagonalCut.jsx";
import TakenBy from "../staff/TakenBy.jsx";
import NameField from "./NameField.jsx";
import ErrorBanner from "../checkin/ErrorBanner.jsx";
import { colors } from "../../theme/colors.js";

const PLAN_OPTIONS = PLAN_TYPES.map((value) => ({
  value,
  label: planLabel(value).toUpperCase(),
  // Durations stated at the point of choice, so the flat-30-day rule is
  // legible before staff commit rather than discovered later.
  detail: planDuration(value),
}));

const MEMBERSHIP_TYPE_OPTIONS = [
  { value: false, label: "REGULAR" },
  { value: true, label: "STUDENT" },
];

const METHOD_OPTIONS = [
  { value: "cash", label: "CASH" },
  { value: "transfer", label: "TRANSFER" },
];

// Monthly and Annually are the two plans priced by membership type
// (pricing.js) — Session/Weekly are flat for everyone.
function planNeedsMembershipType(planType) {
  return planType === "monthly" || planType === "annually";
}

export default function NewMemberScreen({ nextMemberId, onRegistered }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [planType, setPlanType] = useState(null);
  const [isStudent, setIsStudent] = useState(null);
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState(null);
  // The gym's seasonal Monthly discount — a device-wide setting (see
  // pricing.js), not a per-registration choice, so it's loaded on mount
  // rather than starting from a guess.
  const [promoActive, setPromoActiveState] = useState(false);

  const [fieldErrors, setFieldErrors] = useState({});
  const [saveError, setSaveError] = useState(null);
  const [saving, setSaving] = useState(false);
  // Registering takes the first payment, so it is attributed exactly as a
  // renewal is. `undefined` until the on-desk lookup lands, distinct from a
  // real "nobody" answer (null), so a form submitted quickly can't produce a
  // false null.
  const [takenBy, setTakenBy] = useState(undefined);

  useEffect(() => {
    let cancelled = false;
    getOnDesk().then((person) => {
      if (!cancelled) setTakenBy(person);
    });
    isPromoActive().then((active) => {
      if (!cancelled) setPromoActiveState(active);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Fills Amount from the plan/membership-type/promo combination — a
  // prefill, not a lock, so staff can still type over it. Monthly and
  // Annually both need a membership-type choice before there's a real number
  // to suggest; Session/Weekly don't care about membership type at all
  // (pricing.js).
  function applySuggestedAmount(nextPlanType, nextIsStudent, nextPromoActive = promoActive) {
    if (nextPlanType === null) return;
    if (planNeedsMembershipType(nextPlanType) && nextIsStudent === null) return;
    const suggested = suggestedAmount(nextPlanType, {
      isStudent: !!nextIsStudent,
      promoActive: nextPromoActive,
    });
    if (suggested !== null) setAmount(String(suggested));
  }

  function selectPlan(next) {
    setPlanType(next);
    applySuggestedAmount(next, isStudent);
  }

  function selectMembershipType(next) {
    setIsStudent(next);
    applySuggestedAmount(planType, next);
  }

  async function togglePromo(next) {
    setPromoActiveState(next);
    applySuggestedAmount(planType, isStudent, next);
    await setPromoActive(next);
  }

  const numericAmount = Number(amount);
  const amountIsValid = Number.isFinite(numericAmount) && numericAmount > 0;
  // Membership type only matters for Monthly and Annually (pricing.js) —
  // Session/Weekly are flat regardless, so nothing blocks submit on it.
  const needsMembershipType = planNeedsMembershipType(planType);
  const canSubmit =
    name.trim() !== "" &&
    planType !== null &&
    (!needsMembershipType || isStudent !== null) &&
    amountIsValid &&
    paymentMethod !== null;

  // Live preview: the resulting coverage date, computed by the same domain
  // function that will do the write.
  const coversUntil = planType
    ? computeCoversUntil(new Date().toISOString(), planType)
    : null;

  async function handleSubmit() {
    const errors = {};
    if (!name.trim()) errors.name = "Enter the member's name.";
    if (!amountIsValid) errors.amount = "Enter the amount received.";
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0 || !canSubmit) return;

    setSaving(true);
    setSaveError(null);
    try {
      const { member } = await registerMember({
        name,
        phone,
        planType,
        isStudent: !!isStudent,
        amount: numericAmount,
        paymentMethod,
        recordedBy: takenBy,
      });
      onRegistered(member);
    } catch (err) {
      // Nothing is half-saved — registerMember is one transaction — so the
      // form keeps its values and staff can retry without re-entry.
      setSaveError(`${err.message} Nothing was saved.`);
    } finally {
      setSaving(false);
    }
  }

  const disabled = !canSubmit || saving;

  return (
    <ScrollView className="flex-1 bg-page" contentContainerClassName="gap-6 p-4 pb-6">
      <View className="gap-4">
        <SectionHeader>MEMBER</SectionHeader>
        <NameField
          label="Full name"
          value={name}
          onChange={(next) => {
            setName(next);
            if (fieldErrors.name) setFieldErrors((e) => ({ ...e, name: undefined }));
          }}
          error={fieldErrors.name}
        />
        <Field label="Phone · optional" value={phone} onChange={setPhone} inputMode="tel" />
        <ChoiceGroup label="Plan" options={PLAN_OPTIONS} value={planType} onChange={selectPlan} />
        {needsMembershipType && (
          <ChoiceGroup
            label="Membership type"
            options={MEMBERSHIP_TYPE_OPTIONS}
            value={isStudent}
            onChange={selectMembershipType}
          />
        )}
      </View>

      <View className="gap-4">
        <SectionHeader>FIRST PAYMENT</SectionHeader>

        {/* A device-wide setting, not a per-registration field — see
            pricing.js. Only Monthly's suggested amount responds to it. */}
        <View className="flex-row items-center justify-between gap-3 border border-border bg-card px-4 py-3">
          <View className="min-w-0 flex-1">
            <Text className="font-body-medium text-sm text-white">Summer promo</Text>
            <Text className="font-body text-xs text-muted">Discounts the Monthly rate</Text>
          </View>
          <Switch
            value={promoActive}
            onValueChange={togglePromo}
            trackColor={{ false: colors.border, true: colors.accent }}
            thumbColor={colors.textPrimary}
          />
        </View>

        <Field
          label="Amount received"
          value={amount}
          onChange={(next) => {
            setAmount(next);
            if (fieldErrors.amount) setFieldErrors((e) => ({ ...e, amount: undefined }));
          }}
          error={fieldErrors.amount}
          inputMode="decimal"
          numeric
          prefix={CURRENCY_SYMBOL || undefined}
        />
        <ChoiceGroup
          label="Payment method"
          options={METHOD_OPTIONS}
          value={paymentMethod}
          onChange={setPaymentMethod}
        />
        {paymentMethod === "transfer" && <TransferQr />}

        <TakenBy value={takenBy} onChange={setTakenBy} />
      </View>

      {saveError && <ErrorBanner message={saveError} />}

      {/* The assigned number appears BEFORE confirm so staff can start
          writing the physical card while still talking. */}
      <View className="flex-row items-center justify-between gap-4 border border-border bg-card px-4 py-3">
        <Text className="font-body-medium text-sm text-white">Will be member</Text>
        <View className="shrink-0 flex-row items-baseline gap-3">
          <Text className="font-heading text-base text-white">#{nextMemberId}</Text>
          <Text className="font-body text-sm text-muted">
            {coversUntil ? `covers until ${formatDate(coversUntil)}` : "choose a plan"}
          </Text>
        </View>
      </View>

      <PressableDiagonalCut
        onPress={handleSubmit}
        disabled={disabled}
        color={disabled ? colors.border : colors.accent}
        style={{ height: 62, alignItems: "center", justifyContent: "center" }}
      >
        <Text
          className="font-heading text-lg tracking-wider"
          style={{ color: disabled ? colors.textMuted : colors.page }}
        >
          REGISTER MEMBER
        </Text>
      </PressableDiagonalCut>
    </ScrollView>
  );
}
