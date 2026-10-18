import {
  CreateSessionRequestSchema,
  AppendSessionEventRequestSchema,
  AdvanceStageRequestSchema,
  CompleteSessionRequestSchema,
  PreparationSessionSchema,
  LiveTokenResponseSchema,
  type CreateSessionRequest,
  type AppendSessionEventRequest,
  type AdvanceStageRequest,
  type CompleteSessionRequest,
  type PreparationSession,
  type LiveTokenResponse,
} from "@/contracts/session";
import { ApiErrorSchema } from "@/contracts/error";
import { isMockModeEnabled } from "./mock-meetings";
import {
  mockCreateSession,
  mockGetSession,
  mockGetLiveToken,
  mockAppendSessionEvent,
  mockAdvanceSessionStage,
  mockCompleteSession,
} from "./mock-sessions";

/**
 * Creates a role-aware AI preparation session for an assigned participant.
 * In Demo Mode, creates and persists a simulated session in localStorage.
 */
export async function createSession(
  input: CreateSessionRequest
): Promise<PreparationSession> {
  const validatedInput = CreateSessionRequestSchema.parse(input);

  if (isMockModeEnabled()) {
    return mockCreateSession(validatedInput);
  }

  const response = await fetch("/api/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(validatedInput),
  });

  const json: unknown = await response.json();
  if (!response.ok) {
    const parsedError = ApiErrorSchema.safeParse(json);
    if (parsedError.success) {
      throw new Error(parsedError.data.error.message);
    }
    throw new Error(`Failed to initialize session (${response.status})`);
  }

  const result = json as { session: unknown };
  return PreparationSessionSchema.parse(result.session);
}

/**
 * Retrieves the current session status, transcripts, and decisions.
 */
export async function getSession(
  sessionId: string
): Promise<PreparationSession> {
  if (!sessionId) throw new Error("Session ID is required");

  if (isMockModeEnabled()) {
    return mockGetSession(sessionId);
  }

  const response = await fetch(`/api/sessions/${encodeURIComponent(sessionId)}`);
  const json: unknown = await response.json();

  if (!response.ok) {
    const parsedError = ApiErrorSchema.safeParse(json);
    if (parsedError.success) {
      throw new Error(parsedError.data.error.message);
    }
    throw new Error(`Failed to load session (${response.status})`);
  }

  const result = json as { session: unknown };
  return PreparationSessionSchema.parse(result.session);
}

/**
 * Requests an ephemeral Gemini Live token for real-time WebRTC/WebSocket.
 * In Demo Mode, returns simulated token with expiration.
 */
export async function getLiveToken(
  sessionId: string
): Promise<LiveTokenResponse> {
  if (!sessionId) throw new Error("Session ID is required");

  if (isMockModeEnabled()) {
    return mockGetLiveToken(sessionId);
  }

  const response = await fetch(
    `/api/sessions/${encodeURIComponent(sessionId)}/live-token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    }
  );

  const json: unknown = await response.json();
  if (!response.ok) {
    const parsedError = ApiErrorSchema.safeParse(json);
    if (parsedError.success) {
      throw new Error(parsedError.data.error.message);
    }
    throw new Error(`Failed to obtain Live token (${response.status})`);
  }

  return LiveTokenResponseSchema.parse(json);
}

/**
 * Appends a transcript line or decision event to the session.
 */
export async function appendSessionEvent(
  sessionId: string,
  event: AppendSessionEventRequest
): Promise<PreparationSession> {
  const validatedEvent = AppendSessionEventRequestSchema.parse(event);

  if (isMockModeEnabled()) {
    return mockAppendSessionEvent(sessionId, validatedEvent);
  }

  const response = await fetch(
    `/api/sessions/${encodeURIComponent(sessionId)}/events`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validatedEvent),
    }
  );

  const json: unknown = await response.json();
  if (!response.ok) {
    const parsedError = ApiErrorSchema.safeParse(json);
    if (parsedError.success) {
      throw new Error(parsedError.data.error.message);
    }
    throw new Error(`Failed to append session event (${response.status})`);
  }

  const result = json as { session: unknown };
  return PreparationSessionSchema.parse(result.session);
}

/**
 * Advances the session stage (UNDERSTAND -> EXPLORE -> EVALUATE -> ALIGN).
 */
export async function advanceSessionStage(
  sessionId: string,
  request: AdvanceStageRequest
): Promise<PreparationSession> {
  const validated = AdvanceStageRequestSchema.parse(request);

  if (isMockModeEnabled()) {
    return mockAdvanceSessionStage(sessionId, validated);
  }

  const response = await fetch(
    `/api/sessions/${encodeURIComponent(sessionId)}/advance`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validated),
    }
  );

  const json: unknown = await response.json();
  if (!response.ok) {
    const parsedError = ApiErrorSchema.safeParse(json);
    if (parsedError.success) {
      throw new Error(parsedError.data.error.message);
    }
    throw new Error(`Failed to advance stage (${response.status})`);
  }

  const result = json as { session: unknown };
  return PreparationSessionSchema.parse(result.session);
}

/**
 * Concludes a preparation session.
 */
export async function completeSession(
  sessionId: string,
  request: CompleteSessionRequest
): Promise<PreparationSession> {
  const validated = CompleteSessionRequestSchema.parse(request);

  if (isMockModeEnabled()) {
    return mockCompleteSession(sessionId, validated);
  }

  const response = await fetch(
    `/api/sessions/${encodeURIComponent(sessionId)}/complete`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validated),
    }
  );

  const json: unknown = await response.json();
  if (!response.ok) {
    const parsedError = ApiErrorSchema.safeParse(json);
    if (parsedError.success) {
      throw new Error(parsedError.data.error.message);
    }
    throw new Error(`Failed to complete session (${response.status})`);
  }

  const result = json as { session: unknown };
  return PreparationSessionSchema.parse(result.session);
}
