import { NextRequest, NextResponse } from "next/server";
import { handleRouteError } from "@/lib/server/api-error";
import { listProposals } from "@/lib/server/store";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const participantId = searchParams.get("participantId")?.trim() || undefined;
    const meetingId = searchParams.get("meetingId")?.trim() || undefined;

    const proposals = await listProposals({
      participantId,
      meetingId,
    });

    return NextResponse.json({ proposals }, { status: 200 });
  } catch (error) {
    return handleRouteError(error);
  }
}
