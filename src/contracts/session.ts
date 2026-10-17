import { z } from "zod";

export const SessionStatusSchema = z.enum([
  "idle",
  "active",
  "paused",
  "completed",
]);

export const PreparationSessionSchema = z.object({
  id: z.string().min(1),
  meetingId: z.string().min(1),
  status: SessionStatusSchema.default("idle"),
  currentStage: z.string().optional(),
  keyInsights: z.array(z.string()).default([]),
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime().optional(),
});

export type SessionStatus = z.infer<typeof SessionStatusSchema>;
export type PreparationSession = z.infer<typeof PreparationSessionSchema>;
