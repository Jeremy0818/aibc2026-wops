import { SkillStage, StageTransitionRecord } from "@/contracts/session";
import { WopsApiError } from "@/lib/server/api-error";

export const SKILL_STAGE_ORDER: readonly SkillStage[] = [
  "UNDERSTAND",
  "EXPLORE",
  "EVALUATE",
  "ALIGN",
] as const;

export interface StageDefinition {
  stage: SkillStage;
  coreQuestion: string;
  expectedOutcome: string;
  facilitationFocus: string[];
  nextStage: SkillStage | null;
}

export const STAGE_DEFINITIONS: Record<SkillStage, StageDefinition> = {
  UNDERSTAND: {
    stage: "UNDERSTAND",
    coreQuestion: "What problem are we actually solving?",
    expectedOutcome: "Objectives, constraints, evidence, and unknowns",
    facilitationFocus: [
      "Clarify campaign objectives and target audience from the client brief",
      "Verify key constraints (including Rp250,000,000 budget ceiling and no unsupported medical/health claims)",
      "Surface missing information or open questions for the team meeting",
    ],
    nextStage: "EXPLORE",
  },
  EXPLORE: {
    stage: "EXPLORE",
    coreQuestion: "What could we do?",
    expectedOutcome: "Multiple differentiated creative directions",
    facilitationFocus: [
      "Brainstorm at least 2-3 distinct creative territories rather than settling on the first idea",
      "Ground territories in documented product facts (e.g., 5g cane sugar per 200ml can, Indonesian Arabica-Robusta blend)",
      "Connect ideas to real urban commuter rituals in Jakarta and Surabaya",
    ],
    nextStage: "EVALUATE",
  },
  EVALUATE: {
    stage: "EVALUATE",
    coreQuestion: "Which options hold up, and why?",
    expectedOutcome: "Trade-offs, feasibility, risks, and comparisons",
    facilitationFocus: [
      "Compare creative directions on cultural relevance, trial mechanics, and budget feasibility within Rp250,000,000",
      "Identify brand safety risks (such as creators improvising clinical health claims) and mitigations",
      "Challenge unverified assumptions and distinguish them from document facts",
    ],
    nextStage: "ALIGN",
  },
  ALIGN: {
    stage: "ALIGN",
    coreQuestion: "What are we taking into the meeting?",
    expectedOutcome: "Preferred direction, decisions, and next steps",
    facilitationFocus: [
      "Confirm the recommended creative direction (selectedConceptId)",
      "Lock in key messages, 6-week launch phasing, and high-level budget allocation under the ceiling",
      "Summarize open questions and concrete next steps for the Creative Team Lead review",
    ],
    nextStage: null,
  },
};

export function getNextStage(currentStage: SkillStage): SkillStage | null {
  return STAGE_DEFINITIONS[currentStage].nextStage;
}

export function isValidStageTransition(
  fromStage: SkillStage,
  toStage: SkillStage,
): boolean {
  const expectedNext = getNextStage(fromStage);
  return expectedNext !== null && expectedNext === toStage;
}

export function assertValidStageTransition(
  fromStage: SkillStage,
  toStage: SkillStage,
  reason?: string,
): StageTransitionRecord {
  if (!isValidStageTransition(fromStage, toStage)) {
    const expectedNext = getNextStage(fromStage);
    const hint = expectedNext
      ? `Expected next stage is '${expectedNext}'.`
      : `Stage '${fromStage}' is the final stage and cannot advance further.`;
    throw new WopsApiError(
      "INVALID_STAGE_TRANSITION",
      `Cannot transition from '${fromStage}' to '${toStage}'. ${hint}`,
      409,
      [
        {
          field: "targetStage",
          message: `Invalid stage transition from ${fromStage} to ${toStage}`,
        },
      ],
    );
  }

  return {
    fromStage,
    toStage,
    transitionedAt: new Date().toISOString(),
    reason: reason ?? `Advanced from ${fromStage} to ${toStage}`,
  };
}
