"use client";

import { useCallback, useRef, useState } from "react";
import type { Meeting } from "@/contracts/meeting";
import type { DocumentFact, DocumentMetadata } from "@/contracts/document";
import { createMeeting, WopsApiClientError } from "@/lib/client/meetings-api";
import {
  getMeetingContext,
  uploadMeetingDocument,
} from "@/lib/client/documents-api";
import {
  checkDraftAgainstContract,
  classifySelectedFile,
  fileFingerprint,
  type DocumentDerivedField,
  type QueuedFile,
  type TeamLeadDraftInput,
} from "@/lib/client/document-first-setup";

export type SetupPhase =
  | "editing" // Team Lead is filling basics, team, and selecting files
  | "blocked_by_contract" // shared contract still requires document-derived fields
  | "creating_draft"
  | "draft_failed" // POST /api/meetings failed — nothing uploaded
  | "uploading" // draft exists; files are being uploaded sequentially
  | "review"; // all attempts finished (some may have failed)

function toClientError(err: unknown, fallback: string): WopsApiClientError {
  if (err instanceof WopsApiClientError) return err;
  return new WopsApiClientError({
    message: err instanceof Error ? err.message : fallback,
    status: 500,
    code: "INTERNAL_ERROR",
  });
}

let localIdCounter = 0;
function nextLocalId(): string {
  localIdCounter += 1;
  return `local_file_${Date.now().toString(36)}_${localIdCounter}`;
}

export function useDocumentFirstSetup() {
  const [phase, setPhase] = useState<SetupPhase>("editing");
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [contractBlockers, setContractBlockers] = useState<
    DocumentDerivedField[]
  >([]);
  const [draftError, setDraftError] = useState<WopsApiClientError | null>(null);
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [contextDocuments, setContextDocuments] = useState<DocumentMetadata[]>(
    []
  );
  const [synthesizedBrief, setSynthesizedBrief] = useState<string | undefined>();
  const [keyFacts, setKeyFacts] = useState<DocumentFact[]>([]);
  const [contextError, setContextError] = useState<WopsApiClientError | null>(
    null
  );

  // Guards against double submission and concurrent retries of the same file.
  const inFlightRef = useRef(false);
  const retryingRef = useRef(new Set<string>());

  const isLocked = phase === "creating_draft" || phase === "uploading";
  const hasDraft = meeting !== null;

  const patchFile = useCallback(
    (localId: string, patch: Partial<QueuedFile>) => {
      setQueue((prev) =>
        prev.map((item) =>
          item.localId === localId ? { ...item, ...patch } : item
        )
      );
    },
    []
  );

  /* ------------------------------ Selection ------------------------------ */

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      if (hasDraft || isLocked) return;
      const incoming = Array.from(files);
      setQueue((prev) => {
        const seen = new Set(prev.map((item) => item.fingerprint));
        const additions: QueuedFile[] = [];
        for (const file of incoming) {
          const fingerprint = fileFingerprint(file);
          if (seen.has(fingerprint)) continue; // prevent duplicate selection
          seen.add(fingerprint);
          const check = classifySelectedFile(file);
          additions.push({
            localId: nextLocalId(),
            fingerprint,
            file,
            status: check.accepted ? "queued" : "rejected",
            message: check.accepted ? undefined : check.message,
          });
        }
        return [...prev, ...additions];
      });
    },
    [hasDraft, isLocked]
  );

  const removeFile = useCallback(
    (localId: string) => {
      if (hasDraft || isLocked) return;
      setQueue((prev) => prev.filter((item) => item.localId !== localId));
    },
    [hasDraft, isLocked]
  );

  /* ------------------------------- Upload -------------------------------- */

  const uploadOne = useCallback(
    async (meetingId: string, item: QueuedFile): Promise<boolean> => {
      patchFile(item.localId, { status: "uploading", message: undefined });
      try {
        const doc = await uploadMeetingDocument(meetingId, item.file, {
          type: "brief",
          onStatusUpdate: (update) => {
            patchFile(item.localId, {
              status:
                update.processingStatus === "pending"
                  ? "uploading"
                  : update.processingStatus,
              document: update,
            });
          },
        });
        const ok = doc.processingStatus !== "failed";
        patchFile(item.localId, {
          status: doc.processingStatus === "pending" ? "processing" : doc.processingStatus,
          document: doc,
          message: ok ? undefined : doc.errorMessage,
        });
        return ok;
      } catch (err) {
        patchFile(item.localId, {
          status: "failed",
          message: toClientError(err, "Upload failed").message,
        });
        return false;
      }
    },
    [patchFile]
  );

  const refreshContext = useCallback(async (meetingId: string) => {
    try {
      const ctx = await getMeetingContext(meetingId);
      setMeeting(ctx.meeting);
      setContextDocuments(ctx.documents);
      setSynthesizedBrief(ctx.synthesizedBrief);
      setKeyFacts(ctx.keyFacts);
      setContextError(null);
    } catch (err) {
      setContextError(toClientError(err, "Couldn't load extracted context"));
    }
  }, []);

  /* ------------------------------- Submit -------------------------------- */

  const submit = useCallback(
    async (input: TeamLeadDraftInput) => {
      if (inFlightRef.current || hasDraft) return;

      setDraftError(null);
      const check = checkDraftAgainstContract(input);

      if (!check.ok) {
        setFieldErrors(check.fieldErrors);
        const teamLeadFieldsValid = Object.keys(check.fieldErrors).length === 0;
        if (teamLeadFieldsValid && check.contractBlockers.length > 0) {
          setContractBlockers(check.contractBlockers);
          setPhase("blocked_by_contract");
        } else {
          setPhase("editing");
        }
        return;
      }

      setFieldErrors({});
      setContractBlockers([]);
      inFlightRef.current = true;
      setPhase("creating_draft");

      let created: Meeting;
      try {
        created = await createMeeting(check.request);
        setMeeting(created);
      } catch (err) {
        const clientErr = toClientError(err, "Failed to create meeting draft");
        setDraftError(clientErr);
        if (clientErr.details) {
          const apiErrors: Record<string, string> = {};
          for (const d of clientErr.details) {
            if (d.field) apiErrors[d.field] = d.message;
          }
          setFieldErrors(apiErrors);
        }
        setPhase("draft_failed");
        inFlightRef.current = false;
        return;
      }

      setPhase("uploading");
      // Sequential uploads keep ordering predictable and avoid overloading
      // the extraction pipeline. Rejected files are never sent.
      const toUpload = queue.filter((item) => item.status === "queued");
      for (const item of toUpload) {
        await uploadOne(created.id, item);
      }

      await refreshContext(created.id);
      setPhase("review");
      inFlightRef.current = false;
    },
    [hasDraft, queue, uploadOne, refreshContext]
  );

  const retryFile = useCallback(
    async (localId: string) => {
      if (!meeting || phase === "uploading") return;
      if (retryingRef.current.has(localId)) return;
      const item = queue.find((q) => q.localId === localId);
      if (!item || item.status !== "failed") return;

      retryingRef.current.add(localId);
      try {
        await uploadOne(meeting.id, item);
        await refreshContext(meeting.id);
      } finally {
        retryingRef.current.delete(localId);
      }
    },
    [meeting, phase, queue, uploadOne, refreshContext]
  );

  const backToEditing = useCallback(() => {
    if (hasDraft) return;
    setPhase("editing");
    setContractBlockers([]);
    setDraftError(null);
  }, [hasDraft]);

  return {
    phase,
    queue,
    fieldErrors,
    contractBlockers,
    draftError,
    meeting,
    contextDocuments,
    synthesizedBrief,
    keyFacts,
    contextError,
    isLocked,
    hasDraft,
    addFiles,
    removeFile,
    submit,
    retryFile,
    backToEditing,
    refreshContext,
  };
}
