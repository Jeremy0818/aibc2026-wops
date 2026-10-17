"use client";

import Link from "next/link";
import { useMeetingDetail } from "@/hooks/use-meetings";
import { formatDateTime, formatIdr } from "@/lib/client/formatters";
import {
  getAssignedEmployeesForMeeting,
  getRolePreparationProfile,
} from "@/lib/client/role-preparation";
import {
  ErrorState,
  LoadingState,
  MeetingStatusBadge,
} from "@/components/ui/state-views";
import { DocumentUploadCard } from "./document-upload-card";
import { GroundedBriefPreview } from "./grounded-brief-preview";
import { PreparationCtaCard } from "./preparation-cta-card";

export function MeetingDetailView({ meetingId }: { meetingId: string }) {
  const {
    meeting,
    documents,
    synthesizedBrief,
    keyFacts,
    isLoading,
    error,
    uploadState,
    uploadBriefPdf,
    retryUpload,
    markSetupReady,
    mockMode,
    toggleMockMode,
    refresh,
  } = useMeetingDetail(meetingId);

  if (isLoading) {
    return (
      <LoadingState
        title="Opening meeting setup & details..."
        description="Gathering the shared goals, assigned roles, and grounded PDF context."
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

  const assignedEmployees = getAssignedEmployeesForMeeting(meeting);

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
        <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-[#d95d39]">
          <span>Team Lead · Meeting Setup &amp; Shared Context</span>
          <span aria-hidden="true">·</span>
          <span>
            {meeting.clientName} ({meeting.projectName})
          </span>
        </div>
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
              Brief owner (Team Lead)
            </dt>
            <dd className="mt-0.5 text-xs font-medium text-[#1f1e1c] sm:text-sm">
              {meeting.leadRole}
            </dd>
            <dd className="text-[11px] text-[#8a847c]">
              {assignedEmployees.length} employee{" "}
              {assignedEmployees.length === 1 ? "role" : "roles"} assigned
            </dd>
          </div>
        </dl>
      </header>

      {/* Setup Completion Summary & Employee Handoff */}
      <PreparationCtaCard
        meeting={meeting}
        documents={documents}
        mockMode={mockMode}
        onMarkSetupReady={markSetupReady}
      />

      {/* Team Lead Shared Client PDF Brief Upload (Uploaded ONCE at meeting level) */}
      <DocumentUploadCard
        documents={documents}
        uploadState={uploadState}
        mockMode={mockMode}
        onUploadFile={uploadBriefPdf}
        onRetryUpload={retryUpload}
        onEnableMockMode={() => toggleMockMode(true)}
      />

      {/* Shared Grounded Brief Preview */}
      <GroundedBriefPreview
        documents={documents}
        synthesizedBrief={synthesizedBrief}
        keyFacts={keyFacts}
      />

      {/* Assigned Employees & Role-Specific Preparation Links */}
      <section
        aria-labelledby="assigned-employees-heading"
        className="wops-warm-card rounded-3xl p-5 sm:p-7"
      >
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2
              id="assigned-employees-heading"
              className="text-base font-semibold text-[#1f1e1c] sm:text-lg"
            >
              Assigned employees &amp; preparation roles
            </h2>
            <p className="text-xs text-[#5c5852]">
              Each employee receives the same factual meeting context and PDF
              facts above, with an AI conversation tailored to their role.
            </p>
          </div>
          <Link
            href={`/prepare/${encodeURIComponent(meeting.id)}`}
            className="mt-2 self-start text-xs font-medium text-[#d95d39] hover:underline sm:mt-0 sm:self-auto"
          >
            View in Prepare tab →
          </Link>
        </div>

        <ul className="mt-4 space-y-3">
          {assignedEmployees.map((person, idx) => {
            const roleProfile = getRolePreparationProfile(person.role, meeting);
            return (
              <li
                key={`${person.name}-${person.role}-${idx}`}
                className="flex flex-col justify-between gap-4 rounded-2xl border border-[#ebe6dd] bg-[#faf9f6] p-4 sm:flex-row sm:items-center"
              >
                <div className="min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#fdf1ec] text-xs font-semibold text-[#d95d39]">
                      {person.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </span>
                    <p className="text-sm font-semibold text-[#1f1e1c]">
                      {person.name}
                    </p>
                    <span className="rounded-full border border-[#f5d5c8] bg-white px-2.5 py-0.5 text-xs font-medium text-[#b44322]">
                      {person.role}
                    </span>
                  </div>
                  <p className="text-xs text-[#5c5852]">
                    Focus: {roleProfile.focusPills.slice(0, 4).join(" · ")}
                  </p>
                </div>

                <Link
                  href={`/prepare/${encodeURIComponent(
                    meeting.id
                  )}?role=${encodeURIComponent(person.role)}`}
                  className="inline-flex min-h-[38px] shrink-0 items-center justify-center gap-1.5 self-start rounded-full border border-[#ebe6dd] bg-white px-4 py-1.5 text-xs font-medium text-[#1f1e1c] transition hover:border-[#f5d5c8] hover:bg-[#fdf1ec] hover:text-[#b44322] sm:self-auto"
                >
                  <span>Prepare as {person.role}</span>
                  <span aria-hidden="true">→</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Section: What Matters (Client Objective & Audience) */}
      <section className="wops-warm-card rounded-3xl p-5 sm:p-7">
        <h2 className="text-base font-semibold text-[#1f1e1c]">
          Shared campaign objectives &amp; audience
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
            Client requirements
          </h2>
          <p className="mt-0.5 text-xs text-[#8a847c]">
            Shared deliverables from the client brief
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
            Constraints WOPS! will respect during every employee&apos;s session
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
    </div>
  );
}
