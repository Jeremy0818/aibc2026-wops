"use client";

import { useId, useRef, useState, type DragEvent } from "react";
import { formatFileSize } from "@/lib/client/formatters";
import {
  MAX_UPLOAD_SIZE_LABEL,
  PLANNED_UPLOAD_FORMATS,
  SUPPORTED_UPLOAD_FORMATS,
  type QueuedFile,
  type QueuedFileStatus,
} from "@/lib/client/document-first-setup";

const STATUS_COPY: Record<
  QueuedFileStatus,
  { label: string; className: string }
> = {
  queued: {
    label: "Ready to upload",
    className: "border-[#ebe6dd] bg-white text-[#5c5852]",
  },
  rejected: {
    label: "Not supported",
    className: "border-[#f2dcc2] bg-[#fdf6ec] text-[#9a5b13]",
  },
  uploading: {
    label: "Uploading…",
    className: "border-[#f5d5c8] bg-[#fdf1ec] text-[#b44322]",
  },
  processing: {
    label: "Extracting facts…",
    className: "border-[#f5d5c8] bg-[#fdf1ec] text-[#b44322]",
  },
  ready: {
    label: "Grounded",
    className: "border-[#cce5d8] bg-[#edf7f2] text-[#1f6a47]",
  },
  failed: {
    label: "Failed",
    className: "border-[#f3c9c0] bg-[#fdf0ed] text-[#a5321b]",
  },
};

function fileTypeLabel(file: File): string {
  const ext = file.name.split(".").pop();
  return ext && ext !== file.name ? ext.toUpperCase() : file.type || "File";
}

export function ClientDocumentsPicker({
  queue,
  canEditSelection,
  canRetry,
  onAddFiles,
  onRemove,
  onRetry,
  onAddSample,
  isLiveMode = false,
}: {
  queue: QueuedFile[];
  canEditSelection: boolean;
  canRetry: boolean;
  onAddFiles: (files: FileList | File[]) => void;
  onRemove: (localId: string) => void;
  onRetry: (localId: string) => void;
  onAddSample?: () => void;
  isLiveMode?: boolean;
}) {
  const inputId = useId();
  const hintId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    if (!canEditSelection || isLiveMode) return;
    if (event.dataTransfer.files.length > 0) {
      onAddFiles(event.dataTransfer.files);
    }
  };

  const acceptAttr = SUPPORTED_UPLOAD_FORMATS.flatMap((f) => [
    f.mimeType,
    f.extension,
  ]).join(",");

  return (
    <div className="space-y-4">
      {/* Format support — honest about what works today */}
      <div className="flex flex-wrap items-center gap-2 text-[11px]">
        {SUPPORTED_UPLOAD_FORMATS.map((fmt) => (
          <span
            key={fmt.label}
            className="inline-flex items-center gap-1 rounded-full border border-[#cce5d8] bg-[#edf7f2] px-2.5 py-0.5 font-medium text-[#1f6a47]"
          >
            <span aria-hidden="true">✓</span> {fmt.label} · supported now
          </span>
        ))}
        {PLANNED_UPLOAD_FORMATS.map((fmt) => (
          <span
            key={fmt.label}
            className="inline-flex items-center rounded-full border border-[#ebe6dd] bg-[#faf9f6] px-2.5 py-0.5 font-medium text-[#8a847b]"
          >
            {fmt.label} · coming soon
          </span>
        ))}
      </div>

      {isLiveMode ? (
        <div className="rounded-2xl border border-dashed border-[#ebe6dd] bg-[#faf9f6] p-6 text-center">
          <div
            aria-hidden="true"
            className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-white text-base text-[#8a847b] shadow-2xs"
          >
            ✦
          </div>
          <p className="mt-2 text-sm font-medium text-[#1f1e1c]">
            Document upload &amp; Gemini extraction arriving in Sprint B3
          </p>
          <p className="mt-1 text-xs leading-relaxed text-[#5c5852]">
            In Sprint B2 Live Mode, meeting metadata and team assignments are persisted directly to Firestore.
            Switch to Demo Mode to test full PDF brief upload and grounded fact extraction.
          </p>
        </div>
      ) : canEditSelection ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`rounded-2xl border-2 border-dashed px-4 py-7 text-center transition ${
            isDragging
              ? "border-[#d95d39] bg-[#fdf1ec]/60"
              : "border-[#ebe6dd] bg-[#faf9f6]"
          }`}
        >
          <div
            aria-hidden="true"
            className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-white text-lg text-[#d95d39] shadow-xs"
          >
            ↑
          </div>
          <p className="mt-3 text-sm font-medium text-[#1f1e1c]">
            Drop client documents here
          </p>
          <p id={hintId} className="mt-1 text-xs text-[#5c5852]">
            PDF only for now · up to {MAX_UPLOAD_SIZE_LABEL} each · add as many
            as the brief needs
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <label
              htmlFor={inputId}
              className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full bg-[#1f1e1c] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#3a3835] focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#d95d39]"
            >
              Choose files
              <input
                ref={inputRef}
                id={inputId}
                type="file"
                multiple
                accept={acceptAttr}
                aria-describedby={hintId}
                className="sr-only"
                onChange={(e) => {
                  if (e.target.files) onAddFiles(e.target.files);
                  e.target.value = ""; // allow re-selecting after removal
                }}
              />
            </label>
            {onAddSample ? (
              <button
                type="button"
                onClick={onAddSample}
                className="inline-flex min-h-11 items-center rounded-full border border-[#f5d5c8] bg-[#fdf1ec] px-4 py-2.5 text-xs font-medium text-[#b44322] transition hover:bg-[#fae5dc]"
              >
                ✦ Add sample KOVA PDF (demo)
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Local queue */}
      {queue.length > 0 ? (
        <ul className="space-y-2" aria-label="Selected client documents">
          {queue.map((item) => {
            const status = STATUS_COPY[item.status];
            const busy =
              item.status === "uploading" || item.status === "processing";
            return (
              <li
                key={item.localId}
                className="rounded-2xl border border-[#ebe6dd] bg-white px-3.5 py-3"
              >
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-8 min-w-10 shrink-0 items-center justify-center rounded-lg bg-[#faf9f6] px-1.5 text-[10px] font-semibold text-[#5c5852]">
                    {fileTypeLabel(item.file)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[#1f1e1c]">
                      {item.file.name}
                    </p>
                    <p className="text-[11px] text-[#8a847b]">
                      {formatFileSize(item.file.size)}
                      {item.document?.extractedFacts.length
                        ? ` · ${item.document.extractedFacts.length} facts extracted`
                        : ""}
                    </p>
                  </div>
                  <span
                    role="status"
                    aria-live="polite"
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${status.className}`}
                  >
                    {busy ? (
                      <span
                        aria-hidden="true"
                        className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-current border-t-transparent"
                      />
                    ) : null}
                    {status.label}
                  </span>
                </div>

                {item.message ? (
                  <p className="mt-2 text-xs leading-relaxed text-[#9a5b13]">
                    {item.message}
                  </p>
                ) : null}

                {(canEditSelection || (canRetry && item.status === "failed")) && (
                  <div className="mt-2 flex justify-end gap-2">
                    {canRetry && item.status === "failed" ? (
                      <button
                        type="button"
                        onClick={() => onRetry(item.localId)}
                        className="inline-flex min-h-9 items-center rounded-full bg-[#d95d39] px-3.5 text-xs font-medium text-white transition hover:bg-[#c34e2c]"
                      >
                        Retry upload
                      </button>
                    ) : null}
                    {canEditSelection ? (
                      <button
                        type="button"
                        onClick={() => onRemove(item.localId)}
                        aria-label={`Remove ${item.file.name}`}
                        className="inline-flex min-h-9 items-center rounded-full border border-[#ebe6dd] px-3.5 text-xs font-medium text-[#5c5852] transition hover:bg-[#f4f1ea]"
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-xs text-[#8a847b]">
          No documents selected yet. They stay on this screen until the meeting
          draft is created.
        </p>
      )}
    </div>
  );
}
