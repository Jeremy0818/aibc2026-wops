"use client";

import Link from "next/link";
import type { Meeting, MeetingParticipant } from "@/contracts/meeting";
import type { PreparationSession, TranscriptEvent } from "@/contracts/session";

interface CallSummaryViewProps {
  meeting: Meeting;
  participant: MeetingParticipant;
  session: PreparationSession | null;
  transcripts?: TranscriptEvent[];
  isLiveMode?: boolean;
  isDevContextBridge?: boolean;
  onResetCall: () => void;
}

export function CallSummaryView({
  meeting,
  participant,
  session,
  transcripts = [],
  isLiveMode = false,
  isDevContextBridge = false,
  onResetCall,
}: CallSummaryViewProps) {
  const decisions = session?.confirmedDecisions ?? [];
  const openQuestions = session?.openQuestions ?? [];

  // ==========================================
  // LIVE MODE: HONEST SUMMARY & PENDING STATUS
  // ==========================================
  if (isLiveMode) {
    return (
      <div className="mx-auto w-full max-w-xl space-y-5">
        {/* Development Context Bridge Persistent Label */}
        {isDevContextBridge && (
          <div className="rounded-2xl border border-indigo-200 bg-indigo-50/90 p-3 text-center text-xs font-semibold text-indigo-950 shadow-2xs">
            Development context — KOVA demo data. Real Gemini voice; meeting data is simulated.
          </div>
        )}

        {/* Top Completion Header */}
        <div className="wops-warm-card rounded-3xl p-6 text-center sm:p-8">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-xl font-bold text-emerald-800">
            ✓
          </div>

          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-[#1f1e1c]">
            Live Voice Call Completed
          </h1>

          <p className="mt-1 text-xs text-[#5c5852]">
            Real Gemini Live Session · Preparation for {participant.name} ({participant.role})
          </p>

          <p className="mx-auto mt-3 max-w-md text-xs leading-relaxed text-[#5c5852]">
            Your real-time, bidirectional voice preparation call for{" "}
            <strong className="text-[#1f1e1c]">{meeting.title}</strong> has concluded.
            Microphone streams, Web Audio contexts, and WebSocket connections were released cleanly.
          </p>

          {/* Action Controls */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/prepare"
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#d95d39] px-6 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#c34e2c]"
            >
              ← Back to preparations
            </Link>

            <button
              type="button"
              onClick={onResetCall}
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#ebe6dd] bg-white px-5 py-2.5 text-xs font-medium text-[#1f1e1c] transition hover:bg-[#faf9f6]"
            >
              Connect call again
            </button>
          </div>
        </div>

        {/* Backend Pending Integration Notice */}
        <section
          aria-labelledby="backend-pending-heading"
          className="rounded-3xl border border-amber-200 bg-amber-50/70 p-5 sm:p-6 text-xs text-amber-900 space-y-2"
        >
          <div className="flex items-center gap-2 font-semibold text-amber-950">
            <span className="text-sm">ℹ️</span>
            <h2 id="backend-pending-heading" className="text-sm">
              Backend Session Persistence &amp; Proposal Synthesis Pending
            </h2>
          </div>
          <p className="leading-relaxed text-amber-800">
            In this integration sprint (<strong>Sprint A3b-1</strong>), audio capture, 16kHz PCM downsampling,
            ephemeral-token minting, and bidirectional 24kHz Gemini Live voice communication were verified in the real browser.
          </p>
          <p className="leading-relaxed text-amber-800">
            Automated session persistence to Firestore, real-time structured decision extraction, and individual
            proposal synthesis belong to Developer B&apos;s upcoming backend endpoints. In accordance with WOPS!
            architecture rules, no mock proposal was generated for this real voice session.
          </p>
        </section>

        {/* Live Transcripts Section (Only real transcripts, never fabricated) */}
        {transcripts.length > 0 && (
          <section
            aria-labelledby="live-transcripts-heading"
            className="wops-warm-card rounded-3xl p-5 sm:p-7"
          >
            <div className="flex items-center justify-between border-b border-[#ebe6dd] pb-3">
              <div>
                <h2
                  id="live-transcripts-heading"
                  className="text-base font-semibold text-[#1f1e1c]"
                >
                  Streamed Dialogue Notes ({transcripts.length})
                </h2>
                <p className="text-xs text-[#5c5852]">
                  Real text dialogue emitted by the Gemini Live session.
                </p>
              </div>
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-800">
                Live Data
              </span>
            </div>

            <ul className="mt-4 space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {transcripts.map((t, idx) => (
                <li
                  key={t.id ?? idx}
                  className={`rounded-2xl p-3 text-xs leading-relaxed ${
                    t.speaker === "agent"
                      ? "bg-[#faf9f6] text-[#1f1e1c]"
                      : "border border-[#f5d5c8] bg-[#fdf1ec]/60 text-[#1f1e1c]"
                  }`}
                >
                  <span className="text-[10px] font-bold text-[#8a847c] block mb-0.5">
                    {t.speaker === "agent" ? "WOPS! (Gemini Live)" : participant.name}
                  </span>
                  <p>{t.text}</p>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    );
  }

  // ==========================================
  // DEMO MODE: DETERMINISTIC PREPARATION PROPOSAL
  // ==========================================
  return (
    <div className="mx-auto w-full max-w-xl space-y-5">
      {/* Top Completion Header */}
      <div className="wops-warm-card rounded-3xl p-6 text-center sm:p-8">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-xl font-bold text-emerald-800">
          ✓
        </div>

        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-[#1f1e1c]">
          Great session! You&apos;re ready.
        </h1>

        <p className="mt-1 text-xs text-[#5c5852]">
          WOPS! Demo · Preparation for {participant.name} ({participant.role})
        </p>

        <p className="mx-auto mt-3 max-w-md text-xs leading-relaxed text-[#5c5852]">
          You completed your 4-stage ideation call for{" "}
          <strong className="text-[#1f1e1c]">{meeting.title}</strong>. Your ideas,
          confirmed decisions, and discussion questions are ready in your personal proposal.
        </p>

        {/* Action Controls */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/prepare"
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#d95d39] px-6 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#c34e2c]"
          >
            ← Back to preparations
          </Link>

          <button
            type="button"
            onClick={onResetCall}
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#ebe6dd] bg-white px-5 py-2.5 text-xs font-medium text-[#1f1e1c] transition hover:bg-[#faf9f6]"
          >
            Run call again (Demo)
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
              Confirmed decisions ({decisions.length})
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
                Questions for the team meeting ({openQuestions.length})
              </h2>
              <p className="text-xs text-[#5c5852]">
                Key alignment questions flagged to discuss when the team meets.
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
            View my preparation proposal →
          </Link>
        </div>
      </div>
    </div>
  );
}
