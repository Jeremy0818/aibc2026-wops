"use client";

import Link from "next/link";
import type { Meeting } from "@/contracts/meeting";
import type { DocumentFact, DocumentMetadata } from "@/contracts/document";
import type { WopsApiClientError } from "@/lib/client/meetings-api";
import type { QueuedFile } from "@/lib/client/document-first-setup";
import type { SetupPhase } from "@/hooks/use-document-first-setup";
import { GroundedBriefPreview } from "./grounded-brief-preview";

const EXTRACTION_TARGETS = [
  "Client objectives",
  "Requirements",
  "Target audience",
  "Budget ceiling",
  "Constraints",
  "Deliverables",
];

export function SetupReviewPanel({
  phase,
  meeting,
  queue,
  documents,
  synthesizedBrief,
  keyFacts,
  contextError,
  finalizeError,
  onReloadContext,
  onFinalizeSetup,
}: {
  phase: SetupPhase;
  meeting: Meeting | null;
  queue: QueuedFile[];
  documents: DocumentMetadata[];
  synthesizedBrief?: string;
  keyFacts: DocumentFact[];
  contextError: WopsApiClientError | null;
  finalizeError?: WopsApiClientError | null;
  onReloadContext: () => void;
  onFinalizeSetup?: () => void;
}) {
  /* Before a draft exists: explain what will happen, never preview fake facts. */
  if (!meeting) {
    return (
      <div className="rounded-2xl border border-dashed border-[#ebe6dd] bg-[#faf9f6] p-4">
        <p className="text-sm font-medium text-[#1f1e1c]">
          Extracted facts will appear here after upload
        </p>
        <p className="mt-1 text-xs leading-relaxed text-[#5c5852]">
          WOPS! reads your attached documents and extracts source-backed facts
          categorized by:
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {EXTRACTION_TARGETS.map((label) => (
            <span
              key={label}
              className="rounded-full border border-[#ebe6dd] bg-white px-2.5 py-0.5 text-[11px] font-medium text-[#5c5852]"
            >
              {label}
            </span>
          ))}
        </div>
      </div>
    );
  }

  const sent = queue.filter((q) => q.status !== "rejected");
  const readyCount = sent.filter((q) => q.status === "ready").length;
  const failedCount = sent.filter((q) => q.status === "failed").length;
  const inProgress = phase === "uploading";
  const isFinalizing = phase === "finalizing";
  const isFinalized = phase === "finalized" || meeting.status === "ready";

  return (
    <div className="space-y-4">
      {/* Outcome summary — honest about partial failure */}
      <div
        role="status"
        aria-live="polite"
        className={`rounded-2xl border p-4 ${
          isFinalized
            ? "border-[#cce5d8] bg-[#edf7f2]"
            : failedCount > 0
            ? "border-[#f2dcc2] bg-[#fdf6ec]"
            : "border-[#ebe6dd] bg-[#faf9f6]"
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium text-[#1f1e1c]">
            {isFinalized
              ? "✓ Brief confirmed — ready for teammate preparation!"
              : inProgress
              ? `Draft created · uploading documents (${readyCount + failedCount}/${sent.length})…`
              : sent.length === 0
              ? "Draft created · no documents uploaded yet"
              : failedCount > 0
              ? `Draft created · ${readyCount} of ${sent.length} documents grounded, ${failedCount} failed`
              : `Draft saved · all ${sent.length} documents read and ready for confirmation`}
          </p>
          <span
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
              isFinalized
                ? "bg-[#1f6a47] text-white"
                : "border border-[#ebe6dd] bg-white text-[#5c5852]"
            }`}
          >
            {isFinalized ? "Ready" : "Draft"}
          </span>
        </div>

        <p className="mt-1 text-xs leading-relaxed text-[#5c5852]">
          {isFinalized
            ? "Teammates can now run 1-on-1 AI preparation calls grounded in these facts."
            : failedCount > 0
            ? "The meeting draft is saved. Retry failed documents above — successfully grounded facts are kept."
            : "Review the source-grounded facts below, then click Confirm brief & unlock preparation."}
        </p>
      </div>

      {finalizeError ? (
        <div className="rounded-2xl border border-[#f3c9c0] bg-[#fdf0ed] p-4 text-xs text-[#a5321b]">
          <p className="font-semibold">Setup Finalization Error</p>
          <p className="mt-0.5">{finalizeError.message}</p>
        </div>
      ) : null}

      {contextError ? (
        <div className="rounded-2xl border border-[#f3c9c0] bg-[#fdf0ed] p-4 text-xs text-[#a5321b]">
          <p>Couldn&apos;t load extracted facts: {contextError.message}</p>
          <button
            type="button"
            onClick={onReloadContext}
            className="mt-2 font-medium underline"
          >
            Try again
          </button>
        </div>
      ) : null}

      <GroundedBriefPreview
        documents={documents}
        synthesizedBrief={synthesizedBrief}
        keyFacts={keyFacts}
      />

      {/* Action Bar */}
      {!inProgress ? (
        <div className="flex flex-col gap-3 border-t border-[#ebe6dd] pt-4 sm:flex-row sm:items-center sm:justify-between">
          {!isFinalized ? (
            <button
              type="button"
              onClick={onFinalizeSetup}
              disabled={isFinalizing || documents.filter((d) => d.processingStatus === "ready").length === 0}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#d95d39] px-6 text-sm font-medium text-white shadow-xs transition hover:bg-[#c34e2c] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d95d39]"
            >
              {isFinalizing ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Finalizing meeting setup…</span>
                </>
              ) : (
                <>
                  <span>Confirm brief &amp; unlock preparation</span>
                  <span aria-hidden="true">✓</span>
                </>
              )}
            </button>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/prepare/${encodeURIComponent(meeting.id)}`}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#1f1e1c] px-5 text-sm font-medium text-white transition hover:bg-[#3a3835]"
              >
                <span>Go to teammate preparation</span>
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          )}

          <Link
            href={`/meetings/${encodeURIComponent(meeting.id)}`}
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#ebe6dd] bg-white px-5 text-sm font-medium text-[#1f1e1c] transition hover:bg-[#f4f1ea]"
          >
            Meeting details →
          </Link>
        </div>
      ) : null}
    </div>
  );
}
