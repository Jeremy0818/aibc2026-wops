import { z } from "zod";
import { GroundingSourceTypeSchema } from "./session";

export const CreativeDirectionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  tagline: z.string().min(1),
  conceptSummary: z.string().min(1),
  rationale: z.string().min(1),
  isRecommended: z.boolean().default(false),
});

export const ChannelPlanItemSchema = z.object({
  channel: z.string().min(1),
  role: z.string().min(1),
  tactics: z.array(z.string().min(1)).default([]),
});

export const TimelineWeekItemSchema = z.object({
  weekNumber: z.number().int().min(1).max(6),
  phaseName: z.string().min(1),
  milestones: z.array(z.string().min(1)).default([]),
  deliverables: z.array(z.string().min(1)).default([]),
});

export const BudgetBreakdownItemSchema = z.object({
  category: z.string().min(1),
  amountIdr: z.number().int().nonnegative(),
  notes: z.string().optional(),
});

export const ProposalRiskItemSchema = z.object({
  risk: z.string().min(1),
  mitigation: z.string().min(1),
});

export const ProposalSourceReferenceSchema = z.object({
  id: z.string().min(1),
  sourceType: GroundingSourceTypeSchema,
  claimOrDecision: z.string().min(1),
  referenceId: z.string().optional(),
  citationNote: z.string().optional(),
});

export const ParticipantContributionSchema = z.object({
  participantId: z.string().min(1),
  participantName: z.string().min(1),
  participantRole: z.string().min(1),
  sessionId: z.string().min(1).optional(),
  decisionsCount: z.number().int().nonnegative().default(0),
  completedPrep: z.boolean().default(false),
});

/**
 * Contract V2: CampaignProposalSchema
 * Supports aggregation of decisions from multiple role-specific sessions.
 * Preserves cross-role provenance, participant contributions, and unresolved conflicts.
 */
export const CampaignProposalSchema = z.object({
  id: z.string().min(1),
  meetingId: z.string().min(1),
  sessionId: z.string().min(1).optional(),
  sessionIds: z.array(z.string().min(1)).default([]),
  participantContributions: z.array(ParticipantContributionSchema).default([]),
  unresolvedConflicts: z.array(z.string().min(1)).default([]),

  executiveSummary: z.string().min(1),
  clientContext: z.string().min(1),
  campaignObjectives: z.array(z.string().min(1)).min(1),
  targetAudience: z.string().min(1),
  creativeDirections: z.array(CreativeDirectionSchema).min(1),
  selectedDirection: CreativeDirectionSchema,
  keyMessages: z.array(z.string().min(1)).min(1),
  activationIdeas: z.array(z.string().min(1)).default([]),
  channelStrategy: z.array(ChannelPlanItemSchema).default([]),
  creatorStrategy: z.string().min(1),
  sixWeekTimeline: z.array(TimelineWeekItemSchema).length(6),
  budgetBreakdown: z.array(BudgetBreakdownItemSchema).min(1),
  totalBudgetIdr: z.number().int().nonnegative(),
  kpis: z.array(z.string().min(1)).min(1),
  risks: z.array(ProposalRiskItemSchema).default([]),
  sourceReferences: z.array(ProposalSourceReferenceSchema).min(1),
  nextSteps: z.array(z.string().min(1)).min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const GenerateProposalRequestSchema = z.object({
  selectedConceptId: z.string().min(1).optional(),
  additionalNotes: z.string().optional(),
  sessionIds: z.array(z.string().min(1)).optional(),
});

export type CreativeDirection = z.infer<typeof CreativeDirectionSchema>;
export type ChannelPlanItem = z.infer<typeof ChannelPlanItemSchema>;
export type TimelineWeekItem = z.infer<typeof TimelineWeekItemSchema>;
export type BudgetBreakdownItem = z.infer<typeof BudgetBreakdownItemSchema>;
export type ProposalRiskItem = z.infer<typeof ProposalRiskItemSchema>;
export type ProposalSourceReference = z.infer<
  typeof ProposalSourceReferenceSchema
>;
export type ParticipantContribution = z.infer<
  typeof ParticipantContributionSchema
>;
export type CampaignProposal = z.infer<typeof CampaignProposalSchema>;
export type GenerateProposalRequest = z.infer<
  typeof GenerateProposalRequestSchema
>;
