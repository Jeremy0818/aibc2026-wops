"use client";

import Link from "next/link";
import {
  DOCUMENT_DERIVED_FIELD_LABELS,
  type DocumentDerivedField,
} from "@/lib/client/document-first-setup";

/**
 * Shown when the Team Lead's inputs are valid but the shared
 * `CreateMeetingRequestSchema` still requires client-brief fields that, in the
 * document-first model, must come from uploaded documents. We deliberately do
 * NOT ask the Team Lead to type them and do NOT send placeholder values.
 */
export function ContractBlockedNotice({
  blockers,
  selectedFileCount,
  mockMode,
  onDismiss,
}: {
  blockers: DocumentDerivedField[];
  selectedFileCount: number;
  mockMode: boolean;
  onDismiss: () => void;
}) {
  return (
    <section
      role="alert"
      aria-labelledby="contract-blocked-title"
      className="rounded-3xl border border-[#f2dcc2] bg-[#fdf6ec] p-5 sm:p-6"
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9a5b13]">
        Waiting on a backend update
      </p>
      <h2
        id="contract-blocked-title"
        className="mt-1 text-base font-semibold text-[#1f1e1c]"
      >
        Your setup looks good — the meeting can&apos;t be created yet
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-[#5c5852]">
        The current meeting API still expects these client-brief details to be
        typed in before a draft exists. In WOPS! they come from your documents,
        so we&apos;re not asking you to retype them and we won&apos;t send
        made-up values.
      </p>

      <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Fields blocking draft creation">
        {blockers.map((field) => (
          <li
            key={field}
            className="rounded-full border border-[#f2dcc2] bg-white px-2.5 py-0.5 text-[11px] font-medium text-[#9a5b13]"
          >
            {DOCUMENT_DERIVED_FIELD_LABELS[field]}{" "}
            <code className="font-mono text-[10px] text-[#8a847b]">{field}</code>
          </li>
        ))}
      </ul>

      <p className="mt-3 text-xs leading-relaxed text-[#5c5852]">
        Nothing was created or uploaded. Your basics, team
        {selectedFileCount > 0
          ? ` and ${selectedFileCount} selected ${selectedFileCount === 1 ? "document" : "documents"}`
          : ""}{" "}
        are still on this screen. Once the contract allows a minimal draft, this
        same button will create the meeting and upload your documents.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onDismiss}
          className="inline-flex min-h-10 items-center rounded-full border border-[#ebe6dd] bg-white px-4 text-xs font-medium text-[#1f1e1c] transition hover:bg-[#f4f1ea]"
        >
          Keep editing
        </button>
        {mockMode ? (
          <Link
            href="/meetings/mtg_kova_001"
            className="inline-flex min-h-10 items-center rounded-full bg-[#1f1e1c] px-4 text-xs font-medium text-white transition hover:bg-[#3a3835]"
          >
            Explore the seeded KOVA demo meeting →
          </Link>
        ) : null}
      </div>
    </section>
  );
}
