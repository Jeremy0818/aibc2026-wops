import {
  CreateMeetingRequestSchema,
  type CreateMeetingRequest,
  type MeetingParticipant,
} from "@/contracts/meeting";
import type { DocumentMetadata } from "@/contracts/document";
import { MAX_PDF_FILE_SIZE_BYTES, validatePdfFile } from "./documents-api";

/* -------------------------------------------------------------------------- */
/*                               File formats                                 */
/* -------------------------------------------------------------------------- */

/** Formats the current upload boundary actually accepts (frontend-enforced). */
export const SUPPORTED_UPLOAD_FORMATS = [
  { label: "PDF", extension: ".pdf", mimeType: "application/pdf" },
] as const;

/**
 * Target product formats that are NOT supported yet. Listed so the UI can be
 * honest about them; files of these types are rejected, never renamed/converted.
 */
export const PLANNED_UPLOAD_FORMATS = [
  {
    label: "DOCX",
    extension: ".docx",
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  },
  {
    label: "PPTX",
    extension: ".pptx",
    mimeType:
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  },
] as const;

export const MAX_UPLOAD_SIZE_LABEL = `${Math.round(
  MAX_PDF_FILE_SIZE_BYTES / (1024 * 1024)
)} MB`;

export type FileClassification =
  | { accepted: true }
  | { accepted: false; reason: "planned_format" | "invalid"; message: string };

export function classifySelectedFile(file: File): FileClassification {
  const lowerName = file.name.toLowerCase();
  const planned = PLANNED_UPLOAD_FORMATS.find(
    (fmt) => lowerName.endsWith(fmt.extension) || file.type === fmt.mimeType
  );
  if (planned) {
    return {
      accepted: false,
      reason: "planned_format",
      message: `${planned.label} support is planned but not available yet. Please attach a PDF version of this document for now.`,
    };
  }

  const pdfCheck = validatePdfFile(file);
  if (!pdfCheck.valid) {
    return { accepted: false, reason: "invalid", message: pdfCheck.message };
  }
  return { accepted: true };
}

/** Stable-enough identity for duplicate detection within one selection session. */
export function fileFingerprint(file: File): string {
  return `${file.name}::${file.size}::${file.lastModified}`;
}

/* -------------------------------------------------------------------------- */
/*                          Local document queue                              */
/* -------------------------------------------------------------------------- */

export type QueuedFileStatus =
  | "queued" // selected locally, not sent yet
  | "rejected" // failed local validation (never sent)
  | "uploading"
  | "processing"
  | "ready"
  | "failed";

export interface QueuedFile {
  localId: string;
  fingerprint: string;
  file: File;
  status: QueuedFileStatus;
  message?: string;
  document?: DocumentMetadata;
}

/* -------------------------------------------------------------------------- */
/*                   Draft creation vs. the current contract                  */
/* -------------------------------------------------------------------------- */

/**
 * Fields the Team Lead legitimately owns on the Create Meeting screen.
 */
export interface TeamLeadDraftInput {
  title: string;
  clientName: string;
  projectName: string;
  scheduledAt: string; // ISO string or "" when invalid
  meetingObjective: string;
  leadRole: string;
  participants: MeetingParticipant[];
}

/**
 * Client-brief fields that belong to the uploaded documents in the
 * document-first product model. The frontend never asks the Team Lead to type
 * these and never fabricates values for them.
 */
export const DOCUMENT_DERIVED_FIELDS = [
  "clientObjective",
  "targetAudience",
  "budgetCeilingIdr",
  "clientRequirements",
  "constraints",
] as const;

export type DocumentDerivedField = (typeof DOCUMENT_DERIVED_FIELDS)[number];

export const DOCUMENT_DERIVED_FIELD_LABELS: Record<DocumentDerivedField, string> =
  {
    clientObjective: "Client objective",
    targetAudience: "Target audience",
    budgetCeilingIdr: "Budget ceiling (IDR)",
    clientRequirements: "Client requirements",
    constraints: "Constraints",
  };

export type DraftContractCheck =
  | { ok: true; request: CreateMeetingRequest }
  | {
      ok: false;
      /** Team Lead fields that need fixing (shown inline on the form). */
      fieldErrors: Record<string, string>;
      /** Document-derived fields the current contract still requires. */
      contractBlockers: DocumentDerivedField[];
    };

function isDocumentDerivedField(key: string): key is DocumentDerivedField {
  return (DOCUMENT_DERIVED_FIELDS as readonly string[]).includes(key);
}

/**
 * Builds a draft request from Team Lead inputs ONLY and validates it against
 * the real shared `CreateMeetingRequestSchema`.
 *
 * - `participantRole` is taken from the first assigned employee's role (a real
 *   Team Lead assignment, not a placeholder).
 * - Document-derived fields are omitted entirely. If the contract still
 *   requires them, they are reported as `contractBlockers`. Once Developer B
 *   relaxes the schema, this check passes without any frontend change.
 */
export function checkDraftAgainstContract(
  input: TeamLeadDraftInput
): DraftContractCheck {
  const candidate = {
    title: input.title.trim(),
    clientName: input.clientName.trim(),
    projectName: input.projectName.trim(),
    scheduledAt: input.scheduledAt,
    meetingObjective: input.meetingObjective.trim(),
    leadRole: input.leadRole.trim(),
    participantRole: input.participants[0]?.role.trim() ?? "",
    participants: input.participants,
  };

  const result = CreateMeetingRequestSchema.safeParse(candidate);
  if (result.success) {
    return { ok: true, request: result.data };
  }

  const fieldErrors: Record<string, string> = {};
  const blockers = new Set<DocumentDerivedField>();

  for (const issue of result.error.issues) {
    const rootKey = String(issue.path[0] ?? "form");
    if (isDocumentDerivedField(rootKey)) {
      blockers.add(rootKey);
      continue;
    }
    const pathKey = issue.path.join(".") || "form";
    if (rootKey === "participantRole") {
      fieldErrors.participants ??=
        "Assign at least one employee with a role so WOPS! knows who is preparing.";
      continue;
    }
    fieldErrors[pathKey] ??= issue.message;
    fieldErrors[rootKey] ??= issue.message;
  }

  if (!input.scheduledAt) {
    fieldErrors.scheduledAt = "Please pick a valid date and time for the meeting.";
  }

  return {
    ok: false,
    fieldErrors,
    contractBlockers: DOCUMENT_DERIVED_FIELDS.filter((f) => blockers.has(f)),
  };
}
