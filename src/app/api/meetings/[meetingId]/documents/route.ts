import { connection, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/server/auth";
import { assertMeetingLead } from "@/lib/server/authorization";
import { errorResponse, handleRouteError } from "@/lib/server/api-response";
import { getMeetingById } from "@/lib/server/meetings";

interface RouteContext {
  params: Promise<{ meetingId: string }>;
}

/**
 * POST /api/meetings/{meetingId}/documents
 *
 * Sprint B2 Boundary: Real Cloud Storage upload and Gemini fact extraction
 * are scheduled for Sprint B3.
 *
 * In Sprint B2, this endpoint verifies meeting existence and Team Lead authorization,
 * then returns HTTP 409 Conflict indicating that document ingestion is not yet available.
 */
export async function POST(
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

    assertMeetingLead(
      {
        id: meetingId,
        teamLeadUserId: result.meeting.teamLeadUserId,
      },
      user.uid
    );

    return errorResponse(
      409,
      "CONFLICT",
      "Document ingestion is unavailable in Sprint B2. Cloud Storage upload and Gemini extraction will be enabled in Sprint B3."
    );
  } catch (error) {
    return handleRouteError(error, "Failed to process document upload");
  }
}
