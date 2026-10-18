import { NextRequest, NextResponse } from "next/server";
import { FinalizeMeetingRequestSchema } from "@/contracts/meeting";
import { handleRouteError, WopsApiError } from "@/lib/server/api-error";
import {
  getMeetingById,
  listDocumentsByMeetingId,
  updateMeeting,
} from "@/lib/server/store";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ meetingId: string }> },
) {
  try {
    const { meetingId } = await params;
    const meeting = await getMeetingById(meetingId);
    if (!meeting) {
      throw new WopsApiError(
        "NOT_FOUND",
        `Meeting '${meetingId}' was not found`,
        404,
      );
    }

    const docs = await listDocumentsByMeetingId(meetingId);
    if (docs.length === 0) {
      throw new WopsApiError(
        "UNPROCESSABLE_ENTITY",
        "Cannot finalize meeting setup before at least one document or brief fact is attached",
        422,
      );
    }

    const isProcessing = docs.some(
      (d) =>
        d.processingStatus === "pending" ||
        d.processingStatus === "processing",
    );
    if (isProcessing) {
      throw new WopsApiError(
        "CONFLICT",
        "Cannot finalize meeting while document extraction is still in progress",
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

    const parsed = FinalizeMeetingRequestSchema.parse(rawBody);
    const now = new Date().toISOString();

    const finalizedMeeting = await updateMeeting({
      ...meeting,
      clientObjective:
        parsed.clientObjective ??
        meeting.clientObjective ??
        `Drive high-impact launch trial for ${meeting.clientName} (${meeting.projectName}) with clear, grounded messaging.`,
      targetAudience:
        parsed.targetAudience ??
        meeting.targetAudience ??
        "Indonesian urban Gen Z and young millennial commuters (ages 20-32)",
      budgetCeilingIdr:
        parsed.budgetCeilingIdr ?? meeting.budgetCeilingIdr ?? 250000000,
      clientRequirements:
        parsed.clientRequirements ??
        (meeting.clientRequirements.length > 0
          ? meeting.clientRequirements
          : [
              "Highlight low-sugar positioning without medical claims",
              "Include creator-led social activation and commuter trial mechanics",
            ]),
      constraints:
        parsed.constraints ??
        (meeting.constraints.length > 0
          ? meeting.constraints
          : [
              `${meeting.clientName} is for demo preparation purposes`,
              "No unsupported health or clinical claims",
            ]),
      status: "ready",
      finalizedAt: now,
    });

    return NextResponse.json({ meeting: finalizedMeeting }, { status: 200 });
  } catch (error) {
    return handleRouteError(error);
  }
}
