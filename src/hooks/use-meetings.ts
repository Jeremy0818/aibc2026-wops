"use client";

import {
  useCallback,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";
import type { Meeting } from "@/contracts/meeting";
import {
  getMeetingById,
  listMeetings,
  WopsApiClientError,
} from "@/lib/client/meetings-api";
import {
  isEnvMockModeEnabled,
  isMockModeEnabled,
  resetMockMeetingsToKovaDefault,
  setLocalMockModeOverride,
} from "@/lib/client/mock-meetings";

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
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<WopsApiClientError | null>(null);
  const [reloadTick, setReloadTick] = useState<number>(0);

  useEffect(() => {
    let cancelled = false;

    getMeetingById(meetingId)
      .then((data) => {
        if (cancelled) return;
        setMeeting(data);
        setError(null);
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setMeeting(null);
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

  const handleToggleMockMode = useCallback(
    (nextValue?: boolean) => {
      setIsLoading(true);
      setError(null);
      toggleMockMode(nextValue);
    },
    [toggleMockMode]
  );

  return {
    meeting,
    isLoading,
    error,
    mockMode,
    toggleMockMode: handleToggleMockMode,
    refresh,
  };
}
