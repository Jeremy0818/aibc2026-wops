import { z } from "zod";
import { MeetingSchema } from "./meeting";

export const DocumentTypeSchema = z.enum(["pdf", "brief", "notes", "other"]);

export const DocumentProcessingStatusSchema = z.enum([
  "pending",
  "processing",
  "ready",
  "failed",
]);

export const DocumentFactSchema = z.object({
  id: z.string().min(1),
  statement: z.string().min(1),
  pageOrSection: z.string().optional(),
});

export const DocumentMetadataSchema = z.object({
  id: z.string().min(1),
  meetingId: z.string().min(1),
  name: z.string().min(1),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().nonnegative().optional(),
  type: DocumentTypeSchema.default("brief"),
  processingStatus: DocumentProcessingStatusSchema.default("pending"),
  storageUri: z.string().optional(),
  summary: z.string().optional(),
  extractedFacts: z.array(DocumentFactSchema).default([]),
  errorMessage: z.string().optional(),
  uploadedAt: z.string().datetime(),
  processedAt: z.string().datetime().optional(),
});

export const DocumentSchema = DocumentMetadataSchema;

export const MeetingContextResponseSchema = z.object({
  meeting: MeetingSchema,
  documents: z.array(DocumentMetadataSchema),
  synthesizedBrief: z.string().optional(),
  keyFacts: z.array(DocumentFactSchema).default([]),
});

export type DocumentType = z.infer<typeof DocumentTypeSchema>;
export type DocumentProcessingStatus = z.infer<
  typeof DocumentProcessingStatusSchema
>;
export type DocumentFact = z.infer<typeof DocumentFactSchema>;
export type DocumentMetadata = z.infer<typeof DocumentMetadataSchema>;
export type Document = z.infer<typeof DocumentSchema>;
export type MeetingContextResponse = z.infer<
  typeof MeetingContextResponseSchema
>;
