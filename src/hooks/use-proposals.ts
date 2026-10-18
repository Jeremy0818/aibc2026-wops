"use client";

import { useCallback, useEffect, useState } from "react";
import type { PreparationProposal } from "@/contracts/proposal";
import type { Meeting } from "@/contracts/meeting";
import { getProposal, listProposals } from "@/lib/client/proposals-api";
import { getMeetingById } from "@/lib/client/meetings-api";
import { useMockMode } from "./use-meetings";

export interface ProposalWithMeeting {
  proposal: PreparationProposal;
  meeting?: Meeting;
}

/**
 * Hook to manage an employee's personal preparation library.
 * Filters strictly to the provided participantId to preserve employee privacy.
 */
export function useProposalsList(participantId?: string) {
  const { mockMode } = useMockMode();
  const [proposals, setProposals] = useState<PreparationProposal[]>([]);
  const [meetingMap, setMeetingMap] = useState<Record<string, Meeting>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        const items = await listProposals(
          participantId ? { participantId } : undefined
        );
        if (cancelled) return;

        // Load associated meetings
        const distinctMeetingIds = Array.from(
          new Set(items.map((p) => p.meetingId))
        );
        const loadedMeetings: Record<string, Meeting> = {};

        await Promise.all(
          distinctMeetingIds.map(async (mId) => {
            try {
              const meeting = await getMeetingById(mId);
              loadedMeetings[mId] = meeting;
            } catch {
              // Meeting might have been removed or unavailable
            }
          })
        );

        if (cancelled) return;
        setProposals(items);
        setMeetingMap(loadedMeetings);
        setError(null);
        setIsLoading(false);
      } catch (err: unknown) {
        if (cancelled) return;
        setProposals([]);
        setMeetingMap({});
        setError(
          err instanceof Error
            ? err
            : new Error("Failed to load preparation proposals.")
        );
        setIsLoading(false);
      }
    }

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [participantId, mockMode, reloadTick]);

  const refresh = useCallback(() => {
    setIsLoading(true);
    setReloadTick((prev) => prev + 1);
  }, []);

  return {
    proposals,
    meetingMap,
    isLoading,
    error,
    mockMode,
    refresh,
  };
}

/**
 * Hook to fetch and display an individual preparation proposal with its grounded meeting.
 */
export function useProposalDetail(proposalId: string) {
  const { mockMode } = useMockMode();
  const [proposal, setProposal] = useState<PreparationProposal | null>(null);
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadDetail() {
      if (!proposalId) return;
      try {
        const prop = await getProposal(proposalId);
        if (cancelled) return;

        let mtg: Meeting | null = null;
        if (prop.meetingId) {
          try {
            mtg = await getMeetingById(prop.meetingId);
          } catch {
            // Meeting fetch fallback
          }
        }

        if (cancelled) return;
        setProposal(prop);
        setMeeting(mtg);
        setError(null);
        setIsLoading(false);
      } catch (err: unknown) {
        if (cancelled) return;
        setProposal(null);
        setMeeting(null);
        setError(
          err instanceof Error
            ? err
            : new Error(`Failed to load preparation proposal "${proposalId}".`)
        );
        setIsLoading(false);
      }
    }

    void loadDetail();

    return () => {
      cancelled = true;
    };
  }, [proposalId, mockMode, reloadTick]);

  const refresh = useCallback(() => {
    setIsLoading(true);
    setReloadTick((prev) => prev + 1);
  }, []);

  return {
    proposal,
    meeting,
    isLoading,
    error,
    mockMode,
    refresh,
  };
}
