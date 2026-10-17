"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { DocumentFact, DocumentMetadata } from "@/contracts/document";
import type { Meeting } from "@/contracts/meeting";
import {
  getMeetingContext,
  uploadMeetingDocument,
} from "@/lib/client/documents-api";
import {
  getMeetingById,
  listMeetings,
  WopsApiClientError,
} from "@/lib/client/meetings-api";
import {
  isEnvMockModeEnabled,
  isMockModeEnabled,
  mockMarkMeetingSetupReady,
  resetMockMeetingsToKovaDefault,
  setLocalMockModeOverride,
} from "@/lib/client/mock-meetings";

export type ClientUploadPhase =
  | "idle"
  | "uploading"
  | "processing"
  | "ready"
  | "failed";

export interface UploadProgressState {
  phase: ClientUploadPhase;
  fileName?: string;
  fileSize?: number;
  activeDocument?: DocumentMetadata;
  error?: WopsApiClientError | null;
}

function subscribeToMockMode(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  window.addEventListener("wops:mock-mode-changed", onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener("wops:mock-mode-changed", onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

export function useMockMode() {
  const mockMode = useSyncExternalStore(
    subscribeToMockMode,
    () => isMockModeEnabled(),
    () => isEnvMockModeEnabled()
  );

  const toggleMockMode = useCallback((nextValue?: boolean) => {
    const target =
      typeof nextValue === "boolean" ? nextValue : !isMockModeEnabled();
    setLocalMockModeOverride(target);
  }, []);

  const resetMockDemo = useCallback(() => {
    resetMockMeetingsToKovaDefault();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("wops:mock-mode-changed"));
    }
  }, []);

  return {
    mockMode,
    toggleMockMode,
    resetMockDemo,
  };
}

function toWopsClientError(
  err: unknown,
  fallbackMessage: string
): WopsApiClientError {
  if (err instanceof WopsApiClientError) {
    return err;
  }
  return new WopsApiClientError({
    message: err instanceof Error ? err.message : fallbackMessage,
    status: 500,
    code: "INTERNAL_ERROR",
  });
}

export function useMeetingsList() {
  const { mockMode, toggleMockMode, resetMockDemo } = useMockMode();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<WopsApiClientError | null>(null);
  const [reloadTick, setReloadTick] = useState<number>(0);

  useEffect(() => {
    let cancelled = false;

    listMeetings()
      .then((data) => {
        if (cancelled) return;
        setMeetings(data);
        setError(null);
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setMeetings([]);
        setError(toWopsClientError(err, "Failed to load meetings"));
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [mockMode, reloadTick]);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setReloadTick((prev) => prev + 1);
  }, []);

  const handleToggleMockMode = useCallback(
    (nextValue?: boolean) => {
      setIsLoading(true);
      setError(null);
      toggleMockMode(nextValue);
    },
    [toggleMockMode]
  );

  return {
    meetings,
    isLoading,
    error,
    mockMode,
    toggleMockMode: handleToggleMockMode,
    resetMockDemo,
    refresh,
  };
}

export function useMeetingDetail(meetingId: string) {
  const { mockMode, toggleMockMode } = useMockMode();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [documents, setDocuments] = useState<DocumentMetadata[]>([]);
  const [synthesizedBrief, setSynthesizedBrief] = useState<string | undefined>(
    undefined
  );
  const [keyFacts, setKeyFacts] = useState<DocumentFact[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<WopsApiClientError | null>(null);
  const [reloadTick, setReloadTick] = useState<number>(0);

  const [uploadState, setUploadState] = useState<UploadProgressState>({
    phase: "idle",
  });
  const lastFileRef = useRef<{
    file: File;
    simulateOutcome?: "ready" | "failed" | "empty_facts";
  } | null>(null);

  useEffect(() => {
    let cancelled = false;

    Promise.all([getMeetingById(meetingId), getMeetingContext(meetingId)])
      .then(([meetingData, contextData]) => {
        if (cancelled) return;
        setMeeting(contextData.meeting ?? meetingData);
        setDocuments(contextData.documents);
        setSynthesizedBrief(contextData.synthesizedBrief);
        setKeyFacts(contextData.keyFacts);
        setError(null);
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setMeeting(null);
        setDocuments([]);
        setSynthesizedBrief(undefined);
        setKeyFacts([]);
        setError(toWopsClientError(err, "Failed to load meeting details"));
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [meetingId, mockMode, reloadTick]);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setReloadTick((prev) => prev + 1);
  }, []);

  const uploadBriefPdf = useCallback(
    async (
      file: File,
      options?: { simulateOutcome?: "ready" | "failed" | "empty_facts" }
    ) => {
      lastFileRef.current = {
        file,
        simulateOutcome: options?.simulateOutcome,
      };

      setUploadState({
        phase: "uploading",
        fileName: file.name,
        fileSize: file.size,
        error: null,
      });

      try {
        const uploadedDoc = await uploadMeetingDocument(meetingId, file, {
          type: "brief",
          simulateOutcome: options?.simulateOutcome,
          onStatusUpdate: (intermediateDoc) => {
            if (intermediateDoc.processingStatus === "pending") {
              setUploadState({
                phase: "uploading",
                fileName: file.name,
                fileSize: file.size,
                activeDocument: intermediateDoc,
                error: null,
              });
            } else if (intermediateDoc.processingStatus === "processing") {
              setUploadState({
                phase: "processing",
                fileName: file.name,
                fileSize: file.size,
                activeDocument: intermediateDoc,
                error: null,
              });
            }
          },
        });

        // Refresh context after upload completes
        const updatedContext = await getMeetingContext(meetingId);
        setMeeting(updatedContext.meeting);
        setDocuments(updatedContext.documents);
        setSynthesizedBrief(updatedContext.synthesizedBrief);
        setKeyFacts(updatedContext.keyFacts);

        if (uploadedDoc.processingStatus === "failed") {
          setUploadState({
            phase: "failed",
            fileName: file.name,
            fileSize: file.size,
            activeDocument: uploadedDoc,
            error: new WopsApiClientError({
              message:
                uploadedDoc.errorMessage ??
                "We couldn't extract text from this PDF brief.",
              status: 422,
              code: "UNPROCESSABLE_ENTITY",
            }),
          });
        } else if (uploadedDoc.processingStatus === "processing") {
          setUploadState({
            phase: "processing",
            fileName: file.name,
            fileSize: file.size,
            activeDocument: uploadedDoc,
            error: null,
          });
        } else {
          setUploadState({
            phase: "ready",
            fileName: file.name,
            fileSize: file.size,
            activeDocument: uploadedDoc,
            error: null,
          });
        }
      } catch (err) {
        const clientError = toWopsClientError(
          err,
          "We couldn't upload that PDF brief. Please try again."
        );
        setUploadState({
          phase: "failed",
          fileName: file.name,
          fileSize: file.size,
          error: clientError,
        });
      }
    },
    [meetingId]
  );

  const retryUpload = useCallback(async () => {
    const previous = lastFileRef.current;
    if (!previous) return;
    await uploadBriefPdf(previous.file, {
      simulateOutcome:
        previous.simulateOutcome === "failed"
          ? "ready"
          : previous.simulateOutcome,
    });
  }, [uploadBriefPdf]);

  const markSetupReady = useCallback(async () => {
    if (!isMockModeEnabled()) return;
    const updated = await mockMarkMeetingSetupReady(meetingId);
    if (updated) {
      setMeeting(updated);
    }
  }, [meetingId]);

  const clearUploadFeedback = useCallback(() => {
    setUploadState({ phase: "idle" });
  }, []);

  const handleToggleMockMode = useCallback(
    (nextValue?: boolean) => {
      setIsLoading(true);
      setError(null);
      setUploadState({ phase: "idle" });
      toggleMockMode(nextValue);
    },
    [toggleMockMode]
  );

  return {
    meeting,
    documents,
    synthesizedBrief,
    keyFacts,
    isLoading,
    error,
    uploadState,
    uploadBriefPdf,
    retryUpload,
    markSetupReady,
    clearUploadFeedback,
    mockMode,
    toggleMockMode: handleToggleMockMode,
    refresh,
  };
}
