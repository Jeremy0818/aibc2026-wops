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
  onReloadContext,
}: {
  phase: SetupPhase;
  meeting: Meeting | null;
  queue: QueuedFile[];
  documents: DocumentMetadata[];
  synthesizedBrief?: string;
  keyFacts: DocumentFact[];
  contextError: WopsApiClientError | null;
  onReloadContext: () => void;
}) {
  /* Before a draft exists: explain what will happen, never preview fake facts. */
  if (!meeting) {
    return (
      <div className="rounded-2xl border border-dashed border-[#ebe6dd] bg-[#faf9f6] p-4">
        <p className="text-sm font-medium text-[#1f1e1c]">
          Extracted facts will appear here after upload
        </p>
        <p className="mt-1 text-xs leading-relaxed text-[#5c5852]">
          WOPS! looks for these in your documents and shows each fact with its
          page or section:
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

  return (
    <div className="space-y-4">
      {/* Outcome summary — honest about partial failure */}
      <div
        role="status"
        aria-live="polite"
        className={`rounded-2xl border p-4 ${
          failedCount > 0
            ? "border-[#f2dcc2] bg-[#fdf6ec]"
            : "border-[#cce5d8] bg-[#edf7f2]"
        }`}
      >
        <p className="text-sm font-medium text-[#1f1e1c]">
          {inProgress
            ? `Draft created · uploading documents (${readyCount + failedCount}/${sent.length})…`
            : sent.length === 0
            ? "Draft created · no documents uploaded yet"
            : failedCount > 0
            ? `Draft created · ${readyCount} of ${sent.length} documents grounded, ${failedCount} failed`
            : `Draft created · all ${sent.length} documents grounded`}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-[#5c5852]">
          {failedCount > 0
            ? "The meeting draft is saved. Retry failed documents above — successful ones are kept."
            : "The meeting stays a draft until you confirm setup. A successful upload doesn't make it ready on its own."}
        </p>
      </div>

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

      {!inProgress && documents.some((d) => d.processingStatus === "ready") ? (
        <p className="rounded-2xl border border-[#ebe6dd] bg-[#faf9f6] p-3.5 text-[11px] leading-relaxed text-[#5c5852]">
          Facts are shown exactly as extracted, with their sources. Grouping
          them into objectives, audience, budget and deliverables, flagging
          missing items, and correcting them need backend support that
          isn&apos;t available yet.
        </p>
      ) : null}

      {!inProgress ? (
        <div className="flex flex-col gap-2 border-t border-[#ebe6dd] pt-4 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            disabled
            title="Requires a finalize endpoint from the backend"
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#ebe6dd] bg-[#faf9f6] px-5 text-sm font-medium text-[#8a847b]"
          >
            Confirm setup · needs backend finalize step
          </button>
          <Link
            href={`/meetings/${encodeURIComponent(meeting.id)}`}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#d95d39] px-5 text-sm font-medium text-white transition hover:bg-[#c34e2c]"
          >
            Open meeting <span aria-hidden="true">→</span>
          </Link>
        </div>
      ) : null}
    </div>
  );
}
