import { NextRequest, NextResponse } from "next/server";
import {
  AppendSessionEventRequestSchema,
  DecisionEventSchema,
  TranscriptEventSchema,
} from "@/contracts/session";
import { handleRouteError, WopsApiError } from "@/lib/server/api-error";
import { getSessionById, saveSession } from "@/lib/server/store";

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

    if (session.status === "completed" || session.status === "abandoned") {
      throw new WopsApiError(
        "CONFLICT",
        `Cannot append events to a ${session.status} session`,
        409,
      );
    }

    const body = await request.json();
    const parsed = AppendSessionEventRequestSchema.parse(body);

    const nextStatus = session.status === "ringing" ? "active" : session.status;

    if (parsed.type === "transcript") {
      const transcriptEvent = TranscriptEventSchema.parse({
        ...parsed.event,
        id:
          parsed.event.id ??
          `trn_${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}`,
        sessionId: session.id,
      });

      const updated = await saveSession({
        ...session,
        status: nextStatus,
        transcripts: [...session.transcripts, transcriptEvent],
      });
      return NextResponse.json({ session: updated }, { status: 200 });
    }

    if (parsed.type === "decision") {
      const decisionEvent = DecisionEventSchema.parse({
        ...parsed.event,
        id:
          parsed.event.id ??
          `dec_${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}`,
        sessionId: session.id,
      });

      const updated = await saveSession({
        ...session,
        status: nextStatus,
        confirmedDecisions: [...session.confirmedDecisions, decisionEvent],
      });
      return NextResponse.json({ session: updated }, { status: 200 });
    }

    if (parsed.type === "open_question") {
      const openQuestions = session.openQuestions.includes(parsed.question)
        ? session.openQuestions
        : [...session.openQuestions, parsed.question];

      const updated = await saveSession({
        ...session,
        status: nextStatus,
        openQuestions,
      });
      return NextResponse.json({ session: updated }, { status: 200 });
    }

    const updated = await saveSession({
      ...session,
      status: nextStatus,
      selectedConceptId: parsed.selectedConceptId,
    });
    return NextResponse.json({ session: updated }, { status: 200 });
  } catch (error) {
    return handleRouteError(error);
  }
}
