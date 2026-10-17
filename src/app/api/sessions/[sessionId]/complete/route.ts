import { NextRequest, NextResponse } from "next/server";
import { CompleteSessionRequestSchema } from "@/contracts/session";
import { handleRouteError, WopsApiError } from "@/lib/server/api-error";
import {
  getMeetingById,
  getSessionById,
  saveSession,
  updateMeeting,
} from "@/lib/server/store";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = await params;
    const session = await getSessionById(sessionId);
    if (!session) {
      throw new WopsApiError(
        "NOT_FOUND",
        `Session '${sessionId}' was not found`,
        404,
      );
    }

    if (session.status === "completed") {
      throw new WopsApiError(
        "CONFLICT",
        `Session '${sessionId}' is already completed`,
        409,
      );
    }

    let rawBody: unknown = {};
    try {
      const text = await request.text();
      if (text.trim().length > 0) {
        rawBody = JSON.parse(text);
      }
    } catch {
      throw new WopsApiError(
        "BAD_REQUEST",
        "Malformed JSON request body",
        400,
      );
    }

    const parsed = CompleteSessionRequestSchema.parse(rawBody);
    const now = new Date().toISOString();

    const updated = await saveSession({
      ...session,
      status: "completed",
      selectedConceptId:
        parsed.selectedConceptId !== undefined
          ? parsed.selectedConceptId
          : session.selectedConceptId,
      endedAt: now,
    });

    const meeting = await getMeetingById(session.meetingId);
    if (meeting && meeting.status !== "completed") {
      await updateMeeting({
        ...meeting,
        status: "completed",
      });
    }

    return NextResponse.json({ session: updated }, { status: 200 });
  } catch (error) {
    return handleRouteError(error);
  }
}
