import { z } from "zod";
import {
  ApiErrorSchema,
  type ApiErrorCode,
  type ApiErrorDetail,
} from "@/contracts/error";
import {
  CreateMeetingRequestSchema,
  FinalizeMeetingRequestSchema,
  MeetingSchema,
  type CreateMeetingRequest,
  type FinalizeMeetingRequest,
  type Meeting,
} from "@/contracts/meeting";
import {
  isMockModeEnabled,
  mockCreateMeeting,
  mockFinalizeMeeting,
  mockGetMeetingById,
  mockListMeetings,
} from "./mock-meetings";
import {
  isDevLiveContextBridgeActive,
  getDevLiveMeetingFixture,
} from "./dev-context-bridge";

const ListMeetingsResponseSchema = z.object({
  meetings: z.array(MeetingSchema),
});

const SingleMeetingResponseSchema = z.object({
  meeting: MeetingSchema,
});

export class WopsApiClientError extends Error {
  public readonly status: number;
  public readonly code: ApiErrorCode | "NETWORK_ERROR" | "SCHEMA_ERROR";
  public readonly details?: ApiErrorDetail[];
  public readonly requestId?: string;

  constructor(options: {
    message: string;
    status: number;
    code: ApiErrorCode | "NETWORK_ERROR" | "SCHEMA_ERROR";
    details?: ApiErrorDetail[];
    requestId?: string;
  }) {
    super(options.message);
    this.name = "WopsApiClientError";
    this.status = options.status;
    this.code = options.code;
    this.details = options.details;
    this.requestId = options.requestId;
  }
}

async function parseErrorResponse(response: Response): Promise<WopsApiClientError> {
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
    // Response was not valid JSON
  }

  if (response.status === 404) {
    return new WopsApiClientError({
      message: `API endpoint or resource not found (HTTP 404: ${response.url}). If the backend route is not yet implemented, enable Mock Mode specifically for local development.`,
      status: 404,
      code: "NOT_FOUND",
    });
  }

  return new WopsApiClientError({
    message: `API request failed with HTTP ${response.status} (${response.statusText || "Error"})`,
    status: response.status,
    code: "INTERNAL_ERROR",
  });
}

/**
 * GET /api/meetings
 * Returns all meetings ordered by schedule/creation time.
 */
export async function listMeetings(): Promise<Meeting[]> {
  if (isMockModeEnabled()) {
    return mockListMeetings();
  }

  let response: Response;
  try {
    response = await fetch("/api/meetings", {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
  } catch (err) {
    throw new WopsApiClientError({
      message:
        err instanceof Error
          ? `Network error while fetching /api/meetings: ${err.message}`
          : "Network error while fetching /api/meetings",
      status: 0,
      code: "NETWORK_ERROR",
    });
  }

  if (!response.ok) {
    throw await parseErrorResponse(response);
  }

  const rawJson: unknown = await response.json();
  const parsed = ListMeetingsResponseSchema.safeParse(rawJson);
  if (!parsed.success) {
    throw new WopsApiClientError({
      message: "Invalid response schema from GET /api/meetings",
      status: response.status,
      code: "SCHEMA_ERROR",
      details: parsed.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  return parsed.data.meetings;
}

/**
 * POST /api/meetings
 * Contract V2: Creates a minimal meeting draft.
 */
export async function createMeeting(
  input: CreateMeetingRequest
): Promise<Meeting> {
  const validation = CreateMeetingRequestSchema.safeParse(input);
  if (!validation.success) {
    throw new WopsApiClientError({
      message: "Meeting form validation failed before request submission",
      status: 422,
      code: "VALIDATION_ERROR",
      details: validation.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  if (isMockModeEnabled()) {
    return mockCreateMeeting(validation.data);
  }

  let response: Response;
  try {
    response = await fetch("/api/meetings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(validation.data),
    });
  } catch (err) {
    throw new WopsApiClientError({
      message:
        err instanceof Error
          ? `Network error while calling POST /api/meetings: ${err.message}`
          : "Network error while calling POST /api/meetings",
      status: 0,
      code: "NETWORK_ERROR",
    });
  }

  if (!response.ok) {
    throw await parseErrorResponse(response);
  }

  const rawJson: unknown = await response.json();
  const parsed = SingleMeetingResponseSchema.safeParse(rawJson);
  if (!parsed.success) {
    throw new WopsApiClientError({
      message: "Invalid response schema from POST /api/meetings",
      status: response.status,
      code: "SCHEMA_ERROR",
      details: parsed.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  return parsed.data.meeting;
}

/**
 * GET /api/meetings/{meetingId}
 */
export async function getMeetingById(meetingId: string): Promise<Meeting> {
  const trimmedId = meetingId.trim();
  if (!trimmedId) {
    throw new WopsApiClientError({
      message: "Meeting ID is required",
      status: 400,
      code: "BAD_REQUEST",
    });
  }

  if (isMockModeEnabled()) {
    const mockMeeting = await mockGetMeetingById(trimmedId);
    if (!mockMeeting) {
      throw new WopsApiClientError({
        message: `Meeting "${trimmedId}" was not found in Mock Mode storage.`,
        status: 404,
        code: "NOT_FOUND",
      });
    }
    return mockMeeting;
  }

  // Development-Only Context Bridge (Active only in development with explicit testing flag for KOVA fixture)
  if (isDevLiveContextBridgeActive(trimmedId)) {
    return getDevLiveMeetingFixture(trimmedId);
  }

  let response: Response;
  try {
    response = await fetch(
      `/api/meetings/${encodeURIComponent(trimmedId)}`,
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
          ? `Network error while fetching /api/meetings/${trimmedId}: ${err.message}`
          : `Network error while fetching /api/meetings/${trimmedId}`,
      status: 0,
      code: "NETWORK_ERROR",
    });
  }

  if (!response.ok) {
    throw await parseErrorResponse(response);
  }

  const rawJson: unknown = await response.json();
  const parsed = SingleMeetingResponseSchema.safeParse(rawJson);
  if (!parsed.success) {
    throw new WopsApiClientError({
      message: `Invalid response schema from GET /api/meetings/${trimmedId}`,
      status: response.status,
      code: "SCHEMA_ERROR",
      details: parsed.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  return parsed.data.meeting;
}

/**
 * POST /api/meetings/{meetingId}/finalize
 * Contract V2: Finalizes meeting setup and marks it ready for employee preparation.
 */
export async function finalizeMeeting(
  meetingId: string,
  input?: FinalizeMeetingRequest
): Promise<Meeting> {
  const trimmedId = meetingId.trim();
  if (!trimmedId) {
    throw new WopsApiClientError({
      message: "Meeting ID is required to finalize setup",
      status: 400,
      code: "BAD_REQUEST",
    });
  }

  const payload = input ? FinalizeMeetingRequestSchema.parse(input) : {};

  if (isMockModeEnabled()) {
    return mockFinalizeMeeting(trimmedId, payload);
  }

  let response: Response;
  try {
    response = await fetch(
      `/api/meetings/${encodeURIComponent(trimmedId)}/finalize`,
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
          ? `Network error while finalizing /api/meetings/${trimmedId}: ${err.message}`
          : `Network error while finalizing /api/meetings/${trimmedId}`,
      status: 0,
      code: "NETWORK_ERROR",
    });
  }

  if (!response.ok) {
    throw await parseErrorResponse(response);
  }

  const rawJson: unknown = await response.json();
  const parsed = SingleMeetingResponseSchema.safeParse(rawJson);
  if (!parsed.success) {
    throw new WopsApiClientError({
      message: `Invalid response schema from POST /api/meetings/${trimmedId}/finalize`,
      status: response.status,
      code: "SCHEMA_ERROR",
      details: parsed.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  return parsed.data.meeting;
}
