import { connection, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/server/auth";
import { errorResponse, handleRouteError } from "@/lib/server/api-response";
import { getMeetingById } from "@/lib/server/meetings";

interface RouteContext {
  params: Promise<{ meetingId: string }>;
}

/**
 * GET /api/meetings/{meetingId}/context
 *
 * Sprint B2 Boundary: Unified document context and grounded facts
 * are scheduled for Sprint B3.
 *
 * In Sprint B2, this endpoint verifies meeting existence and membership authorization,
 * then returns HTTP 404 Not Found indicating that shared document context is not yet available.
 */
export async function GET(
  request: Request,
  context: RouteContext
): Promise<NextResponse> {
  await connection();
  try {
    const user = await authenticateRequest(request);
    const { meetingId } = await context.params;

    const result = await getMeetingById(meetingId, user.uid);
    if (!result) {
      return errorResponse(
        404,
        "NOT_FOUND",
        `Meeting with ID "${meetingId}" was not found.`
      );
    }

    return errorResponse(
      404,
      "NOT_FOUND",
      `Shared document context for meeting "${meetingId}" is not available yet. Grounded document extraction arrives in Sprint B3.`
    );
  } catch (error) {
    return handleRouteError(error, "Failed to retrieve meeting context");
  }
}
