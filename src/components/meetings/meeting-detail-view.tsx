"use client";

import Link from "next/link";
import { useMeetingDetail } from "@/hooks/use-meetings";
import { formatDateTime, formatIdr } from "@/lib/client/formatters";
import {
  ErrorState,
  LoadingState,
  MeetingStatusBadge,
} from "@/components/ui/state-views";

const CONVERSATION_FLOW = [
  {
    stage: "Understand",
    summary: "Walk through the brief, audience, and budget guardrails.",
  },
  {
    stage: "Explore",
    summary: "Talk through distinct creative angles out loud.",
  },
  {
    stage: "Evaluate",
    summary: "Weigh ideas against client requirements and constraints.",
  },
  {
    stage: "Align",
    summary: "Choose a favorite direction to turn into a proposal.",
  },
] as const;

export function MeetingDetailView({ meetingId }: { meetingId: string }) {
  const { meeting, isLoading, error, mockMode, toggleMockMode, refresh } =
    useMeetingDetail(meetingId);

  if (isLoading) {
    return (
      <LoadingState
        title="Opening your meeting brief..."
        description="Gathering the goals, guardrails, and preparation details."
      />
    );
  }

  if (error || !meeting) {
    return (
      <div className="space-y-4">
        <Link
          href="/meetings"
          className="inline-flex items-center gap-1 text-xs font-medium text-[#5c5852] hover:text-[#1f1e1c]"
        >
          <span aria-hidden="true">←</span>
          <span>Back to meetings</span>
        </Link>
        <ErrorState
          title="We couldn't find that meeting brief"
          message={error?.message ?? "This meeting brief could not be loaded."}
          code={error?.code}
          onRetry={() => void refresh()}
          showMockToggle={!mockMode}
          onEnableMockMode={() => toggleMockMode(true)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Back Link */}
      <div className="flex items-center justify-between gap-2">
        <Link
          href="/meetings"
          className="inline-flex items-center gap-1 text-xs font-medium text-[#5c5852] transition hover:text-[#1f1e1c]"
        >
          <span aria-hidden="true">←</span>
          <span>All meetings</span>
        </Link>
        <MeetingStatusBadge status={meeting.status} />
      </div>

      {/* Briefing Title Card */}
      <header className="wops-warm-card rounded-3xl p-5 sm:p-8">
        <p className="text-xs font-medium text-[#d95d39]">
          {meeting.clientName} · {meeting.projectName}
        </p>
        <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-[#1f1e1c] sm:text-3xl">
          {meeting.title}
        </h1>
        <p className="mt-2.5 text-sm leading-relaxed text-[#5c5852] sm:text-base">
          {meeting.meetingObjective}
        </p>

        {/* Key Facts Strip */}
        <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-[#ebe6dd] pt-5 sm:grid-cols-3">
          <div>
            <dt className="text-[11px] font-medium text-[#8a847c]">
              Scheduled for
            </dt>
            <dd className="mt-0.5 text-xs font-medium text-[#1f1e1c] sm:text-sm">
              {formatDateTime(meeting.scheduledAt)}
            </dd>
          </div>

          <div>
            <dt className="text-[11px] font-medium text-[#8a847c]">
              Budget ceiling
            </dt>
            <dd className="mt-0.5 text-xs font-semibold text-[#d95d39] sm:text-sm">
              Up to {formatIdr(meeting.budgetCeilingIdr)}
            </dd>
            <dd className="text-[11px] text-[#8a847c]">
              Ceiling, not mandatory spend
            </dd>
          </div>

          <div className="col-span-2 sm:col-span-1">
            <dt className="text-[11px] font-medium text-[#8a847c]">
              Preparation call with
            </dt>
            <dd className="mt-0.5 text-xs font-medium text-[#1f1e1c] sm:text-sm">
              {meeting.participantRole}
            </dd>
            <dd className="text-[11px] text-[#8a847c]">
              Set by {meeting.leadRole}
            </dd>
          </div>
        </dl>
      </header>

      {/* Assistant Guidance Card (Sprint A3 Voice Call Preview — Inspired by Reference 3 Callie Banner) */}
      <section
        aria-labelledby="wops-assistant-guidance-heading"
        className="relative overflow-hidden rounded-3xl border border-[#f5d5c8] bg-[#fdf1ec]/85 p-5 sm:p-7"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3.5">
            <div
              aria-hidden="true"
              className="wops-assistant-orb mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white shadow-xs"
            >
              ✦
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2
                  id="wops-assistant-guidance-heading"
                  className="text-base font-semibold text-[#1f1e1c]"
                >
                  WOPS! — your pre-meeting thinking partner
                </h2>
                <span className="rounded-full bg-white/90 px-2.5 py-0.5 text-[11px] font-medium text-[#b44322]">
                  Voice session · Next step
                </span>
              </div>
              <p className="text-sm leading-relaxed text-[#5c5852]">
                Before the meeting begins, WOPS! calls the{" "}
                <strong className="font-medium text-[#1f1e1c]">
                  {meeting.participantRole}
                </strong>{" "}
                for a short, structured voice conversation to explore ideas and
                prepare a grounded campaign proposal.
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled
            className="inline-flex min-h-[40px] shrink-0 cursor-not-allowed items-center justify-center rounded-full border border-[#f5d5c8] bg-white/90 px-4 py-2 text-xs font-medium text-[#b44322]"
          >
            Voice call coming in Sprint A3
          </button>
        </div>

        <ol className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {CONVERSATION_FLOW.map((item, idx) => (
            <li
              key={item.stage}
              className="rounded-2xl border border-[#f5d5c8]/80 bg-white/90 p-3"
            >
              <p className="text-xs font-semibold text-[#1f1e1c]">
                {idx + 1}. {item.stage}
              </p>
              <p className="mt-1 text-[11px] leading-snug text-[#5c5852]">
                {item.summary}
              </p>
            </li>
          ))}
        </ol>
      </section>

      {/* Section: What Matters (Client Objective & Audience) */}
      <section className="wops-warm-card rounded-3xl p-5 sm:p-7">
        <h2 className="text-base font-semibold text-[#1f1e1c]">
          What matters for this campaign
        </h2>

        <div className="mt-4 space-y-4">
          <div className="rounded-2xl bg-[#faf9f6] p-4">
            <h3 className="text-xs font-medium text-[#8a847c]">
              Client campaign goal
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-[#1f1e1c]">
              {meeting.clientObjective}
            </p>
          </div>

          <div className="rounded-2xl bg-[#faf9f6] p-4">
            <h3 className="text-xs font-medium text-[#8a847c]">
              Who we&apos;re trying to reach
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-[#1f1e1c]">
              {meeting.targetAudience}
            </p>
          </div>
        </div>
      </section>

      {/* Section: Requirements & Guardrails */}
      <div className="grid gap-5 sm:grid-cols-2">
        <section className="wops-warm-card rounded-3xl p-5 sm:p-6">
          <h2 className="text-base font-semibold text-[#1f1e1c]">
            What to include
          </h2>
          <p className="mt-0.5 text-xs text-[#8a847c]">
            Key requirements from the client brief
          </p>

          {meeting.clientRequirements.length > 0 ? (
            <ul className="mt-4 space-y-2.5">
              {meeting.clientRequirements.map((req, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2.5 text-sm leading-relaxed text-[#1f1e1c]"
                >
                  <span
                    aria-hidden="true"
                    className="mt-1 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#fdf1ec] text-[10px] font-bold text-[#d95d39]"
                  >
                    ✓
                  </span>
                  <span>{req}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-xs text-[#8a847c]">
              No specific deliverables listed yet.
            </p>
          )}
        </section>

        <section className="wops-warm-card rounded-3xl p-5 sm:p-6">
          <h2 className="text-base font-semibold text-[#1f1e1c]">
            Guardrails &amp; boundaries
          </h2>
          <p className="mt-0.5 text-xs text-[#8a847c]">
            Constraints WOPS! will respect during ideation
          </p>

          {meeting.constraints.length > 0 ? (
            <ul className="mt-4 space-y-2.5">
              {meeting.constraints.map((item, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2.5 text-sm leading-relaxed text-[#1f1e1c]"
                >
                  <span
                    aria-hidden="true"
                    className="mt-1 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#f4f1ea] text-[10px] font-bold text-[#5c5852]"
                  >
                    •
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-xs text-[#8a847c]">
              No extra constraints listed.
            </p>
          )}
        </section>
      </div>

      {/* Section: People & Client Brief Documents */}
      <div className="grid gap-5 sm:grid-cols-2">
        {/* People */}
        <section className="wops-warm-card rounded-3xl p-5 sm:p-6">
          <h2 className="text-base font-semibold text-[#1f1e1c]">
            People in the loop
          </h2>
          <p className="mt-0.5 text-xs text-[#8a847c]">
            Team members preparing for this session
          </p>

          {meeting.participants.length > 0 ? (
            <ul className="mt-4 space-y-2.5">
              {meeting.participants.map((person, idx) => (
                <li
                  key={`${person.name}-${idx}`}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-[#faf9f6] px-3.5 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[#1f1e1c]">
                      {person.name}
                    </p>
                    <p className="truncate text-xs text-[#5c5852]">
                      {person.role}
                    </p>
                  </div>
                  <span
                    aria-hidden="true"
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#fdf1ec] text-xs font-semibold text-[#d95d39]"
                  >
                    {person.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-xs text-[#5c5852]">
              {meeting.leadRole} &amp; {meeting.participantRole}
            </p>
          )}
        </section>

        {/* Client Documents Placeholder (Sprint A2) */}
        <section
          aria-labelledby="client-documents-heading"
          className="wops-warm-card flex flex-col justify-between rounded-3xl p-5 sm:p-6"
        >
          <div>
            <div className="flex items-center justify-between gap-2">
              <h2
                id="client-documents-heading"
                className="text-base font-semibold text-[#1f1e1c]"
              >
                Client brief documents
              </h2>
              <span className="rounded-full bg-[#f4f1ea] px-2.5 py-0.5 text-[11px] font-medium text-[#5c5852]">
                Sprint A2
              </span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-[#5c5852]">
              Attach client PDF briefs so WOPS! can ground every recommendation
              in real document facts.
            </p>

            {meeting.documentIds.length > 0 ? (
              <div className="mt-4 space-y-2">
                {meeting.documentIds.map((docId) => (
                  <div
                    key={docId}
                    className="flex items-center gap-2.5 rounded-2xl bg-[#faf9f6] px-3.5 py-2.5 text-xs font-medium text-[#1f1e1c]"
                  >
                    <span aria-hidden="true">📄</span>
                    <span className="truncate">{docId}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed border-[#dcd4c6] bg-[#faf9f6] px-4 py-3 text-xs text-[#8a847c]">
                No PDF briefs attached yet. Document upload opens in Sprint A2.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
