"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GoogleGenAI, Modality, EndSensitivity } from "@google/genai";
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
import { getScriptedDialogForRole } from "@/lib/client/mock-sessions";
import {
  stopMediaStream,
  testMicrophoneHardware,
  type MicPermissionStatus,
} from "@/lib/client/audio-hardware";
import { isMockModeEnabled } from "@/lib/client/mock-meetings";
import { LiveAudioPlayer, LiveMicRecorder } from "@/lib/client/live-spike-audio";
import { buildLiveSystemInstruction } from "@/lib/client/live-prompts";

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

export interface LiveCallDiagnostics {
  micSendIntervalMs: number;
  timeSinceSpeechEndMs: number | null;
  firstAudioReceivedMs: number | null;
  firstAudioPlayedMs: number | null;
  playbackQueueDurationMs: number;
  interruptionCount: number;
  reconnectCount: number;
  connectionStatus:
    | "idle"
    | "connecting"
    | "connected"
    | "interrupted"
    | "disconnected"
    | "failed";
}

export interface UsePreparationCallProps {
  meeting: Meeting;
  participant: MeetingParticipant | null;
  onCallCompleted?: (session: PreparationSession) => void;
  approvedFacts?: { category: string; statement: string }[];
}

export function usePreparationCall({
  meeting,
  participant,
  onCallCompleted,
  approvedFacts = [],
}: UsePreparationCallProps) {
  const isLiveMode = !isMockModeEnabled();

  // Call lifecycle state
  const [lifecycleState, setLifecycleState] = useState<CallLifecycleState>("idle");
  const [session, setSession] = useState<PreparationSession | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Active call audio / visual state
  const [visualState, setVisualState] = useState<VisualAgentState>("idle");
  const [isMuted, setIsMuted] = useState(false);
  const [callDurationSeconds, setCallDurationSeconds] = useState(0);

  // Audio level meters
  const [userAudioLevel, setUserAudioLevel] = useState(0);
  const [geminiAudioLevel, setGeminiAudioLevel] = useState(0);

  // Diagnostics state (Priority 5)
  const [diagnostics, setDiagnostics] = useState<LiveCallDiagnostics>({
    micSendIntervalMs: 0,
    timeSinceSpeechEndMs: null,
    firstAudioReceivedMs: null,
    firstAudioPlayedMs: null,
    playbackQueueDurationMs: 0,
    interruptionCount: 0,
    reconnectCount: 0,
    connectionStatus: "idle",
  });
  const lastSpeechEndTimeRef = useRef<number | null>(null);
  const reconnectCountRef = useRef(0);
  const interruptionCountRef = useRef(0);
  const currentLiveTurnGenRef = useRef(0);

  // Live stage tracking
  const [currentLiveStage, setCurrentLiveStage] = useState<SkillStage>("UNDERSTAND");
  const currentLiveStageRef = useRef<SkillStage>("UNDERSTAND");
  useEffect(() => {
    currentLiveStageRef.current = currentLiveStage;
  }, [currentLiveStage]);

  // Scripted conversation progression in Demo Mode
  const scriptedTurns = useMemo(() => {
    const role = participant?.role ?? "Participant";
    return getScriptedDialogForRole(role);
  }, [participant?.role]);

  const [currentTurnIndex, setCurrentTurnIndex] = useState(0);
  const [transcripts, setTranscripts] = useState<TranscriptEvent[]>([]);
  const [decisions, setDecisions] = useState<DecisionEvent[]>([]);
  const [openQuestions, setOpenQuestions] = useState<string[]>([]);

  // Microphone hardware test state
  const [micStatus, setMicStatus] = useState<MicPermissionStatus>("untested");
  const [micErrorMessage, setMicErrorMessage] = useState<string | null>(null);
  const activeMediaStream = useRef<MediaStream | null>(null);

  // Live audio transport refs
  const audioPlayerRef = useRef<LiveAudioPlayer | null>(null);
  const recorderRef = useRef<LiveMicRecorder | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const liveSessionRef = useRef<any>(null);
  const isLiveConnectedRef = useRef(false);
  const isMutedRef = useRef(false);
  const liveTurnCounterRef = useRef(0);
  const connectionAttemptIdRef = useRef(0);
  const hasSentKickoffRef = useRef(false);

  // Synchronization and lifecycle guards
  const isOperating = useRef(false);
  const isMounted = useRef(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const diagnosticsTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  // Cleanup on unmount or termination
  const cleanUpLiveResources = useCallback(() => {
    connectionAttemptIdRef.current += 1;
    isLiveConnectedRef.current = false;
    if (recorderRef.current) {
      recorderRef.current.stop();
      recorderRef.current = null;
    }
    if (audioPlayerRef.current) {
      audioPlayerRef.current.close();
      audioPlayerRef.current = null;
    }
    if (liveSessionRef.current) {
      try {
        liveSessionRef.current.close();
      } catch {}
      liveSessionRef.current = null;
    }
    stopMediaStream(activeMediaStream.current);
    activeMediaStream.current = null;

    setDiagnostics((prev) => ({
      ...prev,
      connectionStatus: "disconnected",
      playbackQueueDurationMs: 0,
    }));
  }, []);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (timerRef.current) clearInterval(timerRef.current);
      if (diagnosticsTimerRef.current) clearInterval(diagnosticsTimerRef.current);
      cleanUpLiveResources();
    };
  }, [cleanUpLiveResources]);

  // Duration timer when active
  useEffect(() => {
    if (lifecycleState === "active") {
      timerRef.current = setInterval(() => {
        if (isMounted.current) {
          setCallDurationSeconds((prev) => prev + 1);
        }
      }, 1000);

      // Low-frequency diagnostics refresh interval (250ms) to monitor queue backlog and speech delta
      diagnosticsTimerRef.current = setInterval(() => {
        if (!isMounted.current) return;
        const queueDuration = audioPlayerRef.current?.getQueueDurationMs() ?? 0;
        const now = performance.now();
        const speechDelta =
          lastSpeechEndTimeRef.current !== null
            ? Math.round(now - lastSpeechEndTimeRef.current)
            : null;

        setDiagnostics((prev) => ({
          ...prev,
          playbackQueueDurationMs: queueDuration,
          timeSinceSpeechEndMs: speechDelta,
        }));
      }, 250);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (diagnosticsTimerRef.current) {
        clearInterval(diagnosticsTimerRef.current);
        diagnosticsTimerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (diagnosticsTimerRef.current) clearInterval(diagnosticsTimerRef.current);
    };
  }, [lifecycleState]);

  /**
   * Triggers an incoming call invitation.
   */
  const triggerIncomingCall = useCallback(() => {
    if (lifecycleState !== "idle") return;
    setLifecycleState("incoming");
    setVisualState("ringing");
    setError(null);
  }, [lifecycleState]);

  /**
   * Declines the incoming call.
   */
  const declineCall = useCallback(() => {
    connectionAttemptIdRef.current += 1;
    cleanUpLiveResources();
    setLifecycleState("declined");
    setVisualState("idle");
    isOperating.current = false;
  }, [cleanUpLiveResources]);

  /**
   * Accepts the call:
   * - In Live Mode: connects to real Gemini Live API WebSocket via ephemeral token.
   * - In Demo Mode: creates a simulated session in mock API store.
   */
  const acceptCall = useCallback(async () => {
    if (!participant || isOperating.current) return;
    isOperating.current = true;

    const currentAttemptId = ++connectionAttemptIdRef.current;
    if (currentAttemptId > 1) {
      reconnectCountRef.current += 1;
    }
    hasSentKickoffRef.current = false;
    setError(null);
    setLifecycleState("accepted");
    setVisualState("thinking");
    setDiagnostics((prev) => ({
      ...prev,
      connectionStatus: "connecting",
      reconnectCount: reconnectCountRef.current,
    }));

    // ==========================================
    // 1. LIVE MODE: REAL GEMINI LIVE CONNECTION
    // ==========================================
    if (isLiveMode) {
      try {
        // Step 1: Mint ephemeral token from isolated dev endpoint
        const tokenRes = await fetch("/api/dev/live-token", {
          method: "POST",
        });

        if (!tokenRes.ok) {
          const errData = await tokenRes.json().catch(() => ({}));
          throw new Error(
            errData.details ||
              errData.error ||
              `HTTP ${tokenRes.status}: Failed to obtain Gemini Live token`
          );
        }

        const { token } = await tokenRes.json();
        if (!token) throw new Error("No ephemeral token returned from server");

        if (!isMounted.current || connectionAttemptIdRef.current !== currentAttemptId) return;

        // Step 2: Initialize Audio Player (24kHz playback with turn & connection tracking)
        audioPlayerRef.current = new LiveAudioPlayer({
          onLevelChange: (level) => {
            if (!isMounted.current || connectionAttemptIdRef.current !== currentAttemptId) return;
            setGeminiAudioLevel(level);
            if (level > 0.04 && !isMutedRef.current) {
              setVisualState("speaking");
            }
          },
          onPlaybackEnd: () => {
            if (!isMounted.current || connectionAttemptIdRef.current !== currentAttemptId) return;
            setGeminiAudioLevel(0);
            // Switch visual state to listening only when audio has truly finished playing
            setVisualState(isMutedRef.current ? "muted" : "listening");
          },
          onFirstBufferPlayed: () => {
            if (lastSpeechEndTimeRef.current !== null) {
              const latency = Math.round(performance.now() - lastSpeechEndTimeRef.current);
              setDiagnostics((prev) => ({
                ...prev,
                firstAudioPlayedMs: latency,
              }));
            }
          },
        });
        audioPlayerRef.current.setConnectionGeneration(currentAttemptId);

        // Step 3: Initialize Mic Recorder (16kHz PCM downsampler, 2048 buffer, silent loopback)
        recorderRef.current = new LiveMicRecorder({
          onAudioChunk: (base64Chunk) => {
            if (
              isLiveConnectedRef.current &&
              liveSessionRef.current &&
              connectionAttemptIdRef.current === currentAttemptId
            ) {
              try {
                liveSessionRef.current.sendRealtimeInput({
                  media: {
                    mimeType: "audio/pcm;rate=16000",
                    data: base64Chunk,
                  },
                });
              } catch (sendErr) {
                console.error("[Live Voice] sendRealtimeInput error:", sendErr);
              }
            }
          },
          onLevelChange: (level) => {
            if (isMounted.current && connectionAttemptIdRef.current === currentAttemptId) {
              setUserAudioLevel(level);
            }
          },
          onChunkSent: (intervalMs) => {
            setDiagnostics((prev) => ({
              ...prev,
              micSendIntervalMs: intervalMs,
            }));
          },
          onSpeechEnd: () => {
            lastSpeechEndTimeRef.current = performance.now();
          },
        });

        // Step 4: Request browser microphone
        try {
          await recorderRef.current.start();
          setMicStatus("granted");
        } catch (micErr) {
          setMicStatus("denied");
          throw new Error(
            `Microphone access denied or unavailable: ${
              micErr instanceof Error ? micErr.message : String(micErr)
            }`
          );
        }

        if (!isMounted.current || connectionAttemptIdRef.current !== currentAttemptId) return;

        // Step 5: Build role-aware system prompt
        const systemPrompt = buildLiveSystemInstruction({
          meeting,
          participant,
          approvedFacts,
        });

        // Step 6: Connect WebSocket via @google/genai with automatic VAD
        const client = new GoogleGenAI({
          apiKey: token,
          apiVersion: "v1alpha",
        });

        const liveSession = await client.live.connect({
          model: "models/gemini-2.5-flash-native-audio-latest",
          config: {
            responseModalities: [Modality.AUDIO],
            systemInstruction: {
              parts: [{ text: systemPrompt }],
            },
            // Automatic activity detection configured for responsive, natural turns
            realtimeInputConfig: {
              automaticActivityDetection: {
                disabled: false,
                endOfSpeechSensitivity: EndSensitivity.END_SENSITIVITY_HIGH,
                silenceDurationMs: 800,
              },
            },
          },
          callbacks: {
            onopen: () => {
              if (!isMounted.current || connectionAttemptIdRef.current !== currentAttemptId) return;
              isLiveConnectedRef.current = true;
              setDiagnostics((prev) => ({
                ...prev,
                connectionStatus: "connected",
              }));
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onmessage: (msg: any) => {
              if (!isMounted.current || connectionAttemptIdRef.current !== currentAttemptId) return;

              // 1. Setup Complete
              if (msg?.setupComplete) {
                setDiagnostics((prev) => ({
                  ...prev,
                  connectionStatus: "connected",
                }));
                return;
              }

              const serverContent = msg?.serverContent;
              if (!serverContent) return;

              // 2. Interruption / Barge-in: user spoke while Gemini was speaking
              if (serverContent.interrupted) {
                audioPlayerRef.current?.interrupt();
                currentLiveTurnGenRef.current += 1;
                interruptionCountRef.current += 1;
                lastSpeechEndTimeRef.current = null;

                setGeminiAudioLevel(0);
                setVisualState(isMutedRef.current ? "muted" : "listening");
                setDiagnostics((prev) => ({
                  ...prev,
                  interruptionCount: interruptionCountRef.current,
                  connectionStatus: "interrupted",
                  firstAudioReceivedMs: null,
                  firstAudioPlayedMs: null,
                }));
                // CRITICAL: Do NOT process any modelTurn parts that may accompany an interrupted message
                return;
              }

              // 3. Model Turn: streaming audio & text delivery
              if (serverContent.modelTurn?.parts) {
                for (const part of serverContent.modelTurn.parts) {
                  if (part.inlineData?.mimeType?.startsWith("audio/pcm")) {
                    if (lastSpeechEndTimeRef.current !== null) {
                      const latency = Math.round(performance.now() - lastSpeechEndTimeRef.current);
                      setDiagnostics((prev) => ({
                        ...prev,
                        firstAudioReceivedMs: latency,
                        connectionStatus: "connected",
                      }));
                    }

                    setVisualState("speaking");
                    audioPlayerRef.current?.beginNewTurn(currentLiveTurnGenRef.current);
                    audioPlayerRef.current?.playPcmChunk(
                      part.inlineData.data,
                      currentAttemptId,
                      currentLiveTurnGenRef.current
                    );
                  }
                  if (part.text) {
                    setTranscripts((prev) => [
                      ...prev,
                      {
                        id: `tr_${Date.now()}_agent`,
                        sessionId: "live_session",
                        stage: currentLiveStageRef.current,
                        speaker: "agent",
                        text: part.text,
                        isFinal: true,
                        timestamp: new Date().toISOString(),
                      },
                    ]);
                  }
                }
              }

              // 4. Generation Complete: model finished sending tokens, browser playback is in progress
              // Note: generationComplete does NOT mean playback has ended.

              // 5. Turn Complete & Stage Pacing
              if (serverContent.turnComplete) {
                liveTurnCounterRef.current += 1;
                if (liveTurnCounterRef.current === 2) {
                  setCurrentLiveStage("EXPLORE");
                } else if (liveTurnCounterRef.current === 4) {
                  setCurrentLiveStage("EVALUATE");
                } else if (liveTurnCounterRef.current >= 6) {
                  setCurrentLiveStage("ALIGN");
                }

                // If audio finished playing before turnComplete arrived, switch to listening now.
                // Otherwise, let audioPlayer's onPlaybackEnd switch when speakers finish.
                if (!audioPlayerRef.current?.isPlaying()) {
                  setVisualState(isMutedRef.current ? "muted" : "listening");
                  setGeminiAudioLevel(0);
                }
              }
            },
            onerror: (err: unknown) => {
              const errStr = err instanceof Error ? err.message : JSON.stringify(err);
              console.error("[Live Voice] Session error:", errStr);
              if (isMounted.current && connectionAttemptIdRef.current === currentAttemptId) {
                setError(`Gemini Live connection error: ${errStr}`);
                setLifecycleState("failed");
                setVisualState("disconnected");
                setDiagnostics((prev) => ({
                  ...prev,
                  connectionStatus: "failed",
                }));
                cleanUpLiveResources();
              }
            },
            onclose: () => {
              if (connectionAttemptIdRef.current === currentAttemptId) {
                isLiveConnectedRef.current = false;
                setDiagnostics((prev) => ({
                  ...prev,
                  connectionStatus: "disconnected",
                }));
              }
            },
          },
        });

        // Verify attempt is still valid and not cancelled while awaiting connection
        if (!isMounted.current || connectionAttemptIdRef.current !== currentAttemptId) {
          try {
            liveSession.close();
          } catch {}
          return;
        }

        // Store liveSession in ref and transition state to active
        liveSessionRef.current = liveSession;
        isLiveConnectedRef.current = true;
        setLifecycleState("active");
        setVisualState("listening");
        setDiagnostics((prev) => ({
          ...prev,
          connectionStatus: "connected",
        }));

        // Send initial kickoff greeting exactly once so Gemini proactively speaks first
        if (!hasSentKickoffRef.current) {
          hasSentKickoffRef.current = true;
          try {
            liveSession.sendClientContent({
              turns: [
                {
                  role: "user",
                  parts: [
                    {
                      text: `Hi WOPS!, I am ${participant.name}, preparing as ${participant.role} for "${meeting.title}". Let's begin our prep call.`,
                    },
                  ],
                },
              ],
              turnComplete: true,
            });
          } catch (kickoffErr) {
            console.warn("[Live Voice] Kickoff send warning:", kickoffErr);
            if (isMounted.current && connectionAttemptIdRef.current === currentAttemptId) {
              setError(
                `Live call connected, but failed to send kickoff greeting: ${
                  kickoffErr instanceof Error ? kickoffErr.message : String(kickoffErr)
                }`
              );
            }
          }
        }
      } catch (err: unknown) {
        if (isMounted.current && connectionAttemptIdRef.current === currentAttemptId) {
          cleanUpLiveResources();
          setLifecycleState("failed");
          setVisualState("disconnected");
          setError(
            err instanceof Error ? err.message : "Failed to establish real Gemini Live connection."
          );
        }
      } finally {
        if (connectionAttemptIdRef.current === currentAttemptId) {
          isOperating.current = false;
        }
      }
      return;
    }

    // ==========================================
    // 2. DEMO MODE: SIMULATED ROLE CONVERSATION
    // ==========================================
    try {
      const newSession = await createSession({
        meetingId: meeting.id,
        participantId:
          participant.id ?? `usr_${participant.role.toLowerCase().replace(/\s+/g, "_")}`,
        participantRole: participant.role,
        participantName: participant.name,
      });

      if (!isMounted.current) return;

      setSession(newSession);
      setLifecycleState("active");
      setVisualState("speaking");

      // Post initial agent prompt
      const firstTurn = scriptedTurns[0];
      if (firstTurn) {
        const agentTranscript: TranscriptEvent = {
          id: `tr_${Date.now()}_agent_init`,
          sessionId: newSession.id,
          stage: firstTurn.stage,
          speaker: "agent",
          text: firstTurn.agentSpeech,
          isFinal: true,
          timestamp: new Date().toISOString(),
        };

        setTranscripts([agentTranscript]);

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
        setError(
          err instanceof Error ? err.message : "Failed to start preparation session"
        );
        setLifecycleState("failed");
        setVisualState("disconnected");
      }
    } finally {
      isOperating.current = false;
    }
  }, [
    isLiveMode,
    meeting,
    participant,
    approvedFacts,
    scriptedTurns,
    cleanUpLiveResources,
  ]);

  /**
   * Steps through simulated conversation turn (Demo Mode only).
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

      // 3. Advance to next turn or conclude
      const nextIndex = currentTurnIndex + 1;
      if (nextIndex < scriptedTurns.length) {
        const nextTurn = scriptedTurns[nextIndex];

        if (nextTurn.stage !== currentTurn.stage) {
          await advanceSessionStage(session.id, {
            targetStage: nextTurn.stage,
            reason: `Progressed to ${nextTurn.stage} stage discussion`,
          });
        }

        setCurrentTurnIndex(nextIndex);
        setVisualState("thinking");

        setTimeout(() => {
          if (!isMounted.current) return;
          setVisualState("speaking");

          const nextAgentTranscript: TranscriptEvent = {
            id: `tr_${Date.now()}_agent_${nextIndex}`,
            sessionId: session.id,
            stage: nextTurn.stage,
            speaker: "agent",
            text: nextTurn.agentSpeech,
            isFinal: true,
            timestamp: new Date().toISOString(),
          };

          setTranscripts((prev) => [...prev, nextAgentTranscript]);

          void appendSessionEvent(session.id, {
            type: "transcript",
            event: {
              stage: nextTurn.stage,
              speaker: "agent",
              text: nextTurn.agentSpeech,
              isFinal: true,
              timestamp: nextAgentTranscript.timestamp,
            },
          });
        }, 600);
      } else {
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
   * Concludes the call and transitions to the summary view:
   * - In Live Mode: shuts down mic, audio, and WebSocket cleanly.
   * - In Demo Mode: marks session complete in mock store.
   */
  const endCall = useCallback(async () => {
    connectionAttemptIdRef.current += 1;

    if (isLiveMode) {
      setLifecycleState("ending");
      setVisualState("idle");
      cleanUpLiveResources();
      if (isMounted.current) {
        setLifecycleState("completed");
      }
      isOperating.current = false;
      return;
    }

    if (isOperating.current || !session) return;
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
      cleanUpLiveResources();
      isOperating.current = false;
    }
  }, [isLiveMode, session, onCallCompleted, cleanUpLiveResources]);

  /**
   * Toggles microphone mute.
   */
  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      if (recorderRef.current) {
        recorderRef.current.setMuted(next);
      }
      setVisualState(next ? "muted" : "listening");
      return next;
    });
  }, []);

  /**
   * Runs microphone hardware diagnostic.
   */
  const testMicrophone = useCallback(async () => {
    setMicStatus("checking");
    setMicErrorMessage(null);

    const result = await testMicrophoneHardware();
    setMicStatus(result.status);

    if (result.status === "granted" && result.stream) {
      activeMediaStream.current = result.stream;
      setTimeout(() => {
        stopMediaStream(activeMediaStream.current);
        activeMediaStream.current = null;
      }, 3000);
    } else {
      setMicErrorMessage(result.errorMessage ?? "Microphone hardware test failed.");
    }
  }, []);

  /**
   * Resets call state to idle to allow re-testing or reconnecting.
   */
  const resetCall = useCallback(() => {
    connectionAttemptIdRef.current += 1;
    cleanUpLiveResources();
    setLifecycleState("idle");
    setVisualState("idle");
    setSession(null);
    setError(null);
    setCallDurationSeconds(0);
    setCurrentTurnIndex(0);
    setCurrentLiveStage("UNDERSTAND");
    setTranscripts([]);
    setDecisions([]);
    setOpenQuestions([]);
    setUserAudioLevel(0);
    setGeminiAudioLevel(0);
    liveTurnCounterRef.current = 0;
    hasSentKickoffRef.current = false;
    lastSpeechEndTimeRef.current = null;
    isOperating.current = false;
    setDiagnostics({
      micSendIntervalMs: 0,
      timeSinceSpeechEndMs: null,
      firstAudioReceivedMs: null,
      firstAudioPlayedMs: null,
      playbackQueueDurationMs: 0,
      interruptionCount: 0,
      reconnectCount: 0,
      connectionStatus: "idle",
    });
  }, [cleanUpLiveResources]);

  const currentStage: SkillStage = isLiveMode
    ? currentLiveStage
    : scriptedTurns[currentTurnIndex]?.stage ?? session?.currentStage ?? "UNDERSTAND";

  return {
    isLiveMode,
    lifecycleState,
    visualState,
    session,
    error,
    isMuted,
    callDurationSeconds,
    currentStage,
    currentTurnIndex,
    totalTurns: scriptedTurns.length,
    currentScriptedTurn: isLiveMode ? null : scriptedTurns[currentTurnIndex] ?? null,
    transcripts,
    decisions,
    openQuestions,
    micStatus,
    micErrorMessage,
    userAudioLevel,
    geminiAudioLevel,
    liveDiagnostics: diagnostics,
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
