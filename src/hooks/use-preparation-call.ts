"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  DecisionEvent,
  PreparationSession,
  SkillStage,
  TranscriptEvent,
} from "@/contracts/session";
import type { Meeting, MeetingParticipant } from "@/contracts/meeting";
import {
  advanceSessionStage,
  appendSessionEvent,
  completeSession,
  createSession,
} from "@/lib/client/sessions-api";
import {
  getScriptedDialogForRole,
} from "@/lib/client/mock-sessions";
import {
  stopMediaStream,
  testMicrophoneHardware,
  type MicPermissionStatus,
} from "@/lib/client/audio-hardware";
import { isMockModeEnabled } from "@/lib/client/mock-meetings";

export type CallLifecycleState =
  | "idle"
  | "incoming"
  | "accepted"
  | "active"
  | "ending"
  | "completed"
  | "declined"
  | "failed";

export type VisualAgentState =
  | "idle"
  | "ringing"
  | "listening"
  | "thinking"
  | "speaking"
  | "muted"
  | "disconnected";

export interface UsePreparationCallProps {
  meeting: Meeting;
  participant: MeetingParticipant | null;
  onCallCompleted?: (session: PreparationSession) => void;
}

export function usePreparationCall({
  meeting,
  participant,
  onCallCompleted,
}: UsePreparationCallProps) {
  // Call lifecycle state
  const [lifecycleState, setLifecycleState] = useState<CallLifecycleState>("idle");
  const [session, setSession] = useState<PreparationSession | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Active call audio / visual state
  const [visualState, setVisualState] = useState<VisualAgentState>("idle");
  const [isMuted, setIsMuted] = useState(false);
  const [callDurationSeconds, setCallDurationSeconds] = useState(0);

  // Scripted conversation progression in Demo Mode
  const scriptedTurns = useMemo(() => {
    const role = participant?.role ?? "Participant";
    return getScriptedDialogForRole(role);
  }, [participant?.role]);

  const [currentTurnIndex, setCurrentTurnIndex] = useState(0);
  const [transcripts, setTranscripts] = useState<TranscriptEvent[]>([]);
  const [decisions, setDecisions] = useState<DecisionEvent[]>([]);
  const [openQuestions, setOpenQuestions] = useState<string[]>([]);

  // Microphone hardware test state (explicitly separated from simulated conversation)
  const [micStatus, setMicStatus] = useState<MicPermissionStatus>("untested");
  const [micErrorMessage, setMicErrorMessage] = useState<string | null>(null);
  const activeMediaStream = useRef<MediaStream | null>(null);

  // Guards against double actions
  const isOperating = useRef(false);
  const isMounted = useRef(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Keep track of mounted state
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (timerRef.current) clearInterval(timerRef.current);
      stopMediaStream(activeMediaStream.current);
    };
  }, []);

  // Duration timer when active
  useEffect(() => {
    if (lifecycleState === "active") {
      timerRef.current = setInterval(() => {
        if (isMounted.current) {
          setCallDurationSeconds((prev) => prev + 1);
        }
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [lifecycleState]);

  /**
   * Triggers an in-app incoming call from WOPS!
   */
  const triggerIncomingCall = useCallback(() => {
    if (isOperating.current) return;
    if (!participant) {
      setError("Cannot start preparation call: No assigned participant selected.");
      return;
    }
    if (!isMockModeEnabled()) {
      setError(
        "Live Gemini Voice API backend is pending implementation (Sprint A3b). Please enable Demo Mode to test this simulated preparation call."
      );
      return;
    }
    setError(null);
    setLifecycleState("incoming");
    setVisualState("ringing");
    setCallDurationSeconds(0);
    setCurrentTurnIndex(0);
    setTranscripts([]);
    setDecisions([]);
    setOpenQuestions([]);
  }, [participant]);

  /**
   * Declines the incoming call.
   */
  const declineCall = useCallback(() => {
    if (isOperating.current) return;
    setLifecycleState("declined");
    setVisualState("idle");
  }, []);

  /**
   * Accepts the incoming call and initializes the session.
   */
  const acceptCall = useCallback(async () => {
    if (isOperating.current || !participant) return;
    isOperating.current = true;
    setError(null);
    setLifecycleState("accepted");
    setVisualState("thinking");

    try {
      const newSession = await createSession({
        meetingId: meeting.id,
        participantId: participant.id ?? `usr_${participant.role.toLowerCase().replace(/\s+/g, "_")}`,
        participantRole: participant.role,
        participantName: participant.name,
      });

      if (!isMounted.current) return;

      setSession(newSession);
      setLifecycleState("active");
      setVisualState("speaking");

      // Post the initial agent prompt
      const firstTurn = scriptedTurns[0];
      if (firstTurn) {
        const agentTranscript: TranscriptEvent = {
          id: `tr_${Date.now()}_agent`,
          sessionId: newSession.id,
          stage: firstTurn.stage,
          speaker: "agent",
          text: firstTurn.agentSpeech,
          isFinal: true,
          timestamp: new Date().toISOString(),
        };

        setTranscripts([agentTranscript]);

        // Background sync event
        void appendSessionEvent(newSession.id, {
          type: "transcript",
          event: {
            stage: firstTurn.stage,
            speaker: "agent",
            text: firstTurn.agentSpeech,
            isFinal: true,
            timestamp: agentTranscript.timestamp,
          },
        });
      }
    } catch (err: unknown) {
      if (isMounted.current) {
        setLifecycleState("failed");
        setVisualState("disconnected");
        setError(err instanceof Error ? err.message : "Failed to initialize call session.");
      }
    } finally {
      isOperating.current = false;
    }
  }, [meeting.id, participant, scriptedTurns]);

  /**
   * Steps through the simulated conversation turn (user speaks, decision is logged, next stage).
   */
  const sendSimulatedResponse = useCallback(
    async (customText?: string) => {
      if (!session || isOperating.current || lifecycleState !== "active") return;
      isOperating.current = true;

      const currentTurn = scriptedTurns[currentTurnIndex];
      if (!currentTurn) {
        isOperating.current = false;
        return;
      }

      setVisualState("listening");

      const userText = customText ?? currentTurn.suggestedUserSpeech;
      const now = new Date().toISOString();

      // 1. Append User Speech
      const userTranscript: TranscriptEvent = {
        id: `tr_${Date.now()}_user`,
        sessionId: session.id,
        stage: currentTurn.stage,
        speaker: "user",
        text: userText,
        isFinal: true,
        timestamp: now,
      };

      setTranscripts((prev) => [...prev, userTranscript]);

      await appendSessionEvent(session.id, {
        type: "transcript",
        event: {
          stage: currentTurn.stage,
          speaker: "user",
          text: userText,
          isFinal: true,
          timestamp: now,
        },
      });

      // 2. Append Decision or Open Question
      if (currentTurn.decisionItem) {
        const decisionEvent: DecisionEvent = {
          id: `dec_${Date.now()}`,
          sessionId: session.id,
          stage: currentTurn.stage,
          topic: currentTurn.decisionItem.topic,
          decision: currentTurn.decisionItem.decision,
          rationale: currentTurn.decisionItem.rationale,
          sourceType: "user_decision",
          sourceReferenceIds: [],
          timestamp: now,
        };
        setDecisions((prev) => [...prev, decisionEvent]);

        await appendSessionEvent(session.id, {
          type: "decision",
          event: {
            stage: currentTurn.stage,
            topic: currentTurn.decisionItem.topic,
            decision: currentTurn.decisionItem.decision,
            rationale: currentTurn.decisionItem.rationale,
            sourceType: "user_decision",
            sourceReferenceIds: [],
            timestamp: now,
          },
        });
      }

      if (currentTurn.openQuestion) {
        setOpenQuestions((prev) => [...prev, currentTurn.openQuestion!]);
        await appendSessionEvent(session.id, {
          type: "open_question",
          question: currentTurn.openQuestion,
        });
      }

      // 3. Move to Next Turn or Prepare Completion
      const nextIndex = currentTurnIndex + 1;
      if (nextIndex < scriptedTurns.length) {
        const nextTurn = scriptedTurns[nextIndex];

        // Advance stage if stage changes
        if (nextTurn.stage !== currentTurn.stage) {
          await advanceSessionStage(session.id, {
            targetStage: nextTurn.stage,
            reason: `Progressed to ${nextTurn.stage} stage discussion`,
          });
        }

        setCurrentTurnIndex(nextIndex);
        setVisualState("thinking");

        // Simulate thinking pause then agent speaking
        setTimeout(() => {
          if (!isMounted.current) return;
          setVisualState("speaking");
          const agentTranscript: TranscriptEvent = {
            id: `tr_${Date.now()}_agent`,
            sessionId: session.id,
            stage: nextTurn.stage,
            speaker: "agent",
            text: nextTurn.agentSpeech,
            isFinal: true,
            timestamp: new Date().toISOString(),
          };
          setTranscripts((prev) => [...prev, agentTranscript]);

          void appendSessionEvent(session.id, {
            type: "transcript",
            event: {
              stage: nextTurn.stage,
              speaker: "agent",
              text: nextTurn.agentSpeech,
              isFinal: true,
              timestamp: agentTranscript.timestamp,
            },
          });
        }, 600);
      } else {
        // Last turn reached, agent concludes
        setVisualState("speaking");
        const closingTranscript: TranscriptEvent = {
          id: `tr_${Date.now()}_agent_close`,
          sessionId: session.id,
          stage: "ALIGN",
          speaker: "agent",
          text: "All 4 ideation stages are complete! Your preparation summary, confirmed decisions, and open questions are ready for review.",
          isFinal: true,
          timestamp: new Date().toISOString(),
        };
        setTranscripts((prev) => [...prev, closingTranscript]);
      }

      isOperating.current = false;
    },
    [session, lifecycleState, currentTurnIndex, scriptedTurns]
  );

  /**
   * Concludes the call and transitions to the summary view.
   */
  const endCall = useCallback(async () => {
    if (!session || isOperating.current) return;
    isOperating.current = true;
    setLifecycleState("ending");
    setVisualState("idle");

    try {
      const completed = await completeSession(session.id, {
        closingNotes: `Completed role preparation as ${session.participantRole}.`,
      });

      if (!isMounted.current) return;

      setSession(completed);
      setLifecycleState("completed");
      if (onCallCompleted) {
        onCallCompleted(completed);
      }
    } catch {
      if (isMounted.current) {
        setLifecycleState("completed");
      }
    } finally {
      stopMediaStream(activeMediaStream.current);
      activeMediaStream.current = null;
      isOperating.current = false;
    }
  }, [session, onCallCompleted]);

  /**
   * Toggles the user's microphone mute state in the visual UI.
   */
  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      setVisualState(next ? "muted" : "listening");
      return next;
    });
  }, []);

  /**
   * Explicitly runs a browser microphone hardware test.
   * Separated from simulated dialogue so users can verify real devices on demand.
   */
  const testMicrophone = useCallback(async () => {
    setMicStatus("checking");
    setMicErrorMessage(null);

    const result = await testMicrophoneHardware();
    if (!isMounted.current) {
      stopMediaStream(result.stream);
      return;
    }

    setMicStatus(result.status);
    if (result.errorMessage) {
      setMicErrorMessage(result.errorMessage);
    }
    if (result.stream) {
      stopMediaStream(activeMediaStream.current);
      activeMediaStream.current = result.stream;
    }
  }, []);

  /**
   * Resets the call state to idle to allow re-testing.
   */
  const resetCall = useCallback(() => {
    stopMediaStream(activeMediaStream.current);
    activeMediaStream.current = null;
    setLifecycleState("idle");
    setVisualState("idle");
    setSession(null);
    setError(null);
    setCallDurationSeconds(0);
    setCurrentTurnIndex(0);
    setTranscripts([]);
    setDecisions([]);
    setOpenQuestions([]);
  }, []);

  const currentStage: SkillStage =
    scriptedTurns[currentTurnIndex]?.stage ?? session?.currentStage ?? "UNDERSTAND";

  return {
    lifecycleState,
    visualState,
    session,
    error,
    isMuted,
    callDurationSeconds,
    currentStage,
    currentTurnIndex,
    totalTurns: scriptedTurns.length,
    currentScriptedTurn: scriptedTurns[currentTurnIndex] ?? null,
    transcripts,
    decisions,
    openQuestions,
    micStatus,
    micErrorMessage,
    triggerIncomingCall,
    acceptCall,
    declineCall,
    endCall,
    toggleMute,
    sendSimulatedResponse,
    testMicrophone,
    resetCall,
  };
}
