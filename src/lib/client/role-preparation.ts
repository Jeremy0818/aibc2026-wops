import type { Meeting, MeetingParticipant } from "@/contracts/meeting";

export interface RoleStagePrompt {
  stage: "Understand" | "Explore" | "Evaluate" | "Align";
  prompt: string;
}

export interface RolePreparationProfile {
  roleTitle: string;
  tagline: string;
  summary: string;
  focusPills: string[];
  keyQuestions: string[];
  stagePrompts: RoleStagePrompt[];
  expectedOutcome: string;
}

export interface EmployeeAssignmentItem {
  participant: MeetingParticipant;
  isLead: boolean;
}

/**
 * Extracts the employee participants assigned to prepare for a meeting.
 * Excludes the Team Lead role when distinct employee participants exist,
 * and falls back to `meeting.participantRole` if `participants` is empty.
 */
export function getAssignedEmployeesForMeeting(
  meeting: Meeting
): MeetingParticipant[] {
  const nonLeadParticipants = meeting.participants.filter(
    (p) =>
      p.role.trim().toLowerCase() !== meeting.leadRole.trim().toLowerCase()
  );

  if (nonLeadParticipants.length > 0) {
    return nonLeadParticipants;
  }

  if (meeting.participants.length > 0) {
    return meeting.participants;
  }

  const fallbackRole = meeting.participantRole || "Participant";
  return [
    {
      id: `role_${meeting.id}_default`,
      name: fallbackRole,
      role: fallbackRole,
    },
  ];
}

/**
 * Derives role-specific AI preparation focus areas and stage questions
 * while keeping the underlying factual meeting context identical.
 */
export function getRolePreparationProfile(
  role: string,
  meeting?: Meeting
): RolePreparationProfile {
  const normalized = role.toLowerCase();
  const brandLabel = meeting?.clientName ?? "the client";

  if (
    normalized.includes("planner") ||
    normalized.includes("strateg") ||
    normalized.includes("marketing") ||
    normalized.includes("campaign")
  ) {
    return {
      roleTitle: role,
      tagline: "Strategic angle, audience behavior, channel mix & budget split",
      summary: `WOPS! will help you shape the strategic hook for ${brandLabel}, allocate the integer IDR budget ceiling across channels, and define measurable 6-week launch KPIs.`,
      focusPills: [
        "Audience & commuter insight",
        "KPI targets",
        "Channel & creator mix",
        "IDR budget allocation",
        "6-week rollout timeline",
        "Strategic campaign direction",
      ],
      keyQuestions: [
        "Which daily commuter moment in Jakarta and Surabaya gives us the sharpest non-medical hook?",
        "How should we split the budget under the ceiling between creator seeding, paid social, and commuter sampling?",
        "What trial and video-view KPIs will prove traction within the 6-week launch window?",
      ],
      stagePrompts: [
        {
          stage: "Understand",
          prompt:
            "Confirm target commuter demographics, 5g sugar product fact, and the Rp250M budget ceiling.",
        },
        {
          stage: "Explore",
          prompt:
            "Brainstorm strategic campaign hooks and creator-led commuter activation mechanics.",
        },
        {
          stage: "Evaluate",
          prompt:
            "Stress-test each direction against taste perception barriers, KPI realism, and budget split.",
        },
        {
          stage: "Align",
          prompt:
            "Lock in your recommended strategic direction, channel plan, and 6-week phased schedule.",
        },
      ],
      expectedOutcome:
        "A grounded strategic campaign brief with a recommended creative hook, channel & creator plan, 6-week timeline, and IDR budget breakdown.",
    };
  }

  if (
    normalized.includes("design") ||
    normalized.includes("art") ||
    normalized.includes("visual") ||
    normalized.includes("creative director")
  ) {
    return {
      roleTitle: role,
      tagline:
        "Visual direction, brand guardrails, asset requirements & production feasibility",
      summary: `WOPS! will help you translate ${brandLabel}'s brief into a cohesive visual world—ensuring bold coffee appetite appeal without clinical 'diet' cues and scoping realistic assets for the 6-week rollout.`,
      focusPills: [
        "Visual territory & mood",
        "Brand & packaging guardrails",
        "Asset requirements",
        "Sampling booth & POS deliverables",
        "Creator kit visual system",
        "6-week production feasibility",
      ],
      keyQuestions: [
        "How do we visually signal 'light sugar, full Indonesian coffee taste' without looking like a clinical diet drink?",
        "What hero visual assets are needed across TikTok/Reels, MRT sampling booths, and minimarket POS displays?",
        "Can the creator seeding kit and booth collateral be produced within Week 1–2 lead times?",
      ],
      stagePrompts: [
        {
          stage: "Understand",
          prompt:
            "Review product visual cues (200ml can, 5g cane sugar) and strict non-medical visual guardrails.",
        },
        {
          stage: "Explore",
          prompt:
            "Develop distinct visual directions, typography moods, and MRT commuter booth aesthetics.",
        },
        {
          stage: "Evaluate",
          prompt:
            "Check asset lists and production timelines against the 6-week schedule and budget ceiling.",
        },
        {
          stage: "Align",
          prompt:
            "Select the primary visual direction and finalize the deliverable checklist for the meeting.",
        },
      ],
      expectedOutcome:
        "A role-specific visual preparation summary covering visual territory, brand guardrails, key deliverables list, and production feasibility notes.",
    };
  }

  return {
    roleTitle: role,
    tagline: "Role-specific priorities, trade-offs & meeting alignment",
    summary: `WOPS! will guide a focused voice thinking session tailored to your role as ${role} so you walk into the ${brandLabel} meeting with clear recommendations.`,
    focusPills: [
      "Role priorities",
      "Brief requirements fit",
      "Guardrail compliance",
      "Key deliverables",
      "Timeline feasibility",
    ],
    keyQuestions: [
      `What is the most important recommendation you need to bring to this meeting as ${role}?`,
      "Which client requirement or constraint creates the biggest trade-off for your workstream?",
      "What open questions need team alignment during the meeting?",
    ],
    stagePrompts: [
      {
        stage: "Understand",
        prompt: "Review shared meeting goals, PDF brief facts, and guardrails.",
      },
      {
        stage: "Explore",
        prompt: `Explore options and approaches from your perspective as ${role}.`,
      },
      {
        stage: "Evaluate",
        prompt: "Weigh trade-offs against client constraints and budget ceiling.",
      },
      {
        stage: "Align",
        prompt: "Summarize your recommended direction and open questions.",
      },
    ],
    expectedOutcome: `A structured preparation summary for your role as ${role}, grounded in the shared client brief.`,
  };
}
