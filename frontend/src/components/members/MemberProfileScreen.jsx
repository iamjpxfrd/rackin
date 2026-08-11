// S3 — Member Profile (frontend-spec.md §6.3).
//
// A screen rather than a modal: it holds two history lists and must scroll.
// Record Payment is sticky above the tab bar — the profile's one job and its
// one yellow element, always reachable without scrolling.

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { ChevronLeft, Hash, ScanLine, Search } from "lucide-react";
import { getMemberProfile } from "../../domain/members.js";
import {
  HISTORY_PAGE_SIZE,
  formatAmount,
  formatDate,
  formatDayMonth,
  formatTime,
} from "../../domain/constants.js";
import { ScreenHeader, SectionHeader, Panel } from "../ui/Layout.jsx";
import StatusBadge from "../ui/StatusBadge.jsx";
import QrCode from "../ui/QrCode.jsx";
import PressKey from "../ui/PressKey.jsx";
import RecordPaymentSheet from "./RecordPaymentSheet.jsx";

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
  const profile = useLiveQuery(() => getMemberProfile(memberId), [memberId]);

  if (profile === undefined) {
    return <div className="flex min-h-0 flex-1 flex-col" />;
  }
  if (profile === null) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <ScreenHeader title="Member not found" />
      </div>
    );
  }

  const { member, status, isExpiringSoon, coversUntil } = profile;
  const gutter = statusGutter(profile);
  const planLabel = member.planType === "weekly" ? "Weekly" : "Monthly";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-14 shrink-0 items-center px-2">
        <button
          type="button"
          onClick={onBack}
          className="flex h-14 items-center gap-2 rounded-ds-sm px-2 font-body text-lg font-medium text-steel-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-steel-700"
        >
          <ChevronLeft size={20} strokeWidth={1.75} />
          Back
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-4 pb-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="font-body text-3xl font-bold text-ink-900">{member.name}</h1>
          <p className="flex items-center gap-2 font-body text-sm text-steel-700">
            <span className="font-mono text-base">#{member.id}</span>
            <span>
              · {planLabel}
              {member.phone ? ` · ${member.phone}` : ""}
            </span>
          </p>
        </div>

        {/* The answer to the question that brought the owner here. */}
        <div className="flex h-22 shrink-0 items-stretch overflow-hidden rounded-ds-sm border border-steel-300 bg-surface-white">
          <div className="flex w-18 shrink-0 flex-col items-center justify-center gap-0.5 border-r border-steel-300">
            <span className="font-numeral text-4xl leading-none text-ink-900">
              {gutter.value}
            </span>
            <span className="font-body text-[13px] text-steel-700">{gutter.caption}</span>
          </div>
          <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 px-4">
            <span className="font-body text-lg font-medium text-ink-900">
              {coversUntil
                ? status === "active"
                  ? `Covered until ${formatDate(coversUntil)}`
                  : `Expired ${formatDate(coversUntil)}`
                : "No payment recorded"}
            </span>
            <span className="font-body text-sm text-steel-700">
              {planLabel} plan · {member.planType === "weekly" ? "7" : "30"} days from
              last payment
            </span>
          </div>
          <div className="flex w-36 shrink-0 items-center justify-end pr-4">
            <StatusBadge status={status} isExpiringSoon={isExpiringSoon} />
          </div>
        </div>

        <section className="flex flex-col gap-2">
          <SectionHeader>Member QR</SectionHeader>
          <div className="flex items-center gap-5 rounded-ds-sm border border-steel-300 bg-surface-white p-4">
            <div className="shrink-0 rounded-ds-sm border border-steel-300 p-2">
              <QrCode value={member.id} size={94} />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-2.5">
              <span className="font-body text-lg font-medium text-ink-900">
                Member card code
              </span>
              <span className="font-body text-sm text-steel-700">
                Hold this up to the camera to check in.
              </span>
              <button
                type="button"
                onClick={() => window.print()}
                className="h-14 w-37 rounded-ds-sm border border-steel-300 bg-surface-white font-body text-base font-semibold text-steel-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-steel-700"
              >
                Print card
              </button>
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-2">
          <SectionHeader count={profile.checkInCount}>Recent visits</SectionHeader>
          {profile.checkIns.length === 0 ? (
            <Panel>
              <p className="px-4 py-4 font-body text-base text-steel-700">
                No visits yet.
              </p>
            </Panel>
          ) : (
            <>
              <Panel>
                {profile.checkIns.map((visit) => {
                  const Icon = METHOD_ICON[visit.method] ?? Hash;
                  return (
                    <div
                      key={visit.id}
                      className="flex h-14 items-center border-b border-steel-300 px-4 last:border-b-0"
                    >
                      <span className="w-26 shrink-0 font-mono text-base text-ink-900">
                        {formatDayMonth(visit.timestamp)}
                      </span>
                      <span className="w-20 shrink-0 font-mono text-base text-steel-700">
                        {formatTime(visit.timestamp)}
                      </span>
                      <span className="min-w-0 flex-1 font-body text-base text-steel-700">
                        {METHOD_LABEL[visit.method] ?? visit.method}
                      </span>
                      <Icon
                        size={18}
                        strokeWidth={1.75}
                        className="shrink-0 text-steel-700"
                        aria-hidden="true"
                      />
                    </div>
                  );
                })}
              </Panel>
              {profile.checkInCount > HISTORY_PAGE_SIZE && (
                <p className="font-body text-sm text-steel-700">
                  Showing {HISTORY_PAGE_SIZE} most recent
                </p>
              )}
            </>
          )}
        </section>

        <section className="flex flex-col gap-2">
          <SectionHeader count={profile.paymentCount}>Payments</SectionHeader>
          {profile.payments.length === 0 ? (
            <Panel>
              <p className="px-4 py-4 font-body text-base text-steel-700">
                No payments recorded.
              </p>
            </Panel>
          ) : (
            <>
              <Panel>
                {profile.payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex h-14 items-center border-b border-steel-300 px-4 last:border-b-0"
                  >
                    <span className="w-26 shrink-0 font-mono text-base text-ink-900">
                      {formatDayMonth(payment.paidAt)}
                    </span>
                    <span className="w-31 shrink-0 font-mono text-base text-ink-900">
                      {formatAmount(payment.amount)}
                    </span>
                    <span className="w-24 shrink-0 font-body text-base text-steel-700">
                      {payment.method === "cash" ? "Cash" : "Transfer"}
                    </span>
                    {/* The resulting coverage date is what makes the
                        extend-from-payment-date rule legible in hindsight. */}
                    <span className="min-w-0 flex-1 truncate text-right font-body text-sm text-steel-700">
                      covers to {formatDate(payment.coversUntil)}
                    </span>
                  </div>
                ))}
              </Panel>
              {profile.paymentCount > HISTORY_PAGE_SIZE && (
                <p className="font-body text-sm text-steel-700">
                  Showing {HISTORY_PAGE_SIZE} most recent
                </p>
              )}
            </>
          )}
        </section>
      </div>

      <div className="shrink-0 border-t border-steel-300 bg-chalk-50 p-4">
        <PressKey onClick={() => setSheetOpen(true)}>RECORD PAYMENT</PressKey>
      </div>

      {sheetOpen && (
        <RecordPaymentSheet
          profile={profile}
          onClose={() => setSheetOpen(false)}
          // The live query re-runs on the write, so the status block updates
          // in place. No confirmation card: that celebration is check-in's
          // alone, and spending it on bookkeeping would dilute it.
          onRecorded={() => setSheetOpen(false)}
        />
      )}
    </div>
  );
}
