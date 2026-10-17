import { z } from "zod";

export const DocumentTypeSchema = z.enum(["pdf", "brief", "notes", "other"]);

export const DocumentSchema = z.object({
  id: z.string().min(1),
  meetingId: z.string().min(1),
  name: z.string().min(1),
  mimeType: z.string().min(1),
  type: DocumentTypeSchema.default("brief"),
  storageUri: z.string().optional(),
  summary: z.string().optional(),
  uploadedAt: z.string().datetime(),
});

export type DocumentType = z.infer<typeof DocumentTypeSchema>;
export type Document = z.infer<typeof DocumentSchema>;
