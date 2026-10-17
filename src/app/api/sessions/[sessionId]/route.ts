import { NextRequest, NextResponse } from "next/server";
import { handleRouteError, WopsApiError } from "@/lib/server/api-error";
import { getSessionById } from "@/lib/server/store";

export async function GET(
  _request: NextRequest,
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

    return NextResponse.json({ session }, { status: 200 });
  } catch (error) {
    return handleRouteError(error);
  }
}
