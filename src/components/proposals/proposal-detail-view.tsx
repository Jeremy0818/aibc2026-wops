"use client";

import Link from "next/link";
import { LoadingState, ErrorState } from "@/components/ui/state-views";
import { useProposalDetail } from "@/hooks/use-proposals";
import { formatShortDate } from "@/lib/client/formatters";

interface ProposalDetailViewProps {
  proposalId: string;
}

export function ProposalDetailView({ proposalId }: ProposalDetailViewProps) {
  const { proposal, meeting, isLoading, error, refresh } =
    useProposalDetail(proposalId);

  if (isLoading) {
    return (
      <LoadingState
        title="Opening your preparation proposal..."
        description="Retrieving personal thinking, grounded brief facts, and talking points."
      />
    );
  }

  if (error || !proposal) {
    return (
      <div className="space-y-5">
        <Link
          href="/proposals"
          className="inline-flex min-h-10 items-center gap-1.5 text-xs font-medium text-[#5c5852] transition hover:text-[#1f1e1c]"
        >
          ← Back to My Proposals
        </Link>
        <ErrorState
          title="Preparation proposal not found"
          message={
            error?.message ||
            `We couldn't locate a preparation proposal matching ID "${proposalId}".`
          }
          onRetry={refresh}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-16">
      {/* Navigation Breadcrumb & Back Link */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/proposals"
          className="inline-flex min-h-10 items-center gap-1.5 text-xs font-medium text-[#5c5852] transition hover:text-[#1f1e1c]"
        >
          ← Back to proposals
        </Link>

        {meeting && (
          <Link
            href={`/prepare/${meeting.id}`}
            className="inline-flex min-h-10 items-center gap-1.5 text-xs font-medium text-[#d95d39] hover:underline"
          >
            Prepare tab →
          </Link>
        )}
      </div>

      {/* Advisory Banner: Personal Pre-Meeting Thinking */}
      <aside
        aria-label="Personal preparation disclaimer"
        className="rounded-3xl border border-[#ebe6dd] bg-[#faf9f6] p-4 text-xs leading-relaxed text-[#5c5852]"
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-[#1f1e1c]">
            Personal preparation · Not a final meeting decision
          </span>
          <span className="rounded-full border border-[#f5d5c8] bg-[#fdf1ec] px-2 py-0.5 text-[10px] font-semibold text-[#b44322]">
            {proposal.participantRole} View
          </span>
        </div>
        <p className="mt-1">
          This document captures {proposal.participantName}&apos;s independent pre-meeting thinking, ideas, and talking points to discuss when the team meets.
        </p>
      </aside>

      {/* Header Card */}
      <header className="wops-warm-card rounded-3xl p-5 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-medium text-[#d95d39]">
          <span>
            {meeting ? `${meeting.clientName} · ${meeting.projectName}` : "Meeting Preparation"}
          </span>
          <span className="text-[#8a847c]">{formatShortDate(proposal.updatedAt)}</span>
        </div>

        <h1 className="mt-2 text-xl font-bold tracking-tight text-[#1f1e1c] sm:text-2xl">
          {proposal.title}
        </h1>

        <div className="mt-3 flex flex-wrap items-center gap-2 pt-1 text-xs">
          <span className="font-medium text-[#1f1e1c]">Prepared by:</span>
          <span className="font-semibold text-[#d95d39]">{proposal.participantName}</span>
          <span className="text-[#8a847c]">({proposal.participantRole})</span>
          <span className="mx-1 text-[#dcd4c6]">·</span>
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
            Preparation Completed
          </span>
        </div>

        <p className="mt-4 border-t border-[#ebe6dd] pt-4 text-xs leading-relaxed text-[#5c5852]">
          {proposal.summary}
        </p>
      </header>

      {/* 1. MY THINKING */}
      <section
        aria-labelledby="heading-my-thinking"
        className="wops-warm-card space-y-4 rounded-3xl p-5 sm:p-7"
      >
        <div className="flex items-center justify-between border-b border-[#ebe6dd] pb-3">
          <div>
            <h2
              id="heading-my-thinking"
              className="text-sm font-bold tracking-tight text-[#1f1e1c] sm:text-base"
            >
              My Thinking
            </h2>
            <p className="text-[11px] text-[#8a847c]">
              Key ideas, strategic/creative directions, and individual recommendations
            </p>
          </div>
          <span className="text-base" aria-hidden="true">
            💡
          </span>
        </div>

        {/* Key Ideas */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.1em] text-[#8a847b]">
            Core Ideas
          </h3>
          <ul className="mt-2 space-y-2">
            {proposal.keyIdeas.map((idea, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2.5 rounded-2xl border border-[#ebe6dd] bg-[#faf9f6] p-3.5 text-xs text-[#1f1e1c]"
              >
                <span className="font-bold text-[#d95d39]">•</span>
                <span className="leading-relaxed">{idea}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Directions / Concepts */}
        {proposal.directions.length > 0 && (
          <div className="pt-2">
            <h3 className="text-xs font-semibold uppercase tracking-[0.1em] text-[#8a847b]">
              Explored Direction
            </h3>
            <div className="mt-2 space-y-3">
              {proposal.directions.map((dir) => (
                <div
                  key={dir.id}
                  className="rounded-2xl border border-[#f5d5c8] bg-[#fdf1ec]/60 p-4 text-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-bold text-[#b44322]">{dir.title}</p>
                    {dir.isRecommended && (
                      <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-[#b44322]">
                        ★ Selected Concept
                      </span>
                    )}
                  </div>
                  <p className="mt-1 font-medium italic text-[#5c5852]">
                    &ldquo;{dir.tagline}&rdquo;
                  </p>
                  <p className="mt-2 leading-relaxed text-[#1f1e1c]">{dir.summary}</p>
                  <div className="mt-2.5 border-t border-[#f5d5c8]/60 pt-2 text-[11px] text-[#8a847c]">
                    <span className="font-semibold text-[#5c5852]">Rationale: </span>
                    <span>{dir.rationale}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {proposal.recommendations.length > 0 && (
          <div className="pt-2">
            <h3 className="text-xs font-semibold uppercase tracking-[0.1em] text-[#8a847b]">
              Personal Recommendations
            </h3>
            <div className="mt-2 space-y-2.5">
              {proposal.recommendations.map((rec) => (
                <div
                  key={rec.id}
                  className="rounded-2xl border border-[#ebe6dd] bg-white p-3.5 text-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-[#1f1e1c]">{rec.topic}</span>
                    {rec.isParticipantConfirmed ? (
                      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-800">
                        ✓ Participant Confirmed
                      </span>
                    ) : (
                      <span className="rounded-full bg-[#f4f1ea] px-2 py-0.5 text-[10px] font-medium text-[#5c5852]">
                        AI Suggestion
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 font-medium text-[#1f1e1c]">
                    {rec.recommendation}
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-[#8a847c]">
                    {rec.rationale}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* 2. WHAT WE KNOW (SHARED CLIENT FACTS & CITATIONS) */}
      <section
        aria-labelledby="heading-what-we-know"
        className="wops-warm-card space-y-3 rounded-3xl p-5 sm:p-7"
      >
        <div className="flex items-center justify-between border-b border-[#ebe6dd] pb-3">
          <div>
            <h2
              id="heading-what-we-know"
              className="text-sm font-bold tracking-tight text-[#1f1e1c] sm:text-base"
            >
              What We Know
            </h2>
            <p className="text-[11px] text-[#8a847c]">
              Approved shared brief facts grounding this preparation
            </p>
          </div>
          <span className="text-base" aria-hidden="true">
            📌
          </span>
        </div>

        {proposal.sharedFacts.length === 0 ? (
          <p className="text-xs text-[#8a847c]">No source facts cited yet.</p>
        ) : (
          <ul className="space-y-2.5">
            {proposal.sharedFacts.map((fact) => (
              <li
                key={fact.id}
                className="rounded-2xl border border-[#ebe6dd] bg-[#faf9f6] p-3.5 text-xs"
              >
                <p className="font-medium text-[#1f1e1c]">
                  {fact.claimOrDecision}
                </p>
                {fact.citationNote && (
                  <p className="mt-1 text-[11px] text-[#8a847b]">
                    📄 <span className="font-semibold">{fact.citationNote}</span>
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 3. CONFIRMED CALL DECISIONS */}
      {proposal.confirmedDecisions.length > 0 && (
        <section
          aria-labelledby="heading-confirmed-decisions"
          className="wops-warm-card space-y-3 rounded-3xl p-5 sm:p-7"
        >
          <div className="flex items-center justify-between border-b border-[#ebe6dd] pb-3">
            <div>
              <h2
                id="heading-confirmed-decisions"
                className="text-sm font-bold tracking-tight text-[#1f1e1c] sm:text-base"
              >
                Confirmed Call Decisions
              </h2>
              <p className="text-[11px] text-[#8a847c]">
                Preferences logged during your AI thinking partner sparring turns
              </p>
            </div>
            <span className="text-base" aria-hidden="true">
              🎯
            </span>
          </div>

          <div className="space-y-2.5">
            {proposal.confirmedDecisions.map((dec) => (
              <div
                key={dec.id}
                className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-3.5 text-xs text-emerald-950"
              >
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <span className="font-bold text-emerald-900">{dec.topic}</span>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-800">
                    Stage: {dec.stage}
                  </span>
                </div>
                <p className="mt-1 font-semibold text-emerald-900">{dec.decision}</p>
                <p className="mt-1 text-[11px] text-emerald-800/80">{dec.rationale}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 4. WHAT I WANT TO BRING UP */}
      <section
        aria-labelledby="heading-bring-up"
        className="wops-warm-card space-y-4 rounded-3xl p-5 sm:p-7"
      >
        <div className="flex items-center justify-between border-b border-[#ebe6dd] pb-3">
          <div>
            <h2
              id="heading-bring-up"
              className="text-sm font-bold tracking-tight text-[#1f1e1c] sm:text-base"
            >
              What I Want to Bring Up
            </h2>
            <p className="text-[11px] text-[#8a847c]">
              Talking points and open questions for the actual team meeting
            </p>
          </div>
          <span className="text-base" aria-hidden="true">
            💬
          </span>
        </div>

        {/* Talking points */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.1em] text-[#8a847b]">
            Talking Points for the Team
          </h3>
          <ul className="mt-2 space-y-2">
            {proposal.talkingPoints.map((pt, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2.5 rounded-2xl border border-[#ebe6dd] bg-[#faf9f6] p-3.5 text-xs text-[#1f1e1c]"
              >
                <span className="text-sm font-bold text-[#d95d39]">🗣</span>
                <span className="leading-relaxed">{pt}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Open questions */}
        {proposal.openQuestions.length > 0 && (
          <div className="pt-2">
            <h3 className="text-xs font-semibold uppercase tracking-[0.1em] text-[#8a847b]">
              Questions to Discuss Together
            </h3>
            <ul className="mt-2 space-y-2">
              {proposal.openQuestions.map((q, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50/60 p-3.5 text-xs text-amber-950"
                >
                  <span className="text-amber-700" aria-hidden="true">
                    ❓
                  </span>
                  <span className="leading-relaxed">{q}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* 5. THINGS TO WATCH (WATCH-OUTS) */}
      <section
        aria-labelledby="heading-watch-outs"
        className="wops-warm-card space-y-4 rounded-3xl p-5 sm:p-7"
      >
        <div className="flex items-center justify-between border-b border-[#ebe6dd] pb-3">
          <div>
            <h2
              id="heading-watch-outs"
              className="text-sm font-bold tracking-tight text-[#1f1e1c] sm:text-base"
            >
              Things to Watch
            </h2>
            <p className="text-[11px] text-[#8a847c]">
              Assumptions, risks, constraints, and missing brief information
            </p>
          </div>
          <span className="text-base" aria-hidden="true">
            ⚠️
          </span>
        </div>

        {/* Risks */}
        {proposal.risks.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.1em] text-[#8a847b]">
              Identified Risks &amp; Mitigations
            </h3>
            <div className="mt-2 space-y-2.5">
              {proposal.risks.map((riskItem, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-red-200 bg-red-50/50 p-3.5 text-xs text-red-950"
                >
                  <p className="font-semibold text-red-900">
                    ⚠ {riskItem.risk}
                  </p>
                  <p className="mt-1 text-[11px] text-red-800">
                    <strong>Mitigation:</strong> {riskItem.mitigation}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Assumptions */}
        {proposal.assumptions.length > 0 && (
          <div className="pt-1">
            <h3 className="text-xs font-semibold uppercase tracking-[0.1em] text-[#8a847b]">
              Underlying Assumptions
            </h3>
            <ul className="mt-2 space-y-1.5">
              {proposal.assumptions.map((assump, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2 rounded-xl bg-[#faf9f6] p-2.5 text-xs text-[#5c5852]"
                >
                  <span className="text-[#8a847c]">•</span>
                  <span>{assump}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Constraints */}
        {proposal.constraints.length > 0 && (
          <div className="pt-1">
            <h3 className="text-xs font-semibold uppercase tracking-[0.1em] text-[#8a847b]">
              Active Constraints
            </h3>
            <ul className="mt-2 space-y-1.5">
              {proposal.constraints.map((cons, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2 rounded-xl bg-[#faf9f6] p-2.5 text-xs text-[#5c5852]"
                >
                  <span className="text-amber-600 font-bold">!</span>
                  <span>{cons}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Missing Info */}
        {proposal.missingInfo.length > 0 && (
          <div className="pt-1">
            <h3 className="text-xs font-semibold uppercase tracking-[0.1em] text-[#8a847b]">
              Missing Brief Information
            </h3>
            <ul className="mt-2 space-y-1.5">
              {proposal.missingInfo.map((info, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2 rounded-xl bg-[#faf9f6] p-2.5 text-xs text-[#5c5852]"
                >
                  <span className="text-red-500 font-bold">?</span>
                  <span>{info}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* 6. ROLE-SPECIFIC FOCUS SECTIONS */}
      {proposal.roleSections.length > 0 && (
        <section
          aria-labelledby="heading-role-sections"
          className="wops-warm-card space-y-4 rounded-3xl p-5 sm:p-7"
        >
          <div className="flex items-center justify-between border-b border-[#ebe6dd] pb-3">
            <div>
              <h2
                id="heading-role-sections"
                className="text-sm font-bold tracking-tight text-[#1f1e1c] sm:text-base"
              >
                Role Focus: {proposal.participantRole}
              </h2>
              <p className="text-[11px] text-[#8a847c]">
                Discipline-specific breakdowns and deliverables
              </p>
            </div>
            <span className="text-base" aria-hidden="true">
              🎨
            </span>
          </div>

          <div className="space-y-4">
            {proposal.roleSections.map((sec, idx) => (
              <div key={idx} className="space-y-2">
                <h3 className="text-xs font-semibold text-[#1f1e1c]">
                  {sec.title}
                </h3>
                {sec.description && (
                  <p className="text-[11px] text-[#8a847c]">
                    {sec.description}
                  </p>
                )}
                <ul className="space-y-1.5">
                  {sec.items.map((item, itemIdx) => (
                    <li
                      key={itemIdx}
                      className="flex items-start gap-2.5 rounded-2xl border border-[#ebe6dd] bg-[#faf9f6] p-3 text-xs text-[#1f1e1c]"
                    >
                      <span className="font-semibold text-[#d95d39]">▸</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Footer Actions */}
      <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/proposals"
          className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#ebe6dd] bg-white px-5 py-2.5 text-xs font-semibold text-[#5c5852] transition hover:bg-[#f4f1ea]"
        >
          ← Back to proposals
        </Link>

        {meeting && (
          <Link
            href={`/meetings/${meeting.id}`}
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#d95d39] px-5 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-[#c34e2c]"
          >
            View meeting brief →
          </Link>
        )}
      </div>
    </div>
  );
}
