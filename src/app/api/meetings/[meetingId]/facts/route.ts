import { NextRequest, NextResponse } from "next/server";
import { CreateDocumentFactRequestSchema } from "@/contracts/document";
import { handleRouteError, WopsApiError } from "@/lib/server/api-error";
import {
  createLeadDocumentFact,
  getMeetingById,
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

    const body = await request.json();
    const parsed = CreateDocumentFactRequestSchema.parse(body);

    const fact = await createLeadDocumentFact(meeting, parsed);
    return NextResponse.json({ fact }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
