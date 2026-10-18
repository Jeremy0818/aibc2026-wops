import { NextRequest, NextResponse } from "next/server";
import {
  CreateSessionRequestSchema,
  PreparationSessionSchema,
} from "@/contracts/session";
import { handleRouteError, WopsApiError } from "@/lib/server/api-error";
import {
  createPreparationSession,
  getMeetingById,
  updateMeeting,
} from "@/lib/server/store";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = CreateSessionRequestSchema.parse(body);

    const meeting = await getMeetingById(parsed.meetingId);
    if (!meeting) {
      throw new WopsApiError(
        "NOT_FOUND",
        `Meeting '${parsed.meetingId}' was not found`,
        404,
      );
    }

    const matchedParticipant = meeting.participants.find(
      (p) => p.id === parsed.participantId,
    );

    const participantRole =
      parsed.participantRole ??
      matchedParticipant?.role ??
      meeting.participantRole ??
      "Creative Campaign Planner";

    const participantName =
      parsed.participantName ??
      matchedParticipant?.name ??
      participantRole;

    const now = new Date().toISOString();
    const sessionId = `ses_${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}`;

    const session = await createPreparationSession(
      PreparationSessionSchema.parse({
        id: sessionId,
        meetingId: meeting.id,
        participantId: parsed.participantId,
        participantRole,
        participantName,
        currentStage: "UNDERSTAND",
        stageHistory: [
          {
            fromStage: null,
            toStage: "UNDERSTAND",
            transitionedAt: now,
            reason: "Session initialized",
          },
        ],
        transcripts: [],
        confirmedDecisions: [],
        openQuestions: [],
        selectedConceptId: null,
        status: "ringing",
        startedAt: now,
        updatedAt: now,
      }),
    );

    if (meeting.status !== "in_session") {
      await updateMeeting({
        ...meeting,
        status: "in_session",
      });
    }

    return NextResponse.json({ session }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
