import { z } from "zod";

export const MeetingStatusSchema = z.enum([
  "draft",
  "preparing",
  "ready",
  "completed",
]);

export const MeetingSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  brand: z.string().min(1),
  objective: z.string().optional(),
  status: MeetingStatusSchema.default("draft"),
  scheduledAt: z.string().datetime().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type MeetingStatus = z.infer<typeof MeetingStatusSchema>;
export type Meeting = z.infer<typeof MeetingSchema>;
