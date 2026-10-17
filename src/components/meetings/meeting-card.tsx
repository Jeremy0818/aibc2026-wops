import Link from "next/link";
import type { Meeting } from "@/contracts/meeting";
import { formatDateTime, formatIdr } from "@/lib/client/formatters";
import { getAssignedEmployeesForMeeting } from "@/lib/client/role-preparation";
import { MeetingStatusBadge } from "@/components/ui/state-views";

export function MeetingCard({
  meeting,
  isMockMode,
}: {
  meeting: Meeting;
  isMockMode?: boolean;
}) {
  const isKovaDemo = meeting.id === "mtg_kova_001" && isMockMode;
  const isReady = meeting.status === "ready";
  const assignedEmployees = getAssignedEmployeesForMeeting(meeting);

  return (
    <article className="wops-warm-card group relative overflow-hidden rounded-3xl p-5 transition duration-200 hover:border-[#dcd4c6] sm:p-6">
      <span
        aria-hidden="true"
        className={`absolute inset-y-4 left-0 w-1 rounded-r-full transition ${
          isReady
            ? "bg-[#d95d39]"
            : "bg-transparent group-hover:bg-[#ebe6dd]"
        }`}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1 space-y-2">
          {/* Top badges & client */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#5c5852]">
            <MeetingStatusBadge status={meeting.status} />
            <span className="font-medium text-[#1f1e1c]">
              {meeting.clientName}
            </span>
            <span aria-hidden="true" className="text-[#dcd4c6]">
              •
            </span>
            <span className="truncate text-[#5c5852]">
              {meeting.projectName}
            </span>
            {isKovaDemo ? (
              <span className="rounded-full bg-[#f4f1ea] px-2.5 py-0.5 text-[11px] font-medium text-[#5c5852]">
                Demo brief
              </span>
            ) : null}
          </div>

          {/* Title */}
          <h3 className="text-base font-semibold tracking-tight text-[#1f1e1c] transition group-hover:text-[#d95d39] sm:text-lg">
            <Link
              href={`/meetings/${encodeURIComponent(meeting.id)}`}
              className="focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d95d39]"
            >
              <span className="absolute inset-0" aria-hidden="true" />
              {meeting.title}
            </Link>
          </h3>

          {/* Objective preview */}
          <p className="line-clamp-2 text-sm leading-relaxed text-[#5c5852]">
            {meeting.meetingObjective}
          </p>

          {/* Compact metadata row */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-1 text-xs text-[#5c5852]">
            <span>{formatDateTime(meeting.scheduledAt)}</span>
            <span aria-hidden="true" className="text-[#dcd4c6]">
              ·
            </span>
            <span>Up to {formatIdr(meeting.budgetCeilingIdr)}</span>
            <span aria-hidden="true" className="text-[#dcd4c6]">
              ·
            </span>
            <span>
              {assignedEmployees.length}{" "}
              {assignedEmployees.length === 1 ? "role" : "roles"} assigned
            </span>
            {meeting.documentIds.length > 0 ? (
              <>
                <span aria-hidden="true" className="text-[#dcd4c6]">
                  ·
                </span>
                <span className="font-medium text-[#1f1e1c]">
                  {meeting.documentIds.length} shared PDF
                  {meeting.documentIds.length === 1 ? "" : "s"}
                </span>
              </>
            ) : null}
          </div>
        </div>

        {/* Right action pill */}
        <div className="flex shrink-0 items-center justify-between border-t border-[#ebe6dd] pt-3 sm:border-t-0 sm:pt-0">
          <span className="text-xs text-[#8a847c] sm:hidden">
            Lead: {meeting.leadRole}
          </span>
          <span className="inline-flex min-h-[38px] items-center gap-1.5 rounded-full border border-[#ebe6dd] bg-[#faf9f6] px-4 py-1.5 text-xs font-medium text-[#1f1e1c] transition group-hover:border-[#f5d5c8] group-hover:bg-[#fdf1ec] group-hover:text-[#b44322]">
            <span>Meeting details</span>
            <span
              aria-hidden="true"
              className="transition group-hover:translate-x-0.5"
            >
              →
            </span>
          </span>
        </div>
      </div>
    </article>
  );
}
