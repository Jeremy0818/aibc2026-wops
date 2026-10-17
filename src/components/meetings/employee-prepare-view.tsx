"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMeetingDetail } from "@/hooks/use-meetings";
import { GroundedBriefPreview } from "@/components/meetings/grounded-brief-preview";
import {
  ErrorState,
  LoadingState,
  MeetingStatusBadge,
} from "@/components/ui/state-views";
import {
  formatDateTime,
  formatFileSize,
  formatIdr,
} from "@/lib/client/formatters";
import {
  getAssignedEmployeesForMeeting,
  getRolePreparationProfile,
} from "@/lib/client/role-preparation";

interface EmployeePrepareViewProps {
  meetingId: string;
}

export function EmployeePrepareView({ meetingId }: EmployeePrepareViewProps) {
  const searchParams = useSearchParams();
  const roleParam = searchParams.get("role");

  const {
    meeting,
    documents,
    synthesizedBrief,
    keyFacts,
    isLoading,
    error,
    mockMode,
    toggleMockMode,
    refresh,
  } = useMeetingDetail(meetingId);

  const [overrideRole, setOverrideRole] = useState<string | null>(null);
  const [showVoiceComingSoon, setShowVoiceComingSoon] = useState(false);

  const assignedEmployees = useMemo(() => {
    if (!meeting) return [];
    return getAssignedEmployeesForMeeting(meeting);
  }, [meeting]);

  const activeEmployee = useMemo(() => {
    if (assignedEmployees.length === 0) return null;
    const targetRole = overrideRole ?? roleParam;
    if (targetRole) {
      const matched = assignedEmployees.find(
        (emp) => emp.role.trim().toLowerCase() === targetRole.trim().toLowerCase()
      );
      if (matched) return matched;
    }
    return assignedEmployees[0];
  }, [assignedEmployees, overrideRole, roleParam]);

  if (isLoading) {
    return (
      <LoadingState
        title="Opening your preparation..."
        description="Loading the shared client brief and role-specific AI prompts."
      />
    );
  }

  if (error || !meeting) {
    return (
      <div className="space-y-5">
        <Link
          href="/prepare"
          className="inline-flex min-h-10 items-center gap-1.5 text-xs font-medium text-[#5c5852] transition hover:text-[#1f1e1c]"
        >
          ← Back to Assigned Preparations
        </Link>
        <ErrorState
          title="Assigned preparation not found"
          message={
            error?.message ||
            "We couldn't find a meeting matching this identifier."
          }
          code={error?.code}
          onRetry={() => void refresh()}
          showMockToggle={!mockMode}
          onEnableMockMode={() => toggleMockMode(true)}
        />
      </div>
    );
  }

  const activeRoleTitle =
    activeEmployee?.role ?? meeting.participantRole ?? "Participant";
  const activeParticipantName = activeEmployee?.name ?? activeRoleTitle;
  const roleProfile = getRolePreparationProfile(activeRoleTitle, meeting);
  const readyDocuments = documents.filter(
    (d) => d.processingStatus === "ready"
  );
  const isBriefGrounded = readyDocuments.length > 0;

  return (
    <div className="space-y-6 pb-8">
      {/* Breadcrumb & Role Badge */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/prepare"
          className="inline-flex min-h-10 items-center gap-1.5 text-xs font-medium text-[#5c5852] transition hover:text-[#1f1e1c]"
        >
          ← Back to Assigned Preparations
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-full border border-[#f5d5c8] bg-[#fdf1ec] px-3 py-1 text-xs font-medium text-[#b44322]">
            Preparing as: {activeRoleTitle}
          </span>
          <MeetingStatusBadge status={meeting.status} />
        </div>
      </div>

      {/* Demo Role Switcher — allows testing Campaign Planner vs Brand Designer on the same meeting */}
      {assignedEmployees.length > 1 && (
        <section
          aria-label="Demo employee role switcher"
          className="wops-warm-card rounded-3xl p-4 sm:p-5"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full border border-[#f5d5c8] bg-[#fdf1ec] px-2.5 py-0.5 text-[11px] font-medium text-[#b44322]">
                  Demo Employee Role Switcher
                </span>
                {mockMode && (
                  <span className="text-[11px] text-[#8a847b]">
                    Same shared brief · Role-specific AI focus
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-[#5c5852]">
                Switch between assigned team members on this meeting to see how
                WOPS! adapts the AI thinking partner to each role without
                changing or re-uploading the shared client brief.
              </p>
            </div>
          </div>

          <div
            role="group"
            aria-label="Select assigned employee role"
            className="mt-3 flex flex-wrap gap-2"
          >
            {assignedEmployees.map((emp) => {
              const isSelected =
                emp.role.trim().toLowerCase() ===
                activeRoleTitle.trim().toLowerCase();
              return (
                <button
                  key={emp.id}
                  type="button"
                  onClick={() => {
                    setOverrideRole(emp.role);
                    setShowVoiceComingSoon(false);
                  }}
                  aria-pressed={isSelected}
                  className={`min-h-10 rounded-full px-3.5 py-2 text-xs font-medium transition ${
                    isSelected
                      ? "bg-[#d95d39] text-white shadow-xs"
                      : "border border-[#ebe6dd] bg-[#faf9f6] text-[#1f1e1c] hover:border-[#f5d5c8] hover:bg-[#fdf1ec]/50"
                  }`}
                >
                  {emp.name !== emp.role
                    ? `${emp.name} · ${emp.role}`
                    : emp.role}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Header Summary Card */}
      <section className="wops-warm-card rounded-3xl p-5 sm:p-7">
        <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-[#d95d39]">
          <span>
            {meeting.clientName} ({meeting.projectName})
          </span>
          <span aria-hidden="true">·</span>
          <span>Shared Brief Setup by {meeting.leadRole}</span>
        </div>

        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#1f1e1c] sm:text-3xl">
          {meeting.title}
        </h1>

        <p className="mt-2.5 max-w-2xl text-sm leading-relaxed text-[#5c5852]">
          {meeting.meetingObjective}
        </p>

        <div className="mt-5 grid grid-cols-1 gap-3 border-t border-[#ebe6dd] pt-4 sm:grid-cols-3">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-[#8a847b]">
              Your Assigned Role
            </p>
            <p className="mt-1 text-sm font-medium text-[#1f1e1c]">
              {activeRoleTitle}
            </p>
            {activeParticipantName !== activeRoleTitle && (
              <p className="mt-0.5 text-xs text-[#5c5852]">
                Assigned to {activeParticipantName}
              </p>
            )}
          </div>

          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-[#8a847b]">
              Shared Budget Ceiling
            </p>
            <p className="mt-1 text-sm font-semibold text-[#1f1e1c]">
              {formatIdr(meeting.budgetCeilingIdr)}
            </p>
            <p className="mt-0.5 text-[11px] text-[#8a847b]">
              Integer IDR ceiling
            </p>
          </div>

          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-[#8a847b]">
              Meeting Time
            </p>
            <p className="mt-1 text-sm font-medium text-[#1f1e1c]">
              {formatDateTime(meeting.scheduledAt)}
            </p>
            <p className="mt-0.5 text-xs text-[#5c5852]">
              {readyDocuments.length} shared PDF{" "}
              {readyDocuments.length === 1 ? "brief" : "briefs"} attached
            </p>
          </div>
        </div>
      </section>

      {/* Main Two-Column Responsive Layout */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Left / Primary Column on Mobile: Role-Specific AI Preparation */}
        <div className="space-y-5 lg:col-span-6">
          <section
            aria-labelledby="role-prep-heading"
            className="wops-warm-card relative overflow-hidden rounded-3xl p-5 sm:p-6"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#f5d5c8] bg-[#fdf1ec] px-3 py-1 text-xs font-medium text-[#b44322]">
                <span
                  className="h-1.5 w-1.5 rounded-full bg-[#d95d39]"
                  aria-hidden="true"
                />
                Role-Specific AI Preparation
              </div>
              <span className="rounded-full border border-[#ebe6dd] bg-[#faf9f6] px-2.5 py-0.5 text-[11px] font-medium text-[#5c5852]">
                Less Chit. More Chat.
              </span>
            </div>

            <h2
              id="role-prep-heading"
              className="mt-3.5 text-lg font-semibold tracking-tight text-[#1f1e1c] sm:text-xl"
            >
              Prepare as {activeRoleTitle}
            </h2>
            <p className="mt-1 text-xs font-medium text-[#d95d39]">
              {roleProfile.tagline}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-[#5c5852]">
              {roleProfile.summary}
            </p>

            {/* Focus Pills */}
            <div className="mt-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8a847b]">
                Focus Areas for {activeRoleTitle}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {roleProfile.focusPills.map((pill) => (
                  <span
                    key={pill}
                    className="rounded-full border border-[#f5d5c8] bg-[#fdf1ec]/60 px-2.5 py-1 text-xs font-medium text-[#1f1e1c]"
                  >
                    {pill}
                  </span>
                ))}
              </div>
            </div>

            {/* Key Sparring Questions for this Role */}
            <div className="mt-5 rounded-2xl border border-[#ebe6dd] bg-[#faf9f6] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8a847b]">
                Questions WOPS! Will Explore With You
              </p>
              <ul className="mt-2.5 space-y-2">
                {roleProfile.keyQuestions.map((question) => (
                  <li
                    key={question}
                    className="flex items-start gap-2.5 text-xs leading-relaxed text-[#1f1e1c]"
                  >
                    <span
                      className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#d95d39]"
                      aria-hidden="true"
                    />
                    <span>{question}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* 4-Stage Structured Ideation Flow tailored to this role */}
            <div className="mt-5 space-y-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8a847b]">
                4-Stage Voice Flow ({activeRoleTitle})
              </p>
              <ol className="space-y-2">
                {roleProfile.stagePrompts.map((item, idx) => (
                  <li
                    key={item.stage}
                    className="flex items-start gap-3 rounded-2xl border border-[#ebe6dd] bg-white p-3"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#fdf1ec] text-xs font-semibold text-[#b44322]">
                      {idx + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-[#1f1e1c]">
                        {item.stage}
                      </p>
                      <p className="mt-0.5 text-xs leading-relaxed text-[#5c5852]">
                        {item.prompt}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            {/* Expected Outcome */}
            <div className="mt-4 rounded-2xl border border-[#ebe6dd] bg-[#faf9f6] px-3.5 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8a847b]">
                Expected Preparation Outcome
              </p>
              <p className="mt-1 text-xs leading-relaxed text-[#1f1e1c]">
                {roleProfile.expectedOutcome}
              </p>
            </div>

            {/* Primary CTA + Honest Coming Soon State for Gemini Live */}
            <div className="mt-5 space-y-3 border-t border-[#ebe6dd] pt-4">
              <button
                type="button"
                onClick={() => setShowVoiceComingSoon((prev) => !prev)}
                aria-expanded={showVoiceComingSoon}
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#d95d39] px-5 py-3 text-sm font-medium text-white shadow-xs transition hover:bg-[#c34e2c]"
              >
                <svg
                  className="h-4 w-4 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
                  />
                </svg>
                <span>Start AI Preparation as {activeRoleTitle}</span>
              </button>

              {showVoiceComingSoon && (
                <div
                  role="status"
                  aria-live="polite"
                  className="rounded-2xl border border-[#f5d5c8] bg-[#fdf1ec]/80 p-4 text-xs leading-relaxed text-[#1f1e1c]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-[#b44322]">
                      Gemini Live Voice Call · Coming in Sprint A3
                    </p>
                    <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-[#5c5852]">
                      Preview
                    </span>
                  </div>
                  <p className="mt-1.5 text-[#5c5852]">
                    Real-time bidirectional voice sessions via{" "}
                    <code className="rounded bg-white px-1 py-0.5 font-mono text-[11px] text-[#1f1e1c]">
                      POST /api/meetings/{meeting.id}/sessions
                    </code>{" "}
                    will connect here in Sprint A3. Your shared{" "}
                    <strong>{meeting.clientName}</strong> brief (
                    {isBriefGrounded
                      ? `${readyDocuments.length} grounded PDF ${readyDocuments.length === 1 ? "document" : "documents"}`
                      : "meeting objectives and guardrails"}
                    ) and your role profile as{" "}
                    <strong>{activeRoleTitle}</strong> are ready for the call.
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Right Column: Read-Only Shared Meeting Context & Grounded PDF Facts */}
        <div className="space-y-5 lg:col-span-6">
          {/* Shared Grounded PDF Facts (Read-Only — No Upload Dropzone Here) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8a847b]">
                Shared Client Brief (Uploaded by Team Lead)
              </p>
              <span className="rounded-full border border-[#ebe6dd] bg-white px-2.5 py-0.5 text-[11px] font-medium text-[#5c5852]">
                Read-Only Shared Context
              </span>
            </div>

            {documents.length > 0 ? (
              <>
                {/* Attached PDF metadata badge */}
                <div className="wops-warm-card rounded-3xl p-4 sm:p-5">
                  <p className="text-xs font-medium text-[#5c5852]">
                    Attached once by {meeting.leadRole} for all participants:
                  </p>
                  <ul className="mt-2.5 space-y-2">
                    {documents.map((doc) => (
                      <li
                        key={doc.id}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-[#ebe6dd] bg-[#faf9f6] px-3.5 py-2.5"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-[#1f1e1c]">
                            {doc.name}
                          </p>
                          <p className="text-[11px] text-[#8a847b]">
                            {formatFileSize(doc.sizeBytes)} · Shared PDF Brief
                          </p>
                        </div>
                        <span className="inline-flex items-center gap-1 rounded-full border border-[#cce5d8] bg-[#edf7f2] px-2.5 py-0.5 text-[11px] font-medium text-[#1f6a47]">
                          <span
                            className="h-1.5 w-1.5 rounded-full bg-current"
                            aria-hidden="true"
                          />
                          Grounded
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Extracted Facts from Shared PDF */}
                <GroundedBriefPreview
                  documents={documents}
                  synthesizedBrief={synthesizedBrief}
                  keyFacts={keyFacts}
                />
              </>
            ) : (
              <div className="wops-warm-card rounded-3xl p-5">
                <p className="text-sm font-medium text-[#1f1e1c]">
                  No client PDF brief attached yet
                </p>
                <p className="mt-1 text-xs leading-relaxed text-[#5c5852]">
                  The Team Lead ({meeting.leadRole}) uploads the client PDF brief
                  once at the meeting setup level so every participant shares the
                  same source-backed facts.
                </p>
                <Link
                  href={`/meetings/${meeting.id}`}
                  className="mt-3 inline-flex min-h-9 items-center gap-1.5 text-xs font-medium text-[#d95d39] hover:underline"
                >
                  Open Team Lead Meeting Setup →
                </Link>
              </div>
            )}
          </div>

          {/* Read-Only Shared Audience, Requirements & Constraints */}
          <section className="wops-warm-card space-y-4 rounded-3xl p-5 sm:p-6">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-[#1f1e1c]">
                Shared Meeting Requirements &amp; Guardrails
              </h2>
              <span className="text-[11px] text-[#8a847b]">
                Identical for all roles
              </span>
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8a847b]">
                Client Objective
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-[#1f1e1c]">
                {meeting.clientObjective}
              </p>
            </div>

            <div className="border-t border-[#ebe6dd] pt-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8a847b]">
                Target Audience
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-[#1f1e1c]">
                {meeting.targetAudience}
              </p>
            </div>

            <div className="border-t border-[#ebe6dd] pt-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8a847b]">
                Client Requirements ({meeting.clientRequirements.length})
              </p>
              <ul className="mt-2 space-y-2">
                {meeting.clientRequirements.map((req, idx) => (
                  <li
                    key={req}
                    className="flex items-start gap-2.5 text-xs leading-relaxed text-[#1f1e1c]"
                  >
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#fdf1ec] text-[10px] font-semibold text-[#b44322]">
                      {idx + 1}
                    </span>
                    <span>{req}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-t border-[#ebe6dd] pt-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8a847b]">
                Constraints &amp; Guardrails ({meeting.constraints.length})
              </p>
              {meeting.constraints.length === 0 ? (
                <p className="mt-1.5 text-xs text-[#5c5852]">
                  No additional constraints recorded.
                </p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {meeting.constraints.map((constraint) => (
                    <li
                      key={constraint}
                      className="flex items-start gap-2.5 text-xs leading-relaxed text-[#1f1e1c]"
                    >
                      <span
                        className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#9a5b13]"
                        aria-hidden="true"
                      />
                      <span>{constraint}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
