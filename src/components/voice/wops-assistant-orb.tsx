"use client";

import type { VisualAgentState } from "@/hooks/use-preparation-call";

interface WopsAssistantOrbProps {
  state: VisualAgentState;
  size?: "sm" | "md" | "lg";
}

export function WopsAssistantOrb({
  state,
  size = "md",
}: WopsAssistantOrbProps) {
  const sizeClasses = {
    sm: "h-14 w-14",
    md: "h-24 w-24 sm:h-28 sm:w-28",
    lg: "h-32 w-32 sm:h-36 sm:w-36",
  }[size];

  // Visual treatments per state
  const stateConfig = {
    idle: {
      gradient: "from-[#d95d39] via-[#e27351] to-[#f5a082]",
      ringClass: "ring-4 ring-[#f5d5c8]/40",
      pulseClass: "",
      label: "Idle",
      icon: "✦",
    },
    ringing: {
      gradient: "from-[#d95d39] via-[#b44322] to-[#d95d39]",
      ringClass: "ring-8 ring-[#f5d5c8] animate-pulse",
      pulseClass: "animate-ping opacity-30",
      label: "Calling...",
      icon: "✦",
    },
    listening: {
      gradient: "from-[#2e6b54] via-[#3d8c6f] to-[#5fb493]",
      ringClass: "ring-6 ring-[#cce5d8]/70",
      pulseClass: "animate-pulse",
      label: "Listening...",
      icon: "👂",
    },
    thinking: {
      gradient: "from-[#5c5852] via-[#8a847c] to-[#dcd4c6]",
      ringClass: "ring-6 ring-[#ebe6dd] animate-spin",
      pulseClass: "",
      label: "Thinking...",
      icon: "✦",
    },
    speaking: {
      gradient: "from-[#d95d39] via-[#ea8363] to-[#f4ad97]",
      ringClass: "ring-8 ring-[#f5d5c8]/80 animate-pulse",
      pulseClass: "scale-105 transition-transform duration-300",
      label: "Speaking...",
      icon: "✦",
    },
    muted: {
      gradient: "from-[#8a847c] via-[#a39d93] to-[#cfc9be]",
      ringClass: "ring-4 ring-gray-200",
      pulseClass: "",
      label: "Muted",
      icon: "🔇",
    },
    disconnected: {
      gradient: "from-gray-400 to-gray-500",
      ringClass: "ring-2 ring-gray-200",
      pulseClass: "",
      label: "Disconnected",
      icon: "✕",
    },
  }[state];

  return (
    <div className="relative flex items-center justify-center">
      {/* Outer Pulse Wave for active states */}
      {stateConfig.pulseClass && (
        <div
          aria-hidden="true"
          className={`absolute rounded-full bg-[#d95d39]/20 motion-reduce:animate-none ${sizeClasses} ${stateConfig.pulseClass}`}
        />
      )}

      {/* Main Orb */}
      <div
        className={`relative flex items-center justify-center rounded-full bg-gradient-to-tr shadow-lg transition-all duration-300 motion-reduce:transition-none ${sizeClasses} ${stateConfig.gradient} ${stateConfig.ringClass}`}
      >
        <span
          className="text-lg font-bold text-white select-none sm:text-2xl"
          aria-hidden="true"
        >
          {stateConfig.icon}
        </span>
      </div>
    </div>
  );
}
