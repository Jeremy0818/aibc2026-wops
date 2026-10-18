import { z } from "zod";
import {
  CreateDocumentFactRequestSchema,
  DocumentFactSchema,
  DocumentMetadataSchema,
  DocumentTypeSchema,
  MeetingContextResponseSchema,
  UpdateDocumentFactRequestSchema,
  type CreateDocumentFactRequest,
  type DocumentFact,
  type DocumentMetadata,
  type DocumentType,
  type MeetingContextResponse,
  type UpdateDocumentFactRequest,
} from "@/contracts/document";
import { ApiErrorSchema } from "@/contracts/error";
import { authenticatedFetch } from "./api-client";
import { WopsApiClientError } from "./meetings-api";
import {
  isMockModeEnabled,
  mockCreateDocumentFact,
  mockGetMeetingContext,
  mockUpdateDocumentFact,
  mockUploadMeetingDocument,
} from "./mock-meetings";
import {
  isDevLiveContextBridgeActive,
  getDevLiveContextFixture,
} from "./dev-context-bridge";

export const MAX_PDF_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB limit

export const UploadDocumentResponseSchema = z.object({
  document: DocumentMetadataSchema,
});

const CreateFactResponseSchema = z.object({
  fact: DocumentFactSchema,
});

const UpdateFactResponseSchema = z.object({
  fact: DocumentFactSchema,
});

export function validatePdfFile(
  file: File
): { valid: true } | { valid: false; message: string } {
  const isPdfMime = file.type === "application/pdf";
  const isPdfName = file.name.toLowerCase().endsWith(".pdf");

  if (!isPdfMime && !isPdfName) {
    return {
      valid: false,
      message: "Please choose a PDF file (.pdf). Other file formats aren't supported yet.",
    };
  }

  if (file.size <= 0) {
    return {
      valid: false,
      message: "This PDF file appears to be empty (0 bytes). Please choose a valid PDF brief.",
    };
  }

  if (file.size > MAX_PDF_FILE_SIZE_BYTES) {
    return {
      valid: false,
      message: "This PDF is larger than the 10 MB limit. Please upload a smaller brief.",
    };
  }

  return { valid: true };
}

async function parseErrorResponse(
  response: Response
): Promise<WopsApiClientError> {
  try {
    const json: unknown = await response.json();
    const parsedError = ApiErrorSchema.safeParse(json);
    if (parsedError.success) {
      return new WopsApiClientError({
        message: parsedError.data.error.message,
        status: response.status,
        code: parsedError.data.error.code,
        details: parsedError.data.error.details,
        requestId: parsedError.data.error.requestId,
      });
    }
  } catch {
    // Non-JSON response
  }

  if (response.status === 404) {
    return new WopsApiClientError({
      message: `Endpoint or meeting not found (HTTP 404: ${response.url}). While the backend route is in progress, switch to Demo mode to test PDF upload and grounding.`,
      status: 404,
      code: "NOT_FOUND",
    });
  }

  return new WopsApiClientError({
    message: `Request failed with HTTP ${response.status} (${
      response.statusText || "Error"
    })`,
    status: response.status,
    code: "INTERNAL_ERROR",
  });
}

/**
 * POST /api/meetings/{meetingId}/documents
 * Uploads a client PDF brief via multipart/form-data.
 */
export async function uploadMeetingDocument(
  meetingId: string,
  file: File,
  options?: {
    type?: DocumentType;
    simulateOutcome?: "ready" | "failed" | "empty_facts";
    onStatusUpdate?: (doc: DocumentMetadata) => void;
  }
): Promise<DocumentMetadata> {
  const trimmedMeetingId = meetingId.trim();
  if (!trimmedMeetingId) {
    throw new WopsApiClientError({
      message: "Meeting ID is required to upload a document.",
      status: 400,
      code: "BAD_REQUEST",
    });
  }

  const fileCheck = validatePdfFile(file);
  if (!fileCheck.valid) {
    throw new WopsApiClientError({
      message: fileCheck.message,
      status: 422,
      code: "VALIDATION_ERROR",
      details: [{ field: "file", message: fileCheck.message }],
    });
  }

  const docType: DocumentType = options?.type
    ? DocumentTypeSchema.parse(options.type)
    : "brief";

  if (isMockModeEnabled()) {
    try {
      return await mockUploadMeetingDocument(
        trimmedMeetingId,
        {
          name: file.name,
          size: file.size,
          type: file.type || "application/pdf",
        },
        {
          documentType: docType,
          simulateOutcome: options?.simulateOutcome,
          onStatusUpdate: options?.onStatusUpdate,
        }
      );
    } catch (err) {
      throw new WopsApiClientError({
        message:
          err instanceof Error
            ? err.message
            : "Failed to upload document in Demo mode.",
        status: 404,
        code: "NOT_FOUND",
      });
    }
  }

  // Sprint B2 Live Mode Boundary:
  // Real document ingestion and Cloud Storage uploads are scheduled for Sprint B3.
  // Fails fast with 409 CONFLICT without firing unnecessary or unsupported network requests.
  throw new WopsApiClientError({
    message:
      "Document ingestion is unavailable in Sprint B2. Cloud Storage upload and Gemini extraction will be enabled in Sprint B3.",
    status: 409,
    code: "CONFLICT",
  });
}

/**
 * PATCH /api/meetings/{meetingId}/facts/{factId}
 * Contract V2: Corrects or confirms an extracted fact during review.
 */
export async function updateDocumentFact(
  meetingId: string,
  factId: string,
  input: UpdateDocumentFactRequest
): Promise<DocumentFact> {
  const trimmedMeetingId = meetingId.trim();
  const trimmedFactId = factId.trim();
  if (!trimmedMeetingId || !trimmedFactId) {
    throw new WopsApiClientError({
      message: "Meeting ID and Fact ID are required to update a fact.",
      status: 400,
      code: "BAD_REQUEST",
    });
  }

  const payload = UpdateDocumentFactRequestSchema.parse(input);

  if (isMockModeEnabled()) {
    return mockUpdateDocumentFact(trimmedMeetingId, trimmedFactId, payload);
  }

  let response: Response;
  try {
    response = await fetch(
      `/api/meetings/${encodeURIComponent(trimmedMeetingId)}/facts/${encodeURIComponent(trimmedFactId)}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      }
    );
  } catch (err) {
    throw new WopsApiClientError({
      message:
        err instanceof Error
          ? `Network error while updating fact: ${err.message}`
          : "Network error while updating fact",
      status: 0,
      code: "NETWORK_ERROR",
    });
  }

  if (!response.ok) {
    throw await parseErrorResponse(response);
  }

  const rawJson: unknown = await response.json();
  const parsed = UpdateFactResponseSchema.safeParse(rawJson);
  if (!parsed.success) {
    throw new WopsApiClientError({
      message: `Invalid response schema from PATCH /api/meetings/${trimmedMeetingId}/facts/${trimmedFactId}`,
      status: response.status,
      code: "SCHEMA_ERROR",
      details: parsed.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  return parsed.data.fact;
}

/**
 * POST /api/meetings/{meetingId}/facts
 * Contract V2: Adds new Team Lead information not found in any client document.
 */
export async function createDocumentFact(
  meetingId: string,
  input: CreateDocumentFactRequest
): Promise<DocumentFact> {
  const trimmedMeetingId = meetingId.trim();
  if (!trimmedMeetingId) {
    throw new WopsApiClientError({
      message: "Meeting ID is required to add a fact.",
      status: 400,
      code: "BAD_REQUEST",
    });
  }

  const payload = CreateDocumentFactRequestSchema.parse(input);

  if (isMockModeEnabled()) {
    return mockCreateDocumentFact(trimmedMeetingId, payload);
  }

  let response: Response;
  try {
    response = await fetch(
      `/api/meetings/${encodeURIComponent(trimmedMeetingId)}/facts`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      }
    );
  } catch (err) {
    throw new WopsApiClientError({
      message:
        err instanceof Error
          ? `Network error while adding fact: ${err.message}`
          : "Network error while adding fact",
      status: 0,
      code: "NETWORK_ERROR",
    });
  }

  if (!response.ok) {
    throw await parseErrorResponse(response);
  }

  const rawJson: unknown = await response.json();
  const parsed = CreateFactResponseSchema.safeParse(rawJson);
  if (!parsed.success) {
    throw new WopsApiClientError({
      message: `Invalid response schema from POST /api/meetings/${trimmedMeetingId}/facts`,
      status: response.status,
      code: "SCHEMA_ERROR",
      details: parsed.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  return parsed.data.fact;
}

/**
 * GET /api/meetings/{meetingId}/context
 * Fetches combined meeting specification, uploaded document metadata, synthesized brief, and keyFacts.
 */
export async function getMeetingContext(
  meetingId: string
): Promise<MeetingContextResponse> {
  const trimmedMeetingId = meetingId.trim();
  if (!trimmedMeetingId) {
    throw new WopsApiClientError({
      message: "Meeting ID is required to fetch context.",
      status: 400,
      code: "BAD_REQUEST",
    });
  }

  if (isMockModeEnabled()) {
    const mockContext = await mockGetMeetingContext(trimmedMeetingId);
    if (!mockContext) {
      throw new WopsApiClientError({
        message: `Meeting "${trimmedMeetingId}" was not found in Demo mode storage.`,
        status: 404,
        code: "NOT_FOUND",
      });
    }
    return mockContext;
  }

  // Development-Only Context Bridge (Active only in development with explicit testing flag for KOVA fixture)
  if (isDevLiveContextBridgeActive(trimmedMeetingId)) {
    return getDevLiveContextFixture(trimmedMeetingId);
  }

  let response: Response;
  try {
    response = await authenticatedFetch(
      `/api/meetings/${encodeURIComponent(trimmedMeetingId)}/context`,
      {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      }
    );
  } catch (err) {
    throw new WopsApiClientError({
      message:
        err instanceof Error
          ? `Network error while fetching /api/meetings/${trimmedMeetingId}/context: ${err.message}`
          : `Network error while fetching /api/meetings/${trimmedMeetingId}/context`,
      status: 0,
      code: "NETWORK_ERROR",
    });
  }

  if (!response.ok) {
    throw await parseErrorResponse(response);
  }

  const rawJson: unknown = await response.json();
  const parsed = MeetingContextResponseSchema.safeParse(rawJson);
  if (!parsed.success) {
    throw new WopsApiClientError({
      message: `Invalid response schema from GET /api/meetings/${trimmedMeetingId}/context`,
      status: response.status,
      code: "SCHEMA_ERROR",
      details: parsed.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  return parsed.data;
}
