import { connection, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/server/auth";
import { errorResponse, handleRouteError } from "@/lib/server/api-response";
import {
  getMeetingById,
  updateMeetingDocument,
} from "@/lib/server/meetings";
import { UpdateMeetingRequestSchema } from "@/contracts/meeting";

interface RouteContext {
  params: Promise<{ meetingId: string }>;
}

/**
 * GET /api/meetings/{meetingId}
 * Returns meeting details if caller is the Team Lead or an assigned participant.
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

    return NextResponse.json({ meeting: result.meeting }, { status: 200 });
  } catch (error) {
    return handleRouteError(error, "Failed to retrieve meeting");
  }
}

/**
 * PATCH /api/meetings/{meetingId}
 * Updates meeting details. Restricted strictly to the authorized Team Lead.
 */
export async function PATCH(
  request: Request,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const user = await authenticateRequest(request);
    const { meetingId } = await context.params;

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return errorResponse(400, "BAD_REQUEST", "Malformed JSON body in request");
    }

    const validated = UpdateMeetingRequestSchema.parse(rawBody);
    const updated = await updateMeetingDocument(meetingId, validated, user.uid);

    if (!updated) {
      return errorResponse(
        404,
        "NOT_FOUND",
        `Meeting with ID "${meetingId}" was not found.`
      );
    }

    return NextResponse.json({ meeting: updated }, { status: 200 });
  } catch (error) {
    return handleRouteError(error, "Failed to update meeting");
  }
}
