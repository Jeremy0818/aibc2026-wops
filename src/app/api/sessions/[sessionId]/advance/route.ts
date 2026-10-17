import { NextRequest, NextResponse } from "next/server";
import { AdvanceStageRequestSchema } from "@/contracts/session";
import { handleRouteError, WopsApiError } from "@/lib/server/api-error";
import { getSessionById, saveSession } from "@/lib/server/store";
import { assertValidStageTransition } from "@/lib/skills";

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
        `Cannot advance stage on a ${session.status} session`,
        409,
      );
    }

    const body = await request.json();
    const parsed = AdvanceStageRequestSchema.parse(body);

    const transitionRecord = assertValidStageTransition(
      session.currentStage,
      parsed.targetStage,
      parsed.reason,
    );

    const updated = await saveSession({
      ...session,
      status: session.status === "ringing" ? "active" : session.status,
      currentStage: parsed.targetStage,
      stageHistory: [...session.stageHistory, transitionRecord],
    });

    return NextResponse.json({ session: updated }, { status: 200 });
  } catch (error) {
    return handleRouteError(error);
  }
}
