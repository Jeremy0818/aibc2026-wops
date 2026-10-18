import {
  GenerateProposalRequestSchema,
  PreparationProposalSchema,
  type GenerateProposalRequest,
  type PreparationProposal,
} from "@/contracts/proposal";
import { ApiErrorSchema } from "@/contracts/error";
import { isMockModeEnabled } from "./mock-meetings";
import {
  mockGenerateProposal,
  mockGetProposal,
  mockListProposalsForParticipant,
} from "./mock-proposals";
import type { PreparationSession } from "@/contracts/session";
import { z } from "zod";

/**
 * Synthesizes or retrieves the individual preparation proposal for a completed session.
 * In Demo Mode, generates deterministic output grounded in the approved KOVA brief.
 */
export async function generateProposalForSession(
  sessionId: string,
  request?: GenerateProposalRequest,
  session?: PreparationSession
): Promise<PreparationProposal> {
  const validatedReq = request
    ? GenerateProposalRequestSchema.parse(request)
    : undefined;

  if (isMockModeEnabled()) {
    return mockGenerateProposal(sessionId, validatedReq, session);
  }

  const response = await fetch(`/api/sessions/${sessionId}/proposal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(validatedReq ?? {}),
  });

  const json: unknown = await response.json();
  if (!response.ok) {
    const parsedError = ApiErrorSchema.safeParse(json);
    if (parsedError.success) {
      throw new Error(parsedError.data.error.message);
    }
    throw new Error(`Failed to generate preparation proposal (${response.status})`);
  }

  const result = json as { proposal: unknown };
  return PreparationProposalSchema.parse(result.proposal);
}

/**
 * Retrieves a single individual preparation proposal by its ID.
 */
export async function getProposal(
  proposalId: string
): Promise<PreparationProposal> {
  if (!proposalId) {
    throw new Error("Cannot get proposal: No proposalId provided.");
  }

  if (isMockModeEnabled()) {
    const found = mockGetProposal(proposalId);
    if (!found) {
      throw new Error(`Preparation proposal "${proposalId}" was not found.`);
    }
    return found;
  }

  const response = await fetch(`/api/proposals/${proposalId}`);
  const json: unknown = await response.json();
  if (!response.ok) {
    const parsedError = ApiErrorSchema.safeParse(json);
    if (parsedError.success) {
      throw new Error(parsedError.data.error.message);
    }
    throw new Error(`Failed to fetch proposal (${response.status})`);
  }

  const result = json as { proposal: unknown };
  return PreparationProposalSchema.parse(result.proposal);
}

export interface ListProposalsParams {
  participantId?: string;
  meetingId?: string;
}

/**
 * Lists individual preparation proposals for the authenticated employee.
 * In Demo Mode, filters by the selected demo participantId to preserve privacy.
 */
export async function listProposals(
  params?: ListProposalsParams
): Promise<PreparationProposal[]> {
  if (isMockModeEnabled()) {
    return mockListProposalsForParticipant(
      params?.participantId,
      params?.meetingId
    );
  }

  const query = new URLSearchParams();
  if (params?.participantId) {
    query.set("participantId", params.participantId);
  }
  if (params?.meetingId) {
    query.set("meetingId", params.meetingId);
  }

  const url = `/api/proposals${query.toString() ? `?${query.toString()}` : ""}`;
  const response = await fetch(url);
  const json: unknown = await response.json();

  if (!response.ok) {
    const parsedError = ApiErrorSchema.safeParse(json);
    if (parsedError.success) {
      throw new Error(parsedError.data.error.message);
    }
    throw new Error(`Failed to list proposals (${response.status})`);
  }

  const result = json as { proposals: unknown };
  return z.array(PreparationProposalSchema).parse(result.proposals);
}
