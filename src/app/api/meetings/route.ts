import { connection, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/server/auth";
import { errorResponse, handleRouteError } from "@/lib/server/api-response";
import {
  createMeetingDocument,
  listAccessibleMeetings,
} from "@/lib/server/meetings";
import { CreateMeetingRequestSchema } from "@/contracts/meeting";

/**
 * GET /api/meetings
 * Lists meetings accessible to the authenticated caller.
 */
export async function GET(request: Request): Promise<NextResponse> {
  await connection();
  try {
    const user = await authenticateRequest(request);
    const meetings = await listAccessibleMeetings(user.uid);
    return NextResponse.json({ meetings }, { status: 200 });
  } catch (error) {
    return handleRouteError(error, "Failed to list meetings");
  }
}

/**
 * POST /api/meetings
 * Creates a minimal meeting draft. Caller becomes verified teamLeadUserId.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const user = await authenticateRequest(request);

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return errorResponse(400, "BAD_REQUEST", "Malformed JSON body in request");
    }

    const validated = CreateMeetingRequestSchema.parse(rawBody);
    const meeting = await createMeetingDocument(validated, user);

    return NextResponse.json({ meeting }, { status: 201 });
  } catch (error) {
    return handleRouteError(error, "Failed to create meeting");
  }
}
