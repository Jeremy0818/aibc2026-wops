"use client";

import { useEffect, useRef, useState } from "react";
import type { Meeting, MeetingParticipant } from "@/contracts/meeting";
import type { SkillStage } from "@/contracts/session";
import type {
  CallLifecycleState,
  VisualAgentState,
} from "@/hooks/use-preparation-call";
import type { ScriptedTurn } from "@/lib/client/mock-sessions";
import { WopsAssistantOrb } from "./wops-assistant-orb";
import { formatCallDuration } from "@/lib/client/formatters";
import type { MicPermissionStatus } from "@/lib/client/audio-hardware";

const STAGES: { key: SkillStage; label: string }[] = [
  { key: "UNDERSTAND", label: "Understand" },
  { key: "EXPLORE", label: "Explore" },
  { key: "EVALUATE", label: "Evaluate" },
  { key: "ALIGN", label: "Align" },
];

interface ActiveCallScreenProps {
  meeting: Meeting;
  participant: MeetingParticipant;
  lifecycleState: CallLifecycleState;
  visualState: VisualAgentState;
  isMuted: boolean;
  callDurationSeconds: number;
  currentStage: SkillStage;
  currentTurnIndex: number;
  totalTurns: number;
  currentScriptedTurn: ScriptedTurn | null;
  transcripts: { speaker: "agent" | "user" | "system"; text: string }[];
  micStatus: MicPermissionStatus;
  micErrorMessage?: string | null;
  onToggleMute: () => void;
  onSendResponse: (customText?: string) => Promise<void>;
  onEndCall: () => Promise<void>;
  onTestMicrophone: () => Promise<void>;
}

export function ActiveCallScreen({
  meeting,
  participant,
  lifecycleState,
  visualState,
  isMuted,
  callDurationSeconds,
  currentStage,
  currentTurnIndex,
  totalTurns,
  currentScriptedTurn,
  transcripts,
  micStatus,
  micErrorMessage,
  onToggleMute,
  onSendResponse,
  onEndCall,
  onTestMicrophone,
}: ActiveCallScreenProps) {
  const [showTranscriptDrawer, setShowTranscriptDrawer] = useState(false);
  const [showHardwarePanel, setShowHardwarePanel] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);

  // Auto scroll transcript
  useEffect(() => {
    if (showTranscriptDrawer) {
      transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [transcripts, showTranscriptDrawer]);

  const handleRespond = async () => {
    if (isSubmitting || !currentScriptedTurn) return;
    setIsSubmitting(true);
    try {
      await onSendResponse();
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLastTurn = currentTurnIndex >= totalTurns - 1;

  // Active status text
  const statusHeadline = {
    idle: "Ready when you are",
    ringing: "Connecting call...",
    listening: "Listening...",
    thinking: "Thinking through your point...",
    speaking: "WOPS! is speaking...",
    muted: "Microphone is muted",
    disconnected: "Call ended",
  }[visualState];

  return (
    <div className="mx-auto w-full max-w-xl space-y-4">
      {/* Top Header & Session Bar */}
      <div className="wops-warm-card rounded-3xl p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#ebe6dd] pb-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-[#d95d39]">
              <span>WOPS! AI Preparation</span>
              <span aria-hidden="true">·</span>
              <span>Demo Mode</span>
            </div>
            <h1 className="truncate text-base font-semibold text-[#1f1e1c] sm:text-lg">
              {meeting.title}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-medium text-[#5c5852]">
              {formatCallDuration(callDurationSeconds)}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
              Simulated Call (Demo)
            </span>
          </div>
        </div>

        {/* Participant Context Strip */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div>
            <span className="text-[#8a847c]">Participant: </span>
            <span className="font-medium text-[#1f1e1c]">{participant.name}</span>
            <span className="mx-1 text-[#dcd4c6]">·</span>
            <span className="rounded-full border border-[#f5d5c8] bg-[#fdf1ec] px-2 py-0.5 text-[11px] font-medium text-[#b44322]">
              {participant.role}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowTranscriptDrawer((prev) => !prev)}
            className="text-xs font-medium text-[#d95d39] hover:underline"
          >
            {showTranscriptDrawer ? "Hide Transcript" : "Show Transcript"} ({transcripts.length})
          </button>
        </div>

        {/* 4-Stage Progress Pills */}
        <div className="mt-4 grid grid-cols-4 gap-1.5">
          {STAGES.map((s, idx) => {
            const isCurrent = s.key === currentStage;
            const isPassed =
              STAGES.findIndex((stage) => stage.key === currentStage) > idx;

            return (
              <div
                key={s.key}
                className={`flex flex-col items-center rounded-xl p-2 text-center transition ${
                  isCurrent
                    ? "border border-[#f5d5c8] bg-[#fdf1ec] text-[#b44322]"
                    : isPassed
                    ? "border border-[#ebe6dd] bg-[#faf9f6] text-[#1f1e1c]"
                    : "border border-transparent bg-transparent text-[#8a847c]"
                }`}
              >
                <span className="text-[10px] font-bold">
                  {isPassed ? "✓" : idx + 1}
                </span>
                <span className="truncate text-[11px] font-medium">
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Voice Calling Surface */}
      <section
        aria-label="Voice call active area"
        className="wops-warm-card relative overflow-hidden rounded-3xl p-6 text-center sm:p-8"
      >
        <p className="text-xs font-medium text-[#8a847c]">{statusHeadline}</p>

        {/* Animated Assistant Orb */}
        <div className="my-6 flex justify-center">
          <WopsAssistantOrb state={visualState} size="lg" />
        </div>

        {/* Current Agent Dialogue Prompt */}
        <div className="mx-auto max-w-md rounded-2xl border border-[#ebe6dd] bg-[#faf9f6] p-4 text-left">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#d95d39]">
            Current Focus · {currentStage}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-[#1f1e1c] sm:text-sm">
            {currentScriptedTurn?.agentSpeech ??
              "All ideation stages have been covered! You can review and complete your call."}
          </p>
        </div>

        {/* Suggested Response Preview for Demo Mode */}
        {currentScriptedTurn && (
          <div className="mx-auto mt-3 max-w-md rounded-2xl border border-dashed border-[#dcd4c6] p-3 text-left">
            <p className="text-[10px] font-medium uppercase tracking-wider text-[#8a847c]">
              Suggested Response ({participant.role})
            </p>
            <p className="mt-1 text-xs text-[#5c5852]">
              &ldquo;{currentScriptedTurn.suggestedUserSpeech}&rdquo;
            </p>
          </div>
        )}

        {/* Interactive Stepping Action in Demo Mode */}
        <div className="mt-6 flex flex-col items-center gap-3">
          {currentScriptedTurn && (
            <button
              type="button"
              disabled={isSubmitting || visualState === "thinking"}
              onClick={() => void handleRespond()}
              className="inline-flex min-h-12 w-full max-w-sm items-center justify-center gap-2 rounded-full bg-[#d95d39] px-6 py-3 text-xs font-semibold text-white shadow-md transition hover:bg-[#c34e2c] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d95d39]"
            >
              <span>{isSubmitting ? "Transcribing..." : isLastTurn ? "Confirm alignment & finish" : "Say suggested response"}</span>
              <span aria-hidden="true">→</span>
            </button>
          )}

          {/* Call Controls: Mute & End */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={onToggleMute}
              className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-medium transition ${
                isMuted
                  ? "border-[#b44322] bg-[#fdf1ec] text-[#b44322]"
                  : "border-[#ebe6dd] bg-white text-[#1f1e1c] hover:bg-[#faf9f6]"
              }`}
            >
              <span aria-hidden="true">{isMuted ? "🔇" : "🎤"}</span>
              <span>{isMuted ? "Unmute" : "Mute"}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowHardwarePanel((prev) => !prev)}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-[#ebe6dd] bg-white px-4 py-2 text-xs font-medium text-[#1f1e1c] transition hover:bg-[#faf9f6]"
            >
              <span aria-hidden="true">⚙️</span>
              <span>Test microphone</span>
            </button>

            <button
              type="button"
              onClick={() => void onEndCall()}
              disabled={lifecycleState === "ending"}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-red-600 px-5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-50"
            >
              <span aria-hidden="true">📞</span>
              <span>{lifecycleState === "ending" ? "Concluding..." : "End Call"}</span>
            </button>
          </div>
        </div>
      </section>

      {/* Real Hardware Check Panel (Explicitly Separated from Simulation) */}
      {showHardwarePanel && (
        <section
          aria-label="Microphone hardware test panel"
          className="rounded-3xl border border-[#ebe6dd] bg-white p-4 shadow-sm sm:p-5"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm">🎙️</span>
              <h3 className="text-xs font-semibold text-[#1f1e1c]">
                Browser Microphone Hardware Test
              </h3>
            </div>
            <span className="rounded-full bg-[#f4f1ea] px-2 py-0.5 text-[10px] text-[#5c5852]">
              Separate Media Check
            </span>
          </div>

          <p className="mt-1.5 text-xs text-[#5c5852]">
            WOPS! scripted demo runs entirely in the browser without requiring live microphone streaming.
            You can verify your physical microphone access below:
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void onTestMicrophone()}
              className="rounded-full border border-[#ebe6dd] bg-[#faf9f6] px-3.5 py-1.5 text-xs font-medium text-[#1f1e1c] transition hover:border-[#f5d5c8] hover:bg-[#fdf1ec]"
            >
              {micStatus === "checking" ? "Requesting access..." : "Run Hardware Mic Check"}
            </button>

            {micStatus === "granted" && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                <span>✓ Microphone accessible &amp; ready</span>
              </span>
            )}
            {micStatus === "denied" && (
              <span className="text-xs font-medium text-red-600">
                ✕ Access denied in browser settings
              </span>
            )}
            {micStatus === "missing_device" && (
              <span className="text-xs font-medium text-amber-700">
                ⚠ No microphone detected
              </span>
            )}
          </div>

          {micErrorMessage && (
            <p className="mt-2 text-xs text-red-600">{micErrorMessage}</p>
          )}
        </section>
      )}

      {/* Collapsible Transcript Drawer */}
      {showTranscriptDrawer && (
        <section
          aria-label="Call transcript drawer"
          className="wops-warm-card rounded-3xl p-4 sm:p-5"
        >
          <div className="flex items-center justify-between border-b border-[#ebe6dd] pb-2.5">
            <div>
              <h3 className="text-xs font-semibold text-[#1f1e1c]">
                Call Transcript
              </h3>
              <p className="text-[11px] text-[#8a847c]">
                Simulated in Demo Mode · Capturing grounding facts &amp; decisions
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowTranscriptDrawer(false)}
              className="text-xs text-[#5c5852] hover:underline"
            >
              Close
            </button>
          </div>

          <div className="mt-3 max-h-60 space-y-3 overflow-y-auto pr-1">
            {transcripts.map((t, idx) => (
              <div
                key={idx}
                className={`flex flex-col gap-0.5 rounded-2xl p-3 text-xs leading-relaxed ${
                  t.speaker === "agent"
                    ? "bg-[#faf9f6] text-[#1f1e1c]"
                    : "border border-[#f5d5c8] bg-[#fdf1ec]/60 text-[#1f1e1c]"
                }`}
              >
                <span className="text-[10px] font-bold text-[#8a847c]">
                  {t.speaker === "agent" ? "WOPS! (AI Partner)" : participant.name}
                </span>
                <p>{t.text}</p>
              </div>
            ))}
            <div ref={transcriptEndRef} />
          </div>
        </section>
      )}
    </div>
  );
}
