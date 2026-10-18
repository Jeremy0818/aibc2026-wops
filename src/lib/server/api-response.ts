import "server-only";

import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AuthenticationError } from "./auth";
import type { ApiErrorCode, ApiErrorDetail } from "@/contracts/error";

export function errorResponse(
  status: number,
  code: ApiErrorCode,
  message: string,
  details?: ApiErrorDetail[],
  requestId?: string
): NextResponse {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        ...(details && details.length > 0 ? { details } : {}),
        ...(requestId ? { requestId } : {}),
        timestamp: new Date().toISOString(),
      },
    },
    { status }
  );
}

export function handleRouteError(error: unknown, fallbackMessage = "Internal Server Error"): NextResponse {
  if (error instanceof AuthenticationError) {
    const code: ApiErrorCode = error.status === 403 ? "FORBIDDEN" : "UNAUTHORIZED";
    return errorResponse(error.status, code, error.message);
  }

  if (error instanceof ZodError) {
    const details: ApiErrorDetail[] = error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));
    return errorResponse(422, "VALIDATION_ERROR", "Request validation failed", details);
  }

  const message = error instanceof Error ? error.message : fallbackMessage;
  console.error("[handleRouteError]", error);
  return errorResponse(500, "INTERNAL_ERROR", message);
}
