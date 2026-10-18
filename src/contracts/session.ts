import { z } from "zod";

export const SkillStageSchema = z.enum([
  "UNDERSTAND",
  "EXPLORE",
  "EVALUATE",
  "ALIGN",
]);

export const SessionStatusSchema = z.enum([
  "ringing",
  "active",
  "paused",
  "completed",
  "abandoned",
]);

export const GroundingSourceTypeSchema = z.enum([
  "document_fact",
  "user_decision",
  "assumption",
]);

export const StageTransitionRecordSchema = z.object({
  fromStage: SkillStageSchema.nullable(),
  toStage: SkillStageSchema,
  transitionedAt: z.string().datetime(),
  reason: z.string().optional(),
});

export const TranscriptSpeakerSchema = z.enum(["user", "agent", "system"]);

export const TranscriptEventSchema = z.object({
  id: z.string().min(1),
  sessionId: z.string().min(1),
  stage: SkillStageSchema,
  speaker: TranscriptSpeakerSchema,
  text: z.string().min(1),
  isFinal: z.boolean().default(true),
  timestamp: z.string().datetime(),
});

export const DecisionEventSchema = z.object({
  id: z.string().min(1),
  sessionId: z.string().min(1),
  stage: SkillStageSchema,
  topic: z.string().min(1),
  decision: z.string().min(1),
  rationale: z.string().optional(),
  sourceType: GroundingSourceTypeSchema.default("user_decision"),
  sourceReferenceIds: z.array(z.string().min(1)).default([]),
  timestamp: z.string().datetime(),
});

/**
 * Contract V2: PreparationSessionSchema
 * Represents a role-aware AI preparation session conducted by a specific participant
 * for a shared meeting context.
 */
export const PreparationSessionSchema = z.object({
  id: z.string().min(1),
  meetingId: z.string().min(1),
  participantId: z.string().min(1),
  participantRole: z.string().min(1),
  participantName: z.string().min(1).optional(),
  currentStage: SkillStageSchema.default("UNDERSTAND"),
  stageHistory: z.array(StageTransitionRecordSchema).default([]),
  transcripts: z.array(TranscriptEventSchema).default([]),
  confirmedDecisions: z.array(DecisionEventSchema).default([]),
  openQuestions: z.array(z.string().min(1)).default([]),
  selectedConceptId: z.string().min(1).nullable().default(null),
  status: SessionStatusSchema.default("ringing"),
  startedAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  endedAt: z.string().datetime().optional(),
});

/**
 * Contract V2: CreateSessionRequestSchema
 * Starts a role-aware preparation session for a designated participant.
 */
export const CreateSessionRequestSchema = z.object({
  meetingId: z.string().min(1),
  participantId: z.string().min(1),
  participantRole: z.string().min(1).optional(),
  participantName: z.string().min(1).optional(),
});

export const AppendSessionEventRequestSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("transcript"),
    event: TranscriptEventSchema.omit({ id: true, sessionId: true }).extend({
      id: z.string().min(1).optional(),
    }),
  }),
  z.object({
    type: z.literal("decision"),
    event: DecisionEventSchema.omit({ id: true, sessionId: true }).extend({
      id: z.string().min(1).optional(),
    }),
  }),
  z.object({
    type: z.literal("open_question"),
    question: z.string().min(1),
  }),
  z.object({
    type: z.literal("select_concept"),
    selectedConceptId: z.string().min(1),
  }),
]);

export const AdvanceStageRequestSchema = z.object({
  targetStage: SkillStageSchema,
  reason: z.string().optional(),
});

export const CompleteSessionRequestSchema = z.object({
  selectedConceptId: z.string().min(1).optional(),
  closingNotes: z.string().optional(),
});

/**
 * Ephemeral Gemini Live session credentials returned to the browser.
 * Must NEVER contain permanent server-side GEMINI_API_KEY values.
 */
export const LiveTokenResponseSchema = z.object({
  sessionId: z.string().min(1),
  ephemeralToken: z.string().min(1),
  expiresAt: z.string().datetime(),
  stage: SkillStageSchema,
});

export type SkillStage = z.infer<typeof SkillStageSchema>;
export type SessionStatus = z.infer<typeof SessionStatusSchema>;
export type GroundingSourceType = z.infer<typeof GroundingSourceTypeSchema>;
export type StageTransitionRecord = z.infer<typeof StageTransitionRecordSchema>;
export type TranscriptSpeaker = z.infer<typeof TranscriptSpeakerSchema>;
export type TranscriptEvent = z.infer<typeof TranscriptEventSchema>;
export type DecisionEvent = z.infer<typeof DecisionEventSchema>;
export type PreparationSession = z.infer<typeof PreparationSessionSchema>;
export type CreateSessionRequest = z.infer<typeof CreateSessionRequestSchema>;
export type AppendSessionEventRequest = z.infer<
  typeof AppendSessionEventRequestSchema
>;
export type AdvanceStageRequest = z.infer<typeof AdvanceStageRequestSchema>;
export type CompleteSessionRequest = z.infer<
  typeof CompleteSessionRequestSchema
>;
export type LiveTokenResponse = z.infer<typeof LiveTokenResponseSchema>;
