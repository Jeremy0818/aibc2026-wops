"use client";

import Link from "next/link";
import type { DocumentMetadata } from "@/contracts/document";
import type { Meeting } from "@/contracts/meeting";
import { getAssignedEmployeesForMeeting } from "@/lib/client/role-preparation";

export function PreparationCtaCard({
  meeting,
  documents,
  mockMode,
  isLeadPersona = true,
  onMarkSetupReady,
}: {
  meeting: Meeting;
  documents: DocumentMetadata[];
  mockMode?: boolean;
  isLeadPersona?: boolean;
  onMarkSetupReady?: () => Promise<void>;
}) {
  const readyDocsCount = documents.filter(
    (doc) => doc.processingStatus === "ready"
  ).length;
  const assignedEmployees = getAssignedEmployeesForMeeting(meeting);
  const isReadyForPrep =
    meeting.status === "ready" ||
    meeting.status === "in_session" ||
    readyDocsCount > 0;

  const setupChecks = [
    {
      label: "Objectives, audience & IDR budget ceiling configured",
      done: true,
    },
    {
      label: `${assignedEmployees.length} employee ${
        assignedEmployees.length === 1 ? "role" : "roles"
      } assigned (${assignedEmployees.map((p) => p.role).join(", ")})`,
      done: assignedEmployees.length > 0,
    },
    {
      label:
        readyDocsCount > 0
          ? `Shared client PDF brief attached once (${readyDocsCount} ready)`
          : "Attach shared client PDF brief below (uploaded once by Team Lead)",
      done: readyDocsCount > 0,
    },
  ];

  return (
    <section
      aria-labelledby="wops-setup-completion-heading"
      className="relative overflow-hidden rounded-3xl border border-[#f5d5c8] bg-[#fdf1ec]/85 p-5 sm:p-7"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3.5">
          <div
            aria-hidden="true"
            className="wops-assistant-orb mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white shadow-xs"
          >
            ✦
          </div>
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h2
                id="wops-setup-completion-heading"
                className="text-base font-semibold text-[#1f1e1c] sm:text-lg"
              >
                {isReadyForPrep
                  ? "Brief ready — teammates can prepare"
                  : isLeadPersona
                  ? "Meeting draft — review facts & confirm"
                  : "Meeting draft — waiting for Team Lead confirmation"}
              </h2>
              <span className="rounded-full bg-white/90 px-2.5 py-0.5 text-[11px] font-medium text-[#b44322]">
                {isReadyForPrep ? "Ready" : "Draft"}
              </span>
            </div>
            <p className="text-sm leading-relaxed text-[#5c5852]">
              {isReadyForPrep
                ? "The shared brief and client PDF facts are confirmed. Teammates can now prepare from their own role's perspective without re-reading the full document."
                : isLeadPersona
                ? "Client documents are shared once for the whole meeting. Check the extracted facts below, then confirm setup so teammates can prepare."
                : "Your Team Lead is configuring the shared brief. Once confirmed, you can start your 1-on-1 voice preparation call."}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {isLeadPersona && !isReadyForPrep && mockMode && onMarkSetupReady ? (
            <button
              type="button"
              onClick={() => void onMarkSetupReady()}
              className="inline-flex min-h-[42px] items-center justify-center rounded-full border border-[#f5d5c8] bg-white px-4 py-2 text-xs font-medium text-[#b44322] transition hover:bg-[#faf9f6]"
            >
              Finish setup (Demo)
            </button>
          ) : null}

          <Link
            href={`/prepare/${encodeURIComponent(meeting.id)}`}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-[#d95d39] px-5 py-2.5 text-xs font-medium text-white shadow-xs transition hover:bg-[#c34e2c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d95d39]"
          >
            <span>{isLeadPersona ? "Open teammate preparation" : "Go to preparation"}</span>
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>

      {/* Setup Completion Checklist */}
      <ul className="mt-5 grid gap-2.5 sm:grid-cols-3">
        {setupChecks.map((check, idx) => (
          <li
            key={idx}
            className="flex items-start gap-2.5 rounded-2xl border border-[#f5d5c8]/80 bg-white/90 p-3 text-xs"
          >
            <span
              aria-hidden="true"
              className={`mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                check.done
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-[#fdf1ec] text-[#d95d39]"
              }`}
            >
              {check.done ? "✓" : idx + 1}
            </span>
            <span className="leading-snug text-[#1f1e1c]">{check.label}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
