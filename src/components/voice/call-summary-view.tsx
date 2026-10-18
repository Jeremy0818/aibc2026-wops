"use client";

import Link from "next/link";
import type { Meeting, MeetingParticipant } from "@/contracts/meeting";
import type { PreparationSession } from "@/contracts/session";

interface CallSummaryViewProps {
  meeting: Meeting;
  participant: MeetingParticipant;
  session: PreparationSession | null;
  onResetCall: () => void;
}

export function CallSummaryView({
  meeting,
  participant,
  session,
  onResetCall,
}: CallSummaryViewProps) {
  const decisions = session?.confirmedDecisions ?? [];
  const openQuestions = session?.openQuestions ?? [];

  return (
    <div className="mx-auto w-full max-w-xl space-y-5">
      {/* Top Completion Header */}
      <div className="wops-warm-card rounded-3xl p-6 text-center sm:p-8">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-xl font-bold text-emerald-800">
          ✓
        </div>

        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-[#1f1e1c]">
          Preparation Call Complete
        </h1>

        <p className="mt-1 text-xs text-[#5c5852]">
          WOPS! Demo Mode · Role-Specific Preparation for {participant.name} ({participant.role})
        </p>

        <p className="mx-auto mt-3 max-w-md text-xs leading-relaxed text-[#8a847c]">
          You have successfully completed the 4-stage ideation call for{" "}
          <strong className="text-[#1f1e1c]">{meeting.title}</strong>. Your strategic priorities
          and decisions have been captured to align the upcoming team review.
        </p>

        {/* Action Controls */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/prepare"
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#d95d39] px-6 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#c34e2c]"
          >
            ← Return to Assigned Preparations
          </Link>

          <button
            type="button"
            onClick={onResetCall}
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#ebe6dd] bg-white px-5 py-2.5 text-xs font-medium text-[#1f1e1c] transition hover:bg-[#faf9f6]"
          >
            Run Call Again (Demo)
          </button>
        </div>
      </div>

      {/* Captured Decisions */}
      <section
        aria-labelledby="confirmed-decisions-heading"
        className="wops-warm-card rounded-3xl p-5 sm:p-7"
      >
        <div className="flex items-center justify-between border-b border-[#ebe6dd] pb-3">
          <div>
            <h2
              id="confirmed-decisions-heading"
              className="text-base font-semibold text-[#1f1e1c]"
            >
              Confirmed Role Decisions ({decisions.length})
            </h2>
            <p className="text-xs text-[#5c5852]">
              Decisions captured and grounded during your preparation call.
            </p>
          </div>
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-800">
            Grounded
          </span>
        </div>

        {decisions.length === 0 ? (
          <p className="mt-4 text-xs text-[#8a847c]">
            No decisions were logged during this session.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {decisions.map((dec, idx) => (
              <li
                key={dec.id ?? idx}
                className="rounded-2xl border border-[#ebe6dd] bg-[#faf9f6] p-4 text-xs"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-[#d95d39] shadow-2xs">
                    {dec.topic}
                  </span>
                  <span className="text-[11px] text-[#8a847c]">Stage: {dec.stage}</span>
                </div>
                <p className="mt-2 text-sm font-semibold text-[#1f1e1c]">
                  {dec.decision}
                </p>
                {dec.rationale && (
                  <p className="mt-1 text-xs text-[#5c5852]">
                    <span className="font-medium text-[#8a847c]">Rationale:</span> {dec.rationale}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Open Questions for the Review Meeting */}
      {openQuestions.length > 0 && (
        <section
          aria-labelledby="open-questions-heading"
          className="wops-warm-card rounded-3xl p-5 sm:p-7"
        >
          <div className="flex items-center justify-between border-b border-[#ebe6dd] pb-3">
            <div>
              <h2
                id="open-questions-heading"
                className="text-base font-semibold text-[#1f1e1c]"
              >
                Open Questions for Team Meeting ({openQuestions.length})
              </h2>
              <p className="text-xs text-[#5c5852]">
                Key alignment questions flagged to bring into the team review.
              </p>
            </div>
            <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-medium text-amber-800">
              For Review
            </span>
          </div>

          <ul className="mt-4 space-y-2">
            {openQuestions.map((q, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2.5 rounded-2xl border border-[#ebe6dd] bg-white p-3.5 text-xs text-[#1f1e1c]"
              >
                <span className="mt-0.5 text-amber-600" aria-hidden="true">
                  ❓
                </span>
                <span>{q}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Personal Proposal Action */}
      <div className="wops-warm-card rounded-3xl p-5 text-center sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#d95d39]">
          Personal Preparation Output Ready
        </p>
        <h3 className="mt-1 text-base font-semibold text-[#1f1e1c]">
          Your {participant.role} Thinking is Documented
        </h3>
        <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-[#5c5852]">
          Your ideas, grounded brief citations, confirmed decisions, and meeting talking points have been synthesized into your personal preparation proposal.
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          <Link
            href={
              session
                ? `/proposals/prop_${session.id}_${
                    participant.role.toLowerCase().includes("designer")
                      ? "designer"
                      : "planner"
                  }`
                : "/proposals"
            }
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#d95d39] px-6 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-[#c34e2c]"
          >
            View My Preparation Proposal →
          </Link>
        </div>
      </div>
    </div>
  );
}
