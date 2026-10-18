"use client";

import { useCallback, useRef, useState } from "react";
import type { Meeting, FinalizeMeetingRequest } from "@/contracts/meeting";
import type {
  DocumentFact,
  DocumentMetadata,
  UpdateDocumentFactRequest,
} from "@/contracts/document";
import {
  createMeeting,
  finalizeMeeting,
  getMeetingById,
  WopsApiClientError,
} from "@/lib/client/meetings-api";
import {
  getMeetingContext,
  updateDocumentFact,
  uploadMeetingDocument,
} from "@/lib/client/documents-api";
import { isMockModeEnabled } from "@/lib/client/mock-meetings";
import {
  checkDraftAgainstContract,
  classifySelectedFile,
  fileFingerprint,
  type QueuedFile,
  type TeamLeadDraftInput,
} from "@/lib/client/document-first-setup";

export type SetupPhase =
  | "editing" // Team Lead is entering basics, team, and selecting files
  | "creating_draft" // creating minimal meeting draft
  | "draft_failed" // POST /api/meetings failed — nothing uploaded
  | "uploading" // draft exists; files uploading & extracting sequentially
  | "review" // all upload attempts finished; review extracted grounded facts
  | "finalizing" // calling POST /api/meetings/{id}/finalize
  | "finalized"; // meeting marked ready for employee preparation

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
  const [draftError, setDraftError] = useState<WopsApiClientError | null>(null);
  const [finalizeError, setFinalizeError] = useState<WopsApiClientError | null>(
    null
  );
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [contextDocuments, setContextDocuments] = useState<DocumentMetadata[]>(
    []
  );
  const [synthesizedBrief, setSynthesizedBrief] = useState<string | undefined>();
  const [keyFacts, setKeyFacts] = useState<DocumentFact[]>([]);
  const [contextError, setContextError] = useState<WopsApiClientError | null>(
    null
  );

  const inFlightRef = useRef(false);
  const retryingRef = useRef(new Set<string>());

  const isLocked =
    phase === "creating_draft" ||
    phase === "uploading" ||
    phase === "finalizing";
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
      if (hasDraft || isLocked || !isMockModeEnabled()) return;
      const incoming = Array.from(files);
      setQueue((prev) => {
        const seen = new Set(prev.map((item) => item.fingerprint));
        const additions: QueuedFile[] = [];
        for (const file of incoming) {
          const fingerprint = fileFingerprint(file);
          if (seen.has(fingerprint)) continue;
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
          status:
            doc.processingStatus === "pending" ? "processing" : doc.processingStatus,
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
      // In Live Mode before Sprint B3 document context endpoint is implemented,
      // fallback to reading meeting details directly via getMeetingById.
      try {
        const directMeeting = await getMeetingById(meetingId);
        setMeeting(directMeeting);
        setContextDocuments([]);
        setKeyFacts([]);
        setContextError(null);
      } catch {
        setContextError(toClientError(err, "Couldn't load extracted context"));
      }
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
        setPhase("editing");
        return;
      }

      setFieldErrors({});
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

      if (!isMockModeEnabled()) {
        // In Sprint B2 Live Mode:
        // Meeting metadata and assigned participants are successfully persisted to Firestore.
        // Document brief upload, GCS storage, and Gemini extraction arrive in Sprint B3.
        // Complete the creation workflow without attempting upload or /context calls.
        setPhase("review");
        inFlightRef.current = false;
        return;
      }

      setPhase("uploading");
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
      if (!meeting || phase === "uploading" || phase === "finalizing") return;
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

  /* ------------------------------- Finalize ------------------------------ */

  const finalizeSetup = useCallback(
    async (overrides?: FinalizeMeetingRequest) => {
      if (!meeting || phase === "finalizing") return;
      setFinalizeError(null);
      setPhase("finalizing");
      try {
        const finalized = await finalizeMeeting(meeting.id, overrides);
        setMeeting(finalized);
        await refreshContext(finalized.id);
        setPhase("finalized");
      } catch (err) {
        const clientErr = toClientError(err, "Failed to finalize meeting setup");
        setFinalizeError(clientErr);
        setPhase("review");
      }
    },
    [meeting, phase, refreshContext]
  );

  const updateFact = useCallback(
    async (factId: string, patch: UpdateDocumentFactRequest) => {
      if (!meeting) return;
      try {
        await updateDocumentFact(meeting.id, factId, patch);
        await refreshContext(meeting.id);
      } catch (err) {
        setContextError(toClientError(err, "Failed to update fact"));
      }
    },
    [meeting, refreshContext]
  );

  const backToEditing = useCallback(() => {
    if (hasDraft) return;
    setPhase("editing");
    setDraftError(null);
  }, [hasDraft]);

  return {
    phase,
    queue,
    fieldErrors,
    draftError,
    finalizeError,
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
    finalizeSetup,
    updateFact,
    backToEditing,
    refreshContext,
  };
}
