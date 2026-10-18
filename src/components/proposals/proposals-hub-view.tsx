"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { LoadingState, ErrorState } from "@/components/ui/state-views";
import { useProposalsList } from "@/hooks/use-proposals";
import { formatShortDate } from "@/lib/client/formatters";

interface DemoPersona {
  id: string;
  name: string;
  role: string;
}

const DEMO_PERSONAS: DemoPersona[] = [
  {
    id: "usr_planner_01",
    name: "Nadia Kusuma",
    role: "Creative Campaign Planner",
  },
  {
    id: "usr_designer_01",
    name: "Bima Wijaya",
    role: "Senior Brand Designer",
  },
];

export function ProposalsHubView() {
  const [activePersonaId, setActivePersonaId] = useState<string>(
    DEMO_PERSONAS[0].id
  );

  const activePersona = useMemo(
    () =>
      DEMO_PERSONAS.find((p) => p.id === activePersonaId) ?? DEMO_PERSONAS[0],
    [activePersonaId]
  );

  const { proposals, meetingMap, isLoading, error, mockMode, refresh } =
    useProposalsList(activePersona.id);

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="My Preparation Proposals"
        description="Your personal ideas, recommendations, and talking points synthesized from completed AI preparation calls."
        actions={
          <Link
            href="/prepare"
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#ebe6dd] bg-white px-4 py-2.5 text-xs font-semibold text-[#1f1e1c] shadow-xs transition hover:bg-[#f4f1ea]"
          >
            Go to Assigned Preparations →
          </Link>
        }
      />

      {/* Advisory Banner: Personal Pre-Meeting Output */}
      <section
        aria-label="Personal preparation notice"
        className="rounded-3xl border border-[#ebe6dd] bg-[#faf9f6] p-4 text-xs leading-relaxed text-[#5c5852]"
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-[#1f1e1c]">
            Personal Preparation · Not a Final Team Decision
          </span>
          <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-800">
            Pre-Meeting Thinking
          </span>
        </div>
        <p className="mt-1">
          Each assigned team member independently explores their own discipline before the team meets.
          The actual meeting is where everyone shares their thinking, discusses trade-offs, and aligns on collective decisions.
        </p>
      </section>

      {/* Demo Persona Switcher (Testing Only) */}
      {mockMode && (
        <section
          aria-label="Demo employee perspective switcher"
          className="wops-warm-card rounded-3xl p-4 sm:p-5"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full border border-[#f5d5c8] bg-[#fdf1ec] px-2.5 py-0.5 text-[11px] font-medium text-[#b44322]">
                  Demo Persona Switcher (Testing Only)
                </span>
                <span className="text-[11px] text-[#8a847b]">
                  Personal Privacy Simulation · No Shared Drafts
                </span>
              </div>
              <p className="mt-1 text-xs text-[#5c5852]">
                Switch between assigned team members to verify that preparation proposals are strictly private to each employee.
                Completing Nadia&apos;s call generates her strategy proposal; Bima has no proposal until he finishes his own creative session.
              </p>
            </div>
          </div>

          <div
            role="group"
            aria-label="Select demo employee perspective"
            className="mt-3 flex flex-wrap gap-2"
          >
            {DEMO_PERSONAS.map((persona) => {
              const isSelected = persona.id === activePersonaId;
              return (
                <button
                  key={persona.id}
                  type="button"
                  onClick={() => setActivePersonaId(persona.id)}
                  aria-pressed={isSelected}
                  className={`min-h-10 rounded-full px-4 py-2 text-xs font-medium transition ${
                    isSelected
                      ? "bg-[#d95d39] text-white shadow-xs"
                      : "border border-[#ebe6dd] bg-[#faf9f6] text-[#1f1e1c] hover:border-[#f5d5c8] hover:bg-[#fdf1ec]/50"
                  }`}
                >
                  {persona.name} ({persona.role})
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Live API Mode Authentication Notice */}
      {!mockMode && (
        <section
          aria-label="Live API authentication status"
          className="rounded-3xl border border-[#ebe6dd] bg-[#faf9f6] p-4 text-xs text-[#5c5852]"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-[#1f1e1c]">
              Live API Mode · Identity &amp; Privacy Status
            </span>
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-semibold text-amber-800">
              Auth Pending (Developer B)
            </span>
          </div>
          <p className="mt-1 leading-relaxed">
            Backend user authentication is awaiting implementation by Developer B. In production, only proposals belonging to your authenticated account are loaded.
          </p>
        </section>
      )}

      {isLoading ? (
        <LoadingState
          title="Loading your preparation proposals..."
          description="Retrieving personal strategic recommendations and talking points."
        />
      ) : error ? (
        <ErrorState
          title="Unable to load proposals"
          message={error.message}
          onRetry={refresh}
        />
      ) : proposals.length === 0 ? (
        <section className="wops-warm-card rounded-3xl p-6 text-center sm:p-10">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fdf1ec] text-2xl">
            📋
          </div>
          <h2 className="mt-3 text-base font-semibold text-[#1f1e1c]">
            No completed preparations yet for {activePersona.name}
          </h2>
          <p className="mx-auto mt-1.5 max-w-md text-xs leading-relaxed text-[#5c5852]">
            Preparation proposals are created after you complete an AI thinking partner call.
            Head to the Prepare section to complete your 5-minute sparring session as{" "}
            <strong>{activePersona.role}</strong>.
          </p>
          <div className="mt-5 flex justify-center">
            <Link
              href="/prepare"
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#d95d39] px-5 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-[#c34e2c]"
            >
              Start Role Preparation →
            </Link>
          </div>
        </section>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8a847b]">
              Personal Outputs for {activePersona.name} ({proposals.length})
            </p>
            <span className="text-[11px] text-[#8a847b]">
              Latest preparation first
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {proposals.map((proposal) => {
              const meeting = meetingMap[proposal.meetingId];
              return (
                <article
                  key={proposal.id}
                  className="wops-warm-card flex flex-col justify-between rounded-3xl p-5 transition hover:shadow-xs sm:p-6"
                >
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="inline-flex items-center rounded-full border border-[#f5d5c8] bg-[#fdf1ec] px-2.5 py-0.5 text-[11px] font-medium text-[#b44322]">
                        {proposal.participantRole}
                      </span>
                      <span className="text-[11px] text-[#8a847c]">
                        {formatShortDate(proposal.updatedAt)}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base font-semibold tracking-tight text-[#1f1e1c]">
                        {proposal.title}
                      </h3>
                      {meeting && (
                        <p className="mt-0.5 text-xs font-medium text-[#5c5852]">
                          Meeting: {meeting.title} ({meeting.clientName})
                        </p>
                      )}
                    </div>

                    <p className="line-clamp-3 text-xs leading-relaxed text-[#5c5852]">
                      {proposal.summary}
                    </p>

                    {/* Highlights tags */}
                    <div className="flex flex-wrap gap-1.5 pt-1 text-[11px] text-[#5c5852]">
                      <span className="rounded-full bg-[#f4f1ea] px-2.5 py-1">
                        💡 {proposal.keyIdeas.length} Key Ideas
                      </span>
                      <span className="rounded-full bg-[#f4f1ea] px-2.5 py-1">
                        🎯 {proposal.confirmedDecisions.length} Decisions
                      </span>
                      <span className="rounded-full bg-[#f4f1ea] px-2.5 py-1">
                        💬 {proposal.talkingPoints.length} Talking Points
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 border-t border-[#ebe6dd] pt-4">
                    <Link
                      href={`/proposals/${proposal.id}`}
                      className="inline-flex min-h-10 w-full items-center justify-center rounded-full bg-[#d95d39] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#c34e2c]"
                    >
                      View Personal Proposal →
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
