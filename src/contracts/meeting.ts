import { z } from "zod";

export const MeetingStatusSchema = z.enum([
  "draft",
  "ready",
  "in_session",
  "completed",
]);

export const MeetingParticipantSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().min(1),
  role: z.string().min(1),
  email: z.string().email().optional(),
});

/**
 * Contract V2: MeetingSchema
 * Represents a shared meeting entity.
 * In the 'draft' state, client fields extracted from uploaded documents
 * (clientObjective, targetAudience, budgetCeilingIdr) may be undefined.
 * Once finalized ('ready'), they represent confirmed grounded context.
 */
export const MeetingSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  clientName: z.string().min(1),
  projectName: z.string().min(1),
  scheduledAt: z.string().datetime(),
  meetingObjective: z.string().min(1),
  leadRole: z.string().min(1),
  participants: z.array(MeetingParticipantSchema).min(1),
  status: MeetingStatusSchema.default("draft"),
  documentIds: z.array(z.string().min(1)).default([]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),

  // Extracted & Grounded Client Context (optional during 'draft', populated after extraction/finalize)
  clientObjective: z.string().min(1).optional(),
  targetAudience: z.string().min(1).optional(),
  budgetCeilingIdr: z.number().int().nonnegative().optional(),
  clientRequirements: z.array(z.string().min(1)).default([]),
  constraints: z.array(z.string().min(1)).default([]),
  finalizedAt: z.string().datetime().optional(),

  // Legacy field preserved for backwards-compatibility; derived from primary participant
  participantRole: z.string().min(1).optional(),

  // Context revision version for change tracking across sessions
  contextVersion: z.number().int().positive().default(1),

  // Identity & Membership fields (Sprint B2)
  teamLeadUserId: z.string().min(1).optional(),
  participantUserIds: z.array(z.string().min(1)).optional(),
});

/**
 * Contract V2: CreateMeetingRequestSchema
 * Minimal meeting draft creation request.
 * Contains ONLY the fields known to the Team Lead before client document upload.
 * Client objectives, audience, budget ceiling, requirements, and constraints are
 * extracted from uploaded documents rather than manually transcribed.
 */
export const CreateMeetingRequestSchema = z.object({
  title: z.string().min(1),
  clientName: z.string().min(1),
  projectName: z.string().min(1),
  scheduledAt: z.string().datetime(),
  meetingObjective: z.string().min(1),
  leadRole: z.string().min(1),
  participants: z.array(MeetingParticipantSchema).min(1),
  // Optional client fields if known upfront, but never required
  clientObjective: z.string().min(1).optional(),
  targetAudience: z.string().min(1).optional(),
  budgetCeilingIdr: z.number().int().nonnegative().optional(),
  clientRequirements: z.array(z.string().min(1)).optional(),
  constraints: z.array(z.string().min(1)).optional(),
  participantRole: z.string().min(1).optional(),
});

/**
 * Contract V3 (Sprint B2): UpdateMeetingRequestSchema
 * Payload to update meeting metadata, schedule, or participant list by Team Lead.
 */
export const UpdateMeetingRequestSchema = z.object({
  title: z.string().min(1).optional(),
  clientName: z.string().min(1).optional(),
  projectName: z.string().min(1).optional(),
  scheduledAt: z.string().datetime().optional(),
  meetingObjective: z.string().min(1).optional(),
  leadRole: z.string().min(1).optional(),
  participants: z.array(MeetingParticipantSchema).min(1).optional(),
  clientObjective: z.string().min(1).optional(),
  targetAudience: z.string().min(1).optional(),
  budgetCeilingIdr: z.number().int().nonnegative().optional(),
  clientRequirements: z.array(z.string().min(1)).optional(),
  constraints: z.array(z.string().min(1)).optional(),
  status: MeetingStatusSchema.optional(),
});

/**
 * Contract V2: FinalizeMeetingRequestSchema
 * Payload to confirm/correct extracted client context and mark meeting setup ready.
 */
export const FinalizeMeetingRequestSchema = z.object({
  clientObjective: z.string().min(1).optional(),
  targetAudience: z.string().min(1).optional(),
  budgetCeilingIdr: z.number().int().nonnegative().optional(),
  clientRequirements: z.array(z.string().min(1)).optional(),
  constraints: z.array(z.string().min(1)).optional(),
});

export type MeetingStatus = z.infer<typeof MeetingStatusSchema>;
export type MeetingParticipant = z.infer<typeof MeetingParticipantSchema>;
export type Meeting = z.infer<typeof MeetingSchema>;
export type CreateMeetingRequest = z.infer<typeof CreateMeetingRequestSchema>;
export type UpdateMeetingRequest = z.infer<typeof UpdateMeetingRequestSchema>;
export type FinalizeMeetingRequest = z.infer<typeof FinalizeMeetingRequestSchema>;
