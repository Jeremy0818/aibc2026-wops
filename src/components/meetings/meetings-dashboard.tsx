"use client";

import Link from "next/link";
import { useMeetingsList } from "@/hooks/use-meetings";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/ui/state-views";
import { MeetingCard } from "./meeting-card";

const WORKFLOW_ROLES = [
  {
    role: "Team Lead",
    summary:
      "Set up the meeting, drop in the client brief once, and assign your teammates.",
    actionLabel: "New meeting →",
    href: "/meetings/new",
  },
  {
    role: "Teammate",
    summary:
      "Spar 1-on-1 with WOPS! from your role's perspective before the team sits down.",
    actionLabel: "Start preparing →",
    href: "/prepare",
  },
] as const;

export function MeetingsDashboard({
  compactHeader = false,
}: {
  compactHeader?: boolean;
}) {
  const {
    meetings,
    isLoading,
    error,
    mockMode,
    toggleMockMode,
    resetMockDemo,
    refresh,
  } = useMeetingsList();

  return (
    <div className="space-y-8">
      {/* Assistant-First Home (/) vs Meetings Directory (/meetings) */}
      {!compactHeader ? (
        <section className="wops-warm-card relative overflow-hidden rounded-3xl px-5 py-7 sm:px-8 sm:py-9">
          <div className="mx-auto flex max-w-xl flex-col items-center text-center">
            <div
              aria-hidden="true"
              className="wops-assistant-orb mb-4 flex h-14 w-14 items-center justify-center rounded-full text-xl text-white shadow-sm"
            >
              ✦
            </div>

            <p className="rounded-full border border-[#f5d5c8] bg-[#fdf1ec] px-3 py-1 text-xs font-medium text-[#b44322]">
              Your voice-first thinking partner
            </p>

            <h1 className="mt-4 text-2xl font-semibold tracking-tight text-[#1f1e1c] sm:text-4xl">
              Ready to think things through?
            </h1>

            <p className="mt-2.5 max-w-md text-sm leading-relaxed text-[#5c5852] sm:text-base">
              Less chit-chat, more meaningful conversation. Team Leads share the
              client brief once; teammates spar with AI to sharpen their own
              thinking before the team meets.
            </p>

            {/* Contextually Accurate Actions: Start Preparing + New Meeting */}
            <div className="mt-6 flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row">
              <Link
                href="/prepare"
                className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-full bg-[#d95d39] px-6 py-3 text-sm font-medium text-white shadow-xs transition hover:bg-[#c34e2c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d95d39] sm:w-auto"
              >
                <span>Start preparing</span>
                <span aria-hidden="true">→</span>
              </Link>

              <Link
                href="/meetings/new"
                className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-full border border-[#ebe6dd] bg-white px-6 py-3 text-sm font-medium text-[#1f1e1c] transition hover:bg-[#f4f1ea] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d95d39] sm:w-auto"
              >
                <span>New meeting</span>
              </Link>
            </div>
          </div>

          {/* Clear Two-Journey Split: Team Lead Setup vs Teammate Preparation */}
          <div className="mt-8 border-t border-[#ebe6dd] pt-5">
            <div className="grid gap-3 sm:grid-cols-2">
              {WORKFLOW_ROLES.map((item) => (
                <Link
                  key={item.role}
                  href={item.href}
                  className="group rounded-2xl border border-[#ebe6dd]/90 bg-[#faf9f6] p-4 transition hover:border-[#f5d5c8] hover:bg-[#fdf1ec]/40"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-[#1f1e1c]">
                      {item.role}
                    </p>
                    <span className="text-xs font-medium text-[#d95d39] transition group-hover:translate-x-0.5">
                      {item.actionLabel}
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-[#5c5852]">
                    {item.summary}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : (
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-medium text-[#d95d39]">
              Team Lead · Meetings
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#1f1e1c] sm:text-3xl">
              Meetings
            </h1>
            <p className="mt-1 text-sm text-[#5c5852]">
              Set up a meeting, drop in the client brief once, and assign your
              teammates.
            </p>
          </div>
          <Link
            href="/meetings/new"
            className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-full bg-[#d95d39] px-5 py-2.5 text-xs font-medium text-white transition hover:bg-[#c34e2c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d95d39]"
          >
            <span>New meeting</span>
          </Link>
        </header>
      )}

      {/* Calm Demo Mode Note */}
      {mockMode ? (
        <div className="flex flex-col justify-between gap-3 rounded-2xl border border-[#ebe6dd] bg-[#f4f1ea]/80 px-4 py-3 text-xs text-[#5c5852] sm:flex-row sm:items-center sm:px-5">
          <div className="flex items-start gap-2.5 sm:items-center">
            <span
              aria-hidden="true"
              className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#d95d39] sm:mt-0"
            />
            <p>
              Exploring with{" "}
              <strong className="font-medium text-[#1f1e1c]">
                KOVA demo data
              </strong>{" "}
              (includes assigned{" "}
              <strong className="font-medium text-[#1f1e1c]">
                Creative Campaign Planner
              </strong>{" "}
              and{" "}
              <strong className="font-medium text-[#1f1e1c]">
                Senior Brand Designer
              </strong>{" "}
              roles).
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              resetMockDemo();
              void refresh();
            }}
            className="self-start rounded-full border border-[#dcd4c6] bg-white px-3 py-1 text-[11px] font-medium text-[#1f1e1c] transition hover:bg-[#faf9f6] sm:self-auto"
          >
            Reset demo
          </button>
        </div>
      ) : null}

      {/* Upcoming Meetings List */}
      <section aria-labelledby="upcoming-meetings-heading" className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2
              id="upcoming-meetings-heading"
              className="text-base font-semibold tracking-tight text-[#1f1e1c] sm:text-lg"
            >
              Scheduled meetings
            </h2>
            <p className="text-xs text-[#5c5852]">
              Open a meeting to review the client brief, adjust facts, or start
              your prep call.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {!compactHeader ? (
              <Link
                href="/meetings/new"
                className="hidden rounded-full border border-[#ebe6dd] bg-white px-3 py-1.5 text-xs font-medium text-[#1f1e1c] transition hover:bg-[#f4f1ea] sm:inline-flex"
              >
                New meeting
              </Link>
            ) : null}
            <button
              type="button"
              onClick={() => void refresh()}
              className="rounded-full border border-[#ebe6dd] bg-white px-3 py-1.5 text-xs font-medium text-[#5c5852] transition hover:border-[#dcd4c6] hover:text-[#1f1e1c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d95d39]"
            >
              Refresh
            </button>
          </div>
        </div>

        {isLoading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState
            title="Couldn't load your meetings"
            message={error.message}
            code={error.code}
            onRetry={() => void refresh()}
            showMockToggle={!mockMode}
            onEnableMockMode={() => toggleMockMode(true)}
          />
        ) : meetings.length === 0 ? (
          <EmptyState
            eyebrow="All clear"
            title="No meetings set up yet"
            description="Create a meeting and upload a client PDF—or switch on the KOVA demo to explore how WOPS! prepares your team."
            actions={
              <>
                <Link
                  href="/meetings/new"
                  className="inline-flex min-h-[42px] w-full items-center justify-center rounded-full bg-[#d95d39] px-5 py-2.5 text-xs font-medium text-white transition hover:bg-[#c34e2c] sm:w-auto"
                >
                  New meeting
                </Link>
                {!mockMode ? (
                  <button
                    type="button"
                    onClick={() => toggleMockMode(true)}
                    className="inline-flex min-h-[42px] w-full items-center justify-center rounded-full border border-[#ebe6dd] bg-white px-5 py-2.5 text-xs font-medium text-[#1f1e1c] transition hover:bg-[#f4f1ea] sm:w-auto"
                  >
                    Try with KOVA demo
                  </button>
                ) : null}
              </>
            }
          />
        ) : (
          <div className="space-y-3.5">
            {meetings.map((meeting) => (
              <MeetingCard
                key={meeting.id}
                meeting={meeting}
                isMockMode={mockMode}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
