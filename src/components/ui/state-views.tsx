import type { ReactNode } from "react";
import type { MeetingStatus } from "@/contracts/meeting";

const STATUS_STYLES: Record<
  MeetingStatus,
  { label: string; dotClass: string; badgeClass: string }
> = {
  draft: {
    label: "Draft brief",
    dotClass: "bg-[#8a847c]",
    badgeClass: "border-[#e6e1d7] bg-[#f4f1ea] text-[#5c5852]",
  },
  ready: {
    label: "Ready to chat",
    dotClass: "bg-[#d95d39]",
    badgeClass: "border-[#f5d5c8] bg-[#fdf1ec] text-[#b44322]",
  },
  in_session: {
    label: "In conversation",
    dotClass: "bg-emerald-600",
    badgeClass: "border-emerald-200 bg-emerald-50/80 text-emerald-800",
  },
  completed: {
    label: "Prepared",
    dotClass: "bg-teal-600",
    badgeClass: "border-teal-200 bg-teal-50/80 text-teal-800",
  },
};

export function MeetingStatusBadge({ status }: { status: MeetingStatus }) {
  const config = STATUS_STYLES[status] ?? STATUS_STYLES.draft;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${config.badgeClass}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${config.dotClass}`} />
      {config.label}
    </span>
  );
}

export function LoadingState({
  title = "Getting your space ready...",
  description = "Just a moment while we load your meeting briefs.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="wops-warm-card rounded-3xl p-6 sm:p-8"
    >
      <div className="flex items-center gap-3.5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#fdf1ec] text-[#d95d39]">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        </div>
        <div>
          <p className="text-sm font-medium text-[#1f1e1c]">{title}</p>
          <p className="text-xs text-[#5c5852]">{description}</p>
        </div>
      </div>
      <div className="mt-6 space-y-3">
        <div className="h-20 animate-pulse rounded-2xl bg-[#f4f1ea]" />
        <div className="h-20 animate-pulse rounded-2xl bg-[#f4f1ea]" />
      </div>
    </div>
  );
}

export function EmptyState({
  eyebrow = "Quiet right now",
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div className="wops-warm-card flex flex-col items-center justify-center rounded-3xl px-6 py-12 text-center sm:px-10">
      <div
        aria-hidden="true"
        className="wops-assistant-orb mb-4 flex h-11 w-11 items-center justify-center rounded-full text-sm font-semibold text-white shadow-xs"
      >
        ✦
      </div>
      <span className="rounded-full bg-[#f4f1ea] px-3 py-1 text-xs font-medium text-[#5c5852]">
        {eyebrow}
      </span>
      <h3 className="mt-3 max-w-md text-lg font-semibold tracking-tight text-[#1f1e1c] sm:text-xl">
        {title}
      </h3>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-[#5c5852]">
        {description}
      </p>
      {actions ? (
        <div className="mt-6 flex w-full flex-col items-center justify-center gap-2.5 sm:w-auto sm:flex-row">
          {actions}
        </div>
      ) : null}
    </div>
  );
}

export function ErrorState({
  title = "We couldn't reach the server",
  message,
  code,
  onRetry,
  onEnableMockMode,
  showMockToggle = false,
}: {
  title?: string;
  message: string;
  code?: string;
  onRetry?: () => void;
  onEnableMockMode?: () => void;
  showMockToggle?: boolean;
}) {
  return (
    <div
      role="alert"
      className="rounded-3xl border border-[#f2c8be] bg-[#fff8f6] p-6 text-[#1f1e1c]"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex h-2 w-2 rounded-full bg-[#d95d39]" />
            <h3 className="text-sm font-semibold text-[#1f1e1c]">{title}</h3>
            {code ? (
              <span className="rounded-full bg-[#fdf1ec] px-2.5 py-0.5 text-[11px] font-medium text-[#b44322]">
                {code}
              </span>
            ) : null}
          </div>
          <p className="text-sm leading-relaxed text-[#5c5852]">{message}</p>
          <p className="text-xs text-[#8a847c]">
            To keep things transparent, WOPS! doesn&apos;t silently switch to
            demo data when a live connection fails.
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2.5">
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className=" min-h-[40px] rounded-full border border-[#ebe6dd] bg-white px-4 py-2 text-xs font-medium text-[#1f1e1c] transition hover:border-[#dcd4c6] hover:bg-[#faf9f6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d95d39]"
            >
              Try again
            </button>
          ) : null}
          {showMockToggle && onEnableMockMode ? (
            <button
              type="button"
              onClick={onEnableMockMode}
              className="min-h-[40px] rounded-full bg-[#d95d39] px-4 py-2 text-xs font-medium text-white transition hover:bg-[#c34e2c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d95d39]"
            >
              Use KOVA demo data
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
