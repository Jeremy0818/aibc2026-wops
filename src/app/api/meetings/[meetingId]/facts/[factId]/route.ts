import { NextRequest, NextResponse } from "next/server";
import { UpdateDocumentFactRequestSchema } from "@/contracts/document";
import { handleRouteError, WopsApiError } from "@/lib/server/api-error";
import {
  getMeetingById,
  updateMeetingDocumentFact,
} from "@/lib/server/store";

export async function PATCH(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ meetingId: string; factId: string }> },
) {
  try {
    const { meetingId, factId } = await params;
    const meeting = await getMeetingById(meetingId);
    if (!meeting) {
      throw new WopsApiError(
        "NOT_FOUND",
        `Meeting '${meetingId}' was not found`,
        404,
      );
    }

    const body = await request.json();
    const parsed = UpdateDocumentFactRequestSchema.parse(body);

    const updatedFact = await updateMeetingDocumentFact(
      meeting,
      factId,
      parsed,
    );
    if (!updatedFact) {
      throw new WopsApiError(
        "NOT_FOUND",
        `Fact '${factId}' was not found in meeting '${meetingId}'`,
        404,
      );
    }

    return NextResponse.json({ fact: updatedFact }, { status: 200 });
  } catch (error) {
    return handleRouteError(error);
  }
}
