import { NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  ApiErrorCode,
  ApiErrorDetail,
  ApiErrorSchema,
} from "@/contracts/error";

export class WopsApiError extends Error {
  public readonly code: ApiErrorCode;
  public readonly status: number;
  public readonly details?: ApiErrorDetail[];

  constructor(
    code: ApiErrorCode,
    message: string,
    status: number,
    details?: ApiErrorDetail[],
  ) {
    super(message);
    this.name = "WopsApiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function createErrorResponse(
  code: ApiErrorCode,
  message: string,
  status: number,
  details?: ApiErrorDetail[],
): NextResponse {
  const payload = ApiErrorSchema.parse({
    error: {
      code,
      message,
      ...(details && details.length > 0 ? { details } : {}),
      requestId: `req_${ crypto.randomUUID().replace(/-/g, "").slice(0, 16) }`,
      timestamp: new Date().toISOString(),
    },
  });

  return NextResponse.json(payload, { status });
}

export function formatZodDetails(error: ZodError): ApiErrorDetail[] {
  return error.issues.map((issue) => ({
    field: issue.path.length > 0 ? issue.path.join(".") : undefined,
    message: issue.message,
  }));
}

export function handleRouteError(error: unknown): NextResponse {
  if (error instanceof WopsApiError) {
    return createErrorResponse(
      error.code,
      error.message,
      error.status,
      error.details,
    );
  }

  if (error instanceof ZodError) {
    return createErrorResponse(
      "VALIDATION_ERROR",
      "Invalid request payload",
      422,
      formatZodDetails(error),
    );
  }

  if (error instanceof SyntaxError) {
    return createErrorResponse(
      "BAD_REQUEST",
      "Malformed JSON request body",
      400,
    );
  }

  const message =
    error instanceof Error ? error.message : "Unexpected server error";
  return createErrorResponse("INTERNAL_ERROR", message, 500);
}
