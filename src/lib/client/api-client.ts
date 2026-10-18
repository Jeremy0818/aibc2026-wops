import { getClientAuth } from "./firebase";
import {
  ApiErrorSchema,
  type ApiErrorCode,
  type ApiErrorDetail,
} from "@/contracts/error";

/**
 * Client API Request Utilities with Firebase Authentication
 *
 * Provides typed, authenticated HTTP request helpers for Live Mode.
 * - Retrieves fresh Firebase ID tokens automatically from the browser Auth SDK.
 * - Attaches `Authorization: Bearer <token>` to outbound requests.
 * - Parses API error envelopes without exposing credentials or tokens in console logs.
 */

export class WopsApiError extends Error {
  public readonly status: number;
  public readonly code: ApiErrorCode | "UNAUTHORIZED" | "FORBIDDEN" | "NETWORK_ERROR" | "SCHEMA_ERROR";
  public readonly details?: ApiErrorDetail[];
  public readonly requestId?: string;

  constructor(options: {
    message: string;
    status: number;
    code: ApiErrorCode | "UNAUTHORIZED" | "FORBIDDEN" | "NETWORK_ERROR" | "SCHEMA_ERROR";
    details?: ApiErrorDetail[];
    requestId?: string;
  }) {
    super(options.message);
    this.name = "WopsApiError";
    this.status = options.status;
    this.code = options.code;
    this.details = options.details;
    this.requestId = options.requestId;
  }
}

export async function parseApiErrorResponse(response: Response): Promise<WopsApiError> {
  try {
    const json: unknown = await response.json();
    const parsed = ApiErrorSchema.safeParse(json);
    if (parsed.success) {
      return new WopsApiError({
        message: parsed.data.error.message,
        status: response.status,
        code: parsed.data.error.code,
        details: parsed.data.error.details,
        requestId: parsed.data.error.requestId,
      });
    }

    // Handle standard unauthorized / forbidden shapes
    if (typeof json === "object" && json !== null && "error" in json) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const errObj = (json as any).error;
      if (errObj && typeof errObj.message === "string") {
        return new WopsApiError({
          message: errObj.message,
          status: response.status,
          code: response.status === 401 ? "UNAUTHORIZED" : response.status === 403 ? "FORBIDDEN" : "NETWORK_ERROR",
        });
      }
    }
  } catch {
    // Response body not JSON
  }

  if (response.status === 401) {
    return new WopsApiError({
      message: "Authentication required. Please sign in with Google.",
      status: 401,
      code: "UNAUTHORIZED",
    });
  }

  if (response.status === 403) {
    return new WopsApiError({
      message: "Access forbidden. You are not authorized for this resource.",
      status: 403,
      code: "FORBIDDEN",
    });
  }

  return new WopsApiError({
    message: `API request failed with HTTP ${response.status}`,
    status: response.status,
    code: "NETWORK_ERROR",
  });
}

/**
 * Authenticated Fetch:
 * Attaches the current user's Firebase ID token in `Authorization: Bearer <token>` header.
 * If user is not signed in and request is unauthenticated, sends without bearer token.
 */
export async function authenticatedFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
  explicitToken?: string | null
): Promise<Response> {
  const headers = new Headers(init?.headers);

  let token = explicitToken;
  if (!token && typeof window !== "undefined") {
    try {
      const auth = getClientAuth();
      if (auth?.currentUser) {
        token = await auth.currentUser.getIdToken();
      }
    } catch (e) {
      console.warn("[authenticatedFetch] Failed to retrieve fresh ID token:", e);
    }
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(input, {
    ...init,
    headers,
  });
}
