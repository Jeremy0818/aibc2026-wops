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

export const MeetingSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  clientName: z.string().min(1),
  projectName: z.string().min(1),
  scheduledAt: z.string().datetime(),
  meetingObjective: z.string().min(1),
  clientObjective: z.string().min(1),
  clientRequirements: z.array(z.string().min(1)).default([]),
  targetAudience: z.string().min(1),
  constraints: z.array(z.string().min(1)).default([]),
  budgetCeilingIdr: z.number().int().nonnegative(),
  participantRole: z.string().min(1),
  leadRole: z.string().min(1),
  participants: z.array(MeetingParticipantSchema).default([]),
  status: MeetingStatusSchema.default("draft"),
  documentIds: z.array(z.string().min(1)).default([]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const CreateMeetingRequestSchema = z.object({
  title: z.string().min(1),
  clientName: z.string().min(1),
  projectName: z.string().min(1),
  scheduledAt: z.string().datetime(),
  meetingObjective: z.string().min(1),
  clientObjective: z.string().min(1),
  clientRequirements: z.array(z.string().min(1)).default([]),
  targetAudience: z.string().min(1),
  constraints: z.array(z.string().min(1)).default([]),
  budgetCeilingIdr: z.number().int().nonnegative(),
  participantRole: z.string().min(1),
  leadRole: z.string().min(1),
  participants: z.array(MeetingParticipantSchema).default([]),
});

export type MeetingStatus = z.infer<typeof MeetingStatusSchema>;
export type MeetingParticipant = z.infer<typeof MeetingParticipantSchema>;
export type Meeting = z.infer<typeof MeetingSchema>;
export type CreateMeetingRequest = z.infer<typeof CreateMeetingRequestSchema>;
