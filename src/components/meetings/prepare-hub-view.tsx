"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMeetingsList } from "@/hooks/use-meetings";
import { PageHeader } from "@/components/layout/page-header";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  MeetingStatusBadge,
} from "@/components/ui/state-views";
import { formatDateTime, formatIdr } from "@/lib/client/formatters";
import {
  getAssignedEmployeesForMeeting,
  getRolePreparationProfile,
} from "@/lib/client/role-preparation";
import type { Meeting } from "@/contracts/meeting";

interface EmployeeAssignmentCardEntry {
  meeting: Meeting;
  participantName: string;
  roleTitle: string;
}

export function PrepareHubView() {
  const {
    meetings,
    isLoading,
    error,
    mockMode,
    toggleMockMode,
    resetMockDemo,
    refresh,
  } = useMeetingsList();
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>("ALL");

  // Collect all distinct employee roles across meetings for the Demo Role Switcher
  const availableRoles = useMemo(() => {
    const roleMap = new Map<string, { role: string; sampleName: string }>();
    for (const meeting of meetings) {
      const employees = getAssignedEmployeesForMeeting(meeting);
      for (const emp of employees) {
        const key = emp.role.trim();
        if (!roleMap.has(key)) {
          roleMap.set(key, { role: key, sampleName: emp.name });
        }
      }
    }
    return Array.from(roleMap.values());
  }, [meetings]);

  // Flatten meetings into employee assignment cards filtered by the Demo Role Switcher
  const assignmentCards = useMemo<EmployeeAssignmentCardEntry[]>(() => {
    const entries: EmployeeAssignmentCardEntry[] = [];
    for (const meeting of meetings) {
      const employees = getAssignedEmployeesForMeeting(meeting);
      for (const emp of employees) {
        if (
          selectedRoleFilter === "ALL" ||
          emp.role.trim().toLowerCase() ===
            selectedRoleFilter.trim().toLowerCase()
        ) {
          entries.push({
            meeting,
            participantName: emp.name,
            roleTitle: emp.role,
          });
        }
      }
    }
    return entries;
  }, [meetings, selectedRoleFilter]);

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Employee Preparation"
        title="Your Assigned Preparations"
        description="Review the shared client brief uploaded by your Team Lead and run a 1-on-1 voice session tailored to your role before the team meets."
        actions={
          <Link
            href="/meetings"
            className="inline-flex min-h-10 items-center justify-center rounded-full border border-[#ebe6dd] bg-white px-4 py-2 text-xs font-medium text-[#1f1e1c] transition hover:bg-[#f4f1ea]"
          >
            Team Lead Setup View →
          </Link>
        }
      />

      {/* Demo Perspective Switcher (explicitly labelled Demo Mode) */}
      {meetings.length > 0 && availableRoles.length > 0 && mockMode && (
        <section
          aria-label="Demo employee perspective selector"
          className="wops-warm-card rounded-3xl p-4 sm:p-5"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full border border-[#f5d5c8] bg-[#fdf1ec] px-2.5 py-0.5 text-[11px] font-medium text-[#b44322]">
                  Demo Employee Switcher
                </span>
                <span className="rounded-full bg-[#f4f1ea] px-2 py-0.5 text-[10px] font-semibold text-[#5c5852]">
                  Demo Mode Only
                </span>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-[#5c5852]">
                Switch between assigned team members to see how WOPS! keeps the
                shared client PDF brief identical while adapting AI preparation
                focus to each role.
              </p>
            </div>
          </div>

          <div
            role="group"
            aria-label="Filter preparations by employee role"
            className="mt-3.5 flex flex-wrap gap-2"
          >
            <button
              type="button"
              onClick={() => setSelectedRoleFilter("ALL")}
              aria-pressed={selectedRoleFilter === "ALL"}
              className={`min-h-10 rounded-full px-3.5 py-2 text-xs font-medium transition ${
                selectedRoleFilter === "ALL"
                  ? "bg-[#1f1e1c] text-white shadow-xs"
                  : "border border-[#ebe6dd] bg-[#faf9f6] text-[#5c5852] hover:border-[#dcd5c9] hover:text-[#1f1e1c]"
              }`}
            >
              All Assigned Roles (
              {meetings.reduce(
                (acc, m) => acc + getAssignedEmployeesForMeeting(m).length,
                0
              )}
              )
            </button>

            {availableRoles.map(({ role, sampleName }) => {
              const isSelected =
                selectedRoleFilter.toLowerCase() === role.toLowerCase();
              return (
                <button
                  key={role}
                  type="button"
                  onClick={() => setSelectedRoleFilter(role)}
                  aria-pressed={isSelected}
                  className={`min-h-10 rounded-full px-3.5 py-2 text-xs font-medium transition ${
                    isSelected
                      ? "bg-[#d95d39] text-white shadow-xs"
                      : "border border-[#ebe6dd] bg-white text-[#1f1e1c] hover:border-[#f5d5c8] hover:bg-[#fdf1ec]/50"
                  }`}
                >
                  {sampleName !== role ? `${sampleName} · ${role}` : role}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Live API Mode Authentication Disclaimer */}
      {!mockMode && (
        <section
          aria-label="Live API authentication status"
          className="rounded-3xl border border-[#ebe6dd] bg-[#faf9f6] p-4 text-xs text-[#5c5852]"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-[#1f1e1c]">
              Live API Mode · Identity &amp; Assignment Status
            </span>
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-semibold text-amber-800">
              Auth Pending (Developer B)
            </span>
          </div>
          <p className="mt-1 leading-relaxed">
            Backend user authentication (JWT/Session) is not yet implemented by Developer B. In production, only meetings assigned to your authenticated user identity will appear. Currently displaying meetings available in this environment.
          </p>
        </section>
      )}

      {isLoading ? (
        <LoadingState
          title="Loading your assigned preparations..."
          description="Gathering shared meeting briefs and role-specific focus areas."
        />
      ) : error ? (
        <ErrorState
          title="Couldn't load your assigned preparations"
          message={error.message}
          code={error.code}
          onRetry={() => void refresh()}
          showMockToggle={!mockMode}
          onEnableMockMode={() => toggleMockMode(true)}
        />
      ) : meetings.length === 0 ? (
        <EmptyState
          title="No assigned meetings yet"
          description="Once your Team Lead sets up a meeting and attaches the shared client brief, your role-specific preparation will appear here."
          actions={
            <div className="flex flex-wrap items-center justify-center gap-3">
              {mockMode && (
                <button
                  type="button"
                  onClick={resetMockDemo}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#d95d39] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#c34e2c]"
                >
                  Load KOVA Demo Brief
                </button>
              )}
              <Link
                href="/meetings/new"
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#ebe6dd] bg-white px-5 py-2.5 text-sm font-medium text-[#1f1e1c] transition hover:bg-[#f4f1ea]"
              >
                Set Up a Meeting (Team Lead)
              </Link>
            </div>
          }
        />
      ) : (
        <div className="space-y-4">
          {assignmentCards.map(({ meeting, participantName, roleTitle }) => {
            const profile = getRolePreparationProfile(roleTitle, meeting);
            const hasSharedBrief = meeting.documentIds.length > 0;
            const roleHref = `/prepare/${meeting.id}?role=${encodeURIComponent(roleTitle)}`;

            return (
              <article
                key={`${meeting.id}-${roleTitle}-${participantName}`}
                className="wops-warm-card rounded-3xl p-5 transition duration-150 hover:border-[#dcd5c9] sm:p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center rounded-full border border-[#f5d5c8] bg-[#fdf1ec] px-2.5 py-0.5 text-xs font-semibold text-[#b44322]">
                        Assigned Role: {roleTitle}
                      </span>
                      {participantName && participantName !== roleTitle && (
                        <span className="text-xs font-medium text-[#5c5852]">
                          ({participantName})
                        </span>
                      )}
                    </div>
                    <h2 className="pt-1 text-lg font-semibold tracking-tight text-[#1f1e1c] sm:text-xl">
                      {meeting.title}
                    </h2>
                    <p className="text-xs text-[#5c5852]">
                      Client:{" "}
                      <span className="font-medium text-[#1f1e1c]">
                        {meeting.clientName} ({meeting.projectName})
                      </span>{" "}
                      · Setup by {meeting.leadRole}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                        hasSharedBrief
                          ? "border border-[#cce5d8] bg-[#edf7f2] text-[#1f6a47]"
                          : "border border-[#f2dcc2] bg-[#fdf6ec] text-[#9a5b13]"
                      }`}
                    >
                      <span
                        className="h-1.5 w-1.5 rounded-full bg-current"
                        aria-hidden="true"
                      />
                      {hasSharedBrief
                        ? `${meeting.documentIds.length} Shared PDF ${meeting.documentIds.length === 1 ? "Brief" : "Briefs"} Ready`
                        : "Awaiting Team Lead PDF Brief"}
                    </span>
                    <MeetingStatusBadge status={meeting.status} />
                  </div>
                </div>

                {/* Role-specific AI Preparation summary */}
                <div className="mt-4 rounded-2xl border border-[#ebe6dd] bg-[#faf9f6] p-3.5 sm:p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8a847b]">
                    Your Role-Specific AI Focus
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-[#1f1e1c]">
                    {profile.summary}
                  </p>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {profile.focusPills.map((pill) => (
                      <span
                        key={pill}
                        className="rounded-full border border-[#ebe6dd] bg-white px-2.5 py-0.5 text-[11px] font-medium text-[#5c5852]"
                      >
                        {pill}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Shared factual context footer + CTA */}
                <div className="mt-4 flex flex-col gap-3 border-t border-[#ebe6dd] pt-3.5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#5c5852]">
                    <span>
                      Scheduled: {formatDateTime(meeting.scheduledAt)}
                    </span>
                    <span>
                      Shared Budget Ceiling:{" "}
                      <strong className="font-medium text-[#1f1e1c]">
                        {formatIdr(meeting.budgetCeilingIdr)}
                      </strong>
                    </span>
                  </div>

                  <Link
                    href={roleHref}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-[#d95d39] px-4 py-2 text-xs font-medium text-white shadow-xs transition hover:bg-[#c34e2c]"
                  >
                    <span>Review Brief &amp; Prepare as {roleTitle}</span>
                    <span aria-hidden="true">→</span>
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
