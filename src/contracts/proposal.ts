import { z } from "zod";
import { GroundingSourceTypeSchema } from "./session";

/**
 * Creative or strategic direction explored during preparation.
 */
export const ProposalDirectionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  tagline: z.string().min(1),
  summary: z.string().min(1),
  rationale: z.string().min(1),
  isRecommended: z.boolean().default(false),
});

export const CreativeDirectionSchema = ProposalDirectionSchema;
export type CreativeDirection = z.infer<typeof CreativeDirectionSchema>;
export type ProposalDirection = z.infer<typeof ProposalDirectionSchema>;

/**
 * Individual role-specific recommendations and rationales.
 */
export const ProposalRecommendationItemSchema = z.object({
  id: z.string().min(1),
  topic: z.string().min(1),
  recommendation: z.string().min(1),
  rationale: z.string().min(1),
  isParticipantConfirmed: z.boolean().default(false),
});
export type ProposalRecommendationItem = z.infer<
  typeof ProposalRecommendationItemSchema
>;

/**
 * Participant-confirmed decisions made during their role-aware session.
 */
export const ProposalDecisionItemSchema = z.object({
  id: z.string().min(1),
  stage: z.string().min(1),
  topic: z.string().min(1),
  decision: z.string().min(1),
  rationale: z.string().min(1),
  timestamp: z.string().datetime().optional(),
});
export type ProposalDecisionItem = z.infer<typeof ProposalDecisionItemSchema>;

/**
 * Grounded source citations from approved shared client documents or lead additions.
 */
export const ProposalSourceReferenceSchema = z.object({
  id: z.string().min(1),
  sourceType: GroundingSourceTypeSchema,
  claimOrDecision: z.string().min(1),
  referenceId: z.string().optional(),
  citationNote: z.string().optional(),
});
export type ProposalSourceReference = z.infer<
  typeof ProposalSourceReferenceSchema
>;

/**
 * Risks identified by the participant during their preparation call.
 */
export const ProposalRiskItemSchema = z.object({
  risk: z.string().min(1),
  mitigation: z.string().min(1),
});
export type ProposalRiskItem = z.infer<typeof ProposalRiskItemSchema>;

/**
 * Dynamic role-specific section (e.g. Channel & Budget for Planner, Visual Assets for Designer).
 * Allows content to adapt naturally to the employee's discipline without forced schemas.
 */
export const ProposalCustomSectionSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  items: z.array(z.string().min(1)).default([]),
});
export type ProposalCustomSection = z.infer<typeof ProposalCustomSectionSchema>;

/**
 * Contract V3: PreparationProposalSchema
 * Individual preparation proposal belonging to exactly one participant, one session, and one meeting.
 * Represents an employee's personal pre-meeting thinking, NOT an approved team decision.
 */
export const PreparationProposalSchema = z.object({
  id: z.string().min(1),
  meetingId: z.string().min(1),
  participantId: z.string().min(1),
  participantRole: z.string().min(1),
  participantName: z.string().min(1),
  sessionId: z.string().min(1),

  // Personal preparation title & summary
  title: z.string().min(1),
  summary: z.string().min(1),
  status: z.enum(["draft", "completed"]).default("completed"),

  // My Thinking
  keyIdeas: z.array(z.string().min(1)).default([]),
  directions: z.array(ProposalDirectionSchema).default([]),
  recommendations: z.array(ProposalRecommendationItemSchema).default([]),

  // What We Know (Grounded facts & citations from shared client brief)
  sharedFacts: z.array(ProposalSourceReferenceSchema).default([]),

  // Confirmed Decisions (from the participant's AI sparring call)
  confirmedDecisions: z.array(ProposalDecisionItemSchema).default([]),

  // What I Want to Bring Up
  talkingPoints: z.array(z.string().min(1)).default([]),
  openQuestions: z.array(z.string().min(1)).default([]),

  // Things to Watch
  assumptions: z.array(z.string().min(1)).default([]),
  risks: z.array(ProposalRiskItemSchema).default([]),
  constraints: z.array(z.string().min(1)).default([]),
  missingInfo: z.array(z.string().min(1)).default([]),

  // Role-specific sections (channel splits for planners, asset lists for designers)
  roleSections: z.array(ProposalCustomSectionSchema).default([]),

  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type PreparationProposal = z.infer<typeof PreparationProposalSchema>;

/**
 * Request body for generating/synthesizing a personal proposal from a completed session.
 */
export const GenerateProposalRequestSchema = z.object({
  selectedConceptId: z.string().min(1).optional(),
  additionalNotes: z.string().optional(),
});
export type GenerateProposalRequest = z.infer<
  typeof GenerateProposalRequestSchema
>;

/**
 * Backwards compatibility alias for older imports.
 */
export const CampaignProposalSchema = PreparationProposalSchema;
export type CampaignProposal = PreparationProposal;
