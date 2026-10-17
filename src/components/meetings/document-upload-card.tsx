"use client";

import {
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type KeyboardEvent,
} from "react";
import type {
  DocumentMetadata,
  DocumentProcessingStatus,
} from "@/contracts/document";
import type { UploadProgressState } from "@/hooks/use-meetings";
import { validatePdfFile } from "@/lib/client/documents-api";
import { formatFileSize, formatShortDate } from "@/lib/client/formatters";

const DOC_STATUS_STYLES: Record<
  DocumentProcessingStatus,
  { label: string; dotClass: string; badgeClass: string }
> = {
  pending: {
    label: "Uploading",
    dotClass: "bg-[#d95d39] animate-pulse",
    badgeClass: "border-[#f5d5c8] bg-[#fdf1ec] text-[#b44322]",
  },
  processing: {
    label: "Processing",
    dotClass: "bg-[#d95d39] animate-ping",
    badgeClass: "border-[#f5d5c8] bg-[#fdf1ec] text-[#b44322]",
  },
  ready: {
    label: "Ready",
    dotClass: "bg-emerald-600",
    badgeClass: "border-emerald-200 bg-emerald-50 text-emerald-800",
  },
  failed: {
    label: "Failed",
    dotClass: "bg-[#d95d39]",
    badgeClass: "border-[#f2c8be] bg-[#fff8f6] text-[#b44322]",
  },
};

export function DocumentStatusBadge({
  status,
}: {
  status: DocumentProcessingStatus;
}) {
  const style = DOC_STATUS_STYLES[status] ?? DOC_STATUS_STYLES.pending;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${style.badgeClass}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${style.dotClass}`} />
      <span>{style.label}</span>
    </span>
  );
}

export function DocumentUploadCard({
  documents,
  uploadState,
  mockMode,
  onUploadFile,
  onRetryUpload,
  onEnableMockMode,
}: {
  documents: DocumentMetadata[];
  uploadState: UploadProgressState;
  mockMode: boolean;
  onUploadFile: (
    file: File,
    options?: { simulateOutcome?: "ready" | "failed" | "empty_facts" }
  ) => Promise<void>;
  onRetryUpload: () => Promise<void>;
  onEnableMockMode?: () => void;
}) {
  const fileInputId = useId();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const isBusy =
    uploadState.phase === "uploading" || uploadState.phase === "processing";

  const handleSelectedFile = async (
    file: File | undefined,
    options?: { simulateOutcome?: "ready" | "failed" | "empty_facts" }
  ) => {
    if (!file || isBusy) return;
    setValidationError(null);

    const validation = validatePdfFile(file);
    if (!validation.valid) {
      setValidationError(validation.message);
      return;
    }

    await onUploadFile(file, options);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    void handleSelectedFile(file);
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!isBusy) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    if (isBusy) return;
    const droppedFile = event.dataTransfer.files?.[0];
    void handleSelectedFile(droppedFile);
  };

  const handleDropzoneKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (isBusy) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      fileInputRef.current?.click();
    }
  };

  const triggerSampleKovaPdf = (
    outcome: "ready" | "failed" = "ready"
  ) => {
    if (isBusy) return;
    const sampleContent = new Uint8Array([
      0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34,
    ]);
    const fileName =
      outcome === "failed"
        ? "KOVA-Corrupt-Scan-Fail.pdf"
        : "KOVA-Brand-Brief-2026.pdf";
    const sampleFile = new File([sampleContent], fileName, {
      type: "application/pdf",
    });
    Object.defineProperty(sampleFile, "size", {
      value: 418290,
      writable: false,
    });
    void handleSelectedFile(sampleFile, { simulateOutcome: outcome });
  };

  return (
    <section
      aria-labelledby="client-brief-documents-heading"
      className="wops-warm-card rounded-3xl p-5 sm:p-7"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2
              id="client-brief-documents-heading"
              className="text-base font-semibold text-[#1f1e1c] sm:text-lg"
            >
              Client brief documents
            </h2>
            <span className="rounded-full bg-[#f4f1ea] px-2.5 py-0.5 text-[11px] font-medium text-[#5c5852]">
              {documents.length === 0
                ? "Empty"
                : `${documents.length} PDF${documents.length === 1 ? "" : "s"}`}
            </span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-[#5c5852]">
            Upload your client PDF brief (up to 10 MB) so WOPS! can ground ideas
            in real facts from the document.
          </p>
        </div>

        {mockMode ? (
          <button
            type="button"
            disabled={isBusy}
            onClick={() => triggerSampleKovaPdf("ready")}
            className="inline-flex min-h-[36px] shrink-0 items-center justify-center gap-1.5 self-start rounded-full border border-[#f5d5c8] bg-[#fdf1ec] px-3.5 py-1.5 text-xs font-medium text-[#b44322] transition hover:bg-[#fae5dc] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d95d39]"
          >
            <span aria-hidden="true">✦</span>
            <span>Attach sample KOVA PDF</span>
          </button>
        ) : null}
      </div>

      {/* Accessible Dropzone + Native File Picker */}
      <div
        role="button"
        tabIndex={isBusy ? -1 : 0}
        aria-disabled={isBusy}
        aria-describedby={`${fileInputId}-hint`}
        onClick={() => {
          if (!isBusy) fileInputRef.current?.click();
        }}
        onKeyDown={handleDropzoneKeyDown}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`mt-4 flex flex-col items-center justify-center rounded-2xl border border-dashed px-4 py-6 text-center transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d95d39] ${
          isBusy
            ? "cursor-wait border-[#ebe6dd] bg-[#faf9f6] opacity-80"
            : isDragging
            ? "border-[#d95d39] bg-[#fdf1ec]/70"
            : "cursor-pointer border-[#dcd4c6] bg-[#faf9f6] hover:border-[#d95d39]/60 hover:bg-[#fdf1ec]/30"
        }`}
      >
        <input
          ref={fileInputRef}
          id={fileInputId}
          type="file"
          accept="application/pdf,.pdf"
          disabled={isBusy}
          onChange={handleInputChange}
          className="sr-only"
        />

        <div
          aria-hidden="true"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-sm text-[#d95d39] shadow-2xs"
        >
          {isBusy ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#d95d39] border-t-transparent" />
          ) : (
            "📄"
          )}
        </div>

        <p className="mt-2.5 text-sm font-medium text-[#1f1e1c]">
          {uploadState.phase === "uploading"
            ? `Uploading ${uploadState.fileName ?? "PDF brief"}...`
            : uploadState.phase === "processing"
            ? `Processing ${uploadState.fileName ?? "PDF brief"}...`
            : "Choose a PDF brief or drag it here"}
        </p>

        <p id={`${fileInputId}-hint`} className="mt-1 text-xs text-[#8a847c]">
          {uploadState.phase === "uploading"
            ? `${formatFileSize(uploadState.fileSize)} · Sending document to WOPS!`
            : uploadState.phase === "processing"
            ? "Reading pages and extracting key facts..."
            : "PDF only (.pdf) · Up to 10 MB"}
        </p>

        {!isBusy ? (
          <span className="mt-3 inline-flex min-h-[36px] items-center rounded-full border border-[#ebe6dd] bg-white px-4 py-1.5 text-xs font-medium text-[#1f1e1c] shadow-2xs">
            Browse PDF file
          </span>
        ) : null}
      </div>

      {/* Client-side Validation Error */}
      {validationError ? (
        <div
          role="alert"
          className="mt-3 flex items-start justify-between gap-3 rounded-2xl border border-[#f2c8be] bg-[#fff8f6] px-4 py-3 text-xs text-[#b44322]"
        >
          <span>{validationError}</span>
          <button
            type="button"
            onClick={() => setValidationError(null)}
            aria-label="Dismiss validation error"
            className="shrink-0 font-semibold hover:underline"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      {/* Upload / Processing Failure State with Retry */}
      {uploadState.phase === "failed" && uploadState.error ? (
        <div
          role="alert"
          className="mt-4 rounded-2xl border border-[#f2c8be] bg-[#fff8f6] p-4"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <DocumentStatusBadge status="failed" />
                {uploadState.fileName ? (
                  <span className="text-xs font-medium text-[#1f1e1c]">
                    {uploadState.fileName}
                  </span>
                ) : null}
                {typeof uploadState.fileSize === "number" ? (
                  <span className="text-xs text-[#8a847c]">
                    ({formatFileSize(uploadState.fileSize)})
                  </span>
                ) : null}
              </div>
              <p className="text-xs leading-relaxed text-[#5c5852]">
                {uploadState.error.message}
              </p>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void onRetryUpload()}
                className="min-h-[36px] rounded-full border border-[#ebe6dd] bg-white px-3.5 py-1.5 text-xs font-medium text-[#1f1e1c] transition hover:bg-[#faf9f6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d95d39]"
              >
                Try again
              </button>
              {!mockMode && onEnableMockMode ? (
                <button
                  type="button"
                  onClick={onEnableMockMode}
                  className="min-h-[36px] rounded-full bg-[#d95d39] px-3.5 py-1.5 text-xs font-medium text-white transition hover:bg-[#c34e2c]"
                >
                  Use Demo mode
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {/* Uploaded Documents List */}
      <div className="mt-5 space-y-2.5">
        {documents.length === 0 && !isBusy ? (
          <div className="rounded-2xl bg-[#faf9f6] px-4 py-3.5 text-xs text-[#5c5852]">
            No client PDF brief uploaded yet. Attach a PDF above so WOPS! can
            reference verified brief facts during your preparation call.
          </div>
        ) : (
          documents.map((doc) => (
            <div
              key={doc.id}
              className="flex flex-col justify-between gap-3 rounded-2xl border border-[#ebe6dd] bg-[#faf9f6] p-4 sm:flex-row sm:items-center"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span aria-hidden="true" className="text-sm">
                    📄
                  </span>
                  <p className="truncate text-sm font-medium text-[#1f1e1c]">
                    {doc.name}
                  </p>
                  <DocumentStatusBadge status={doc.processingStatus} />
                </div>

                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-[#5c5852]">
                  <span>{formatFileSize(doc.sizeBytes)}</span>
                  <span aria-hidden="true" className="text-[#dcd4c6]">
                    ·
                  </span>
                  <span>Uploaded {formatShortDate(doc.uploadedAt)}</span>
                  {doc.processingStatus === "ready" ? (
                    <>
                      <span aria-hidden="true" className="text-[#dcd4c6]">
                        ·
                      </span>
                      <span className="font-medium text-[#1f1e1c]">
                        {doc.extractedFacts.length} extracted{" "}
                        {doc.extractedFacts.length === 1 ? "fact" : "facts"}
                      </span>
                    </>
                  ) : null}
                </div>

                {doc.processingStatus === "failed" && doc.errorMessage ? (
                  <p className="text-xs text-[#b44322]">{doc.errorMessage}</p>
                ) : null}
              </div>

              {doc.processingStatus === "failed" ? (
                <button
                  type="button"
                  onClick={() => void onRetryUpload()}
                  className="self-start rounded-full border border-[#ebe6dd] bg-white px-3.5 py-1.5 text-xs font-medium text-[#1f1e1c] transition hover:bg-[#f4f1ea] sm:self-auto"
                >
                  Retry upload
                </button>
              ) : null}
            </div>
          ))
        )}
      </div>
    </section>
  );
}
