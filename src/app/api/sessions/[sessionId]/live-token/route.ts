import { NextRequest, NextResponse } from "next/server";
import { handleRouteError, WopsApiError } from "@/lib/server/api-error";
import { provisionLiveEphemeralToken } from "@/lib/server/gemini";
import {
  getMeetingById,
  getSessionById,
  listDocumentsByMeetingId,
  saveSession,
} from "@/lib/server/store";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = await params;
    let session = await getSessionById(sessionId);
    if (!session) {
      throw new WopsApiError(
        "NOT_FOUND",
        `Session '${sessionId}' was not found`,
        404,
      );
    }

    if (session.status === "completed" || session.status === "abandoned") {
      throw new WopsApiError(
        "CONFLICT",
        `Cannot provision a live token for a ${session.status} session`,
        409,
      );
    }

    const meeting = await getMeetingById(session.meetingId);
    if (!meeting) {
      throw new WopsApiError(
        "NOT_FOUND",
        `Associated meeting '${session.meetingId}' was not found`,
        404,
      );
    }

    if (session.status === "ringing") {
      session = await saveSession({
        ...session,
        status: "active",
      });
    }

    const documents = await listDocumentsByMeetingId(meeting.id);
    const keyFacts = documents.flatMap((doc) => doc.extractedFacts);

    const tokenPayload = await provisionLiveEphemeralToken({
      meeting,
      documents,
      keyFacts,
      session,
    });

    return NextResponse.json(tokenPayload, { status: 200 });
  } catch (error) {
    return handleRouteError(error);
  }
}
