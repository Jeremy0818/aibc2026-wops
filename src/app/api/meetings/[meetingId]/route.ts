import { NextRequest, NextResponse } from "next/server";
import { handleRouteError, WopsApiError } from "@/lib/server/api-error";
import { getMeetingById } from "@/lib/server/store";

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

    return NextResponse.json({ meeting }, { status: 200 });
  } catch (error) {
    return handleRouteError(error);
  }
}
