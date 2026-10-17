import { NextRequest, NextResponse } from "next/server";
import { MeetingContextResponseSchema } from "@/contracts/document";
import { handleRouteError, WopsApiError } from "@/lib/server/api-error";
import {
  getMeetingById,
  listDocumentsByMeetingId,
} from "@/lib/server/store";

export async function GET(
  _request: NextRequest,
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

    const documents = await listDocumentsByMeetingId(meetingId);
    const keyFacts = documents.flatMap((doc) => doc.extractedFacts);

    const docSummaries = documents
      .map((doc) => doc.summary)
      .filter((s): s is string => Boolean(s));

    const synthesizedBrief =
      docSummaries.length > 0
        ? docSummaries.join(" ")
        : `${meeting.clientName} is preparing ${meeting.projectName} targeting ${meeting.targetAudience} with a budget ceiling of Rp${meeting.budgetCeilingIdr.toLocaleString("en-US")}.`;

    const contextPayload = MeetingContextResponseSchema.parse({
      meeting,
      documents,
      synthesizedBrief,
      keyFacts,
    });

    return NextResponse.json(contextPayload, { status: 200 });
  } catch (error) {
    return handleRouteError(error);
  }
}
