import { z } from "zod";

export const CampaignProposalSchema = z.object({
  id: z.string().min(1),
  meetingId: z.string().min(1),
  sessionId: z.string().min(1).optional(),
  brand: z.string().min(1),
  campaignTitle: z.string().min(1),
  tagline: z.string().optional(),
  targetAudience: z.string().optional(),
  keyMessages: z.array(z.string()).default([]),
  channels: z.array(z.string()).default([]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type CampaignProposal = z.infer<typeof CampaignProposalSchema>;
