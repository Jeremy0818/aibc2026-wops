"use client";

import { useEffect, useRef } from "react";
import type { Meeting, MeetingParticipant } from "@/contracts/meeting";
import { WopsAssistantOrb } from "./wops-assistant-orb";

interface IncomingCallModalProps {
  meeting: Meeting;
  participant: MeetingParticipant;
  onAccept: () => void;
  onDecline: () => void;
}

export function IncomingCallModal({
  meeting,
  participant,
  onAccept,
  onDecline,
}: IncomingCallModalProps) {
  const acceptButtonRef = useRef<HTMLButtonElement | null>(null);

  // Focus accept button on mount for keyboard accessibility, handle Escape to decline
  useEffect(() => {
    acceptButtonRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onDecline();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onDecline]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="incoming-call-title"
      aria-describedby="incoming-call-description"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs transition-opacity"
    >
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-[#f5d5c8] bg-white p-6 shadow-xl sm:p-8">
        {/* Assistant Identity & Simulation Banner */}
        <div className="flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-[#f5d5c8] bg-[#fdf1ec] px-3 py-1 text-xs font-semibold text-[#b44322]">
            <span>WOPS! Thinking Partner</span>
            <span aria-hidden="true">·</span>
            <span>Simulated Call</span>
          </div>

          <p className="mt-2 text-[11px] text-[#8a847c]">
            Demo Simulation · No real telephone, push notification, or live Gemini connection
          </p>

          {/* Ringing Assistant Orb */}
          <div className="my-6">
            <WopsAssistantOrb state="ringing" size="md" />
          </div>

          {/* Call Metadata */}
          <h2
            id="incoming-call-title"
            className="text-xl font-semibold tracking-tight text-[#1f1e1c] sm:text-2xl"
          >
            Incoming Preparation Call
          </h2>

          <div className="mt-2 space-y-1">
            <p className="text-sm font-medium text-[#1f1e1c]">
              For: <span className="text-[#d95d39] font-semibold">{participant.name}</span>
            </p>
            <p className="text-xs text-[#5c5852]">
              Assigned Role: <span className="font-medium text-[#1f1e1c]">{participant.role}</span>
            </p>
            <p className="text-xs text-[#8a847c]">
              Meeting: <span className="font-medium text-[#1f1e1c]">{meeting.title}</span> ({meeting.clientName})
            </p>
          </div>

          {/* Conversational Intro */}
          <div className="mt-4 rounded-2xl border border-[#ebe6dd] bg-[#faf9f6] p-4 text-xs leading-relaxed text-[#5c5852]">
            <p id="incoming-call-description">
              &ldquo;Hi {participant.name.split(" ")[0]}! I&apos;m your thinking partner for the{" "}
              <strong>{meeting.clientName}</strong> review. Ready to spend 5 minutes sparring on your{" "}
              <strong>{participant.role}</strong> priorities before the team meets?&rdquo;
            </p>
          </div>

          {/* Call Actions */}
          <div className="mt-6 flex w-full flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={onDecline}
              className="inline-flex min-h-12 flex-1 items-center justify-center rounded-full border border-[#ebe6dd] bg-white px-5 py-2.5 text-xs font-semibold text-[#5c5852] transition hover:bg-[#f4f1ea] hover:text-[#1f1e1c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8a847c]"
            >
              Decline (Later)
            </button>

            <button
              ref={acceptButtonRef}
              type="button"
              onClick={onAccept}
              className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full bg-[#d95d39] px-5 py-2.5 text-xs font-semibold text-white shadow-md transition hover:bg-[#c34e2c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d95d39]"
            >
              <span aria-hidden="true">📞</span>
              <span>Accept &amp; Spar</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
