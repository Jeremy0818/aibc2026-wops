import { NextRequest, NextResponse } from "next/server";
import { CreateMeetingRequestSchema } from "@/contracts/meeting";
import { handleRouteError } from "@/lib/server/api-error";
import { createMeeting, listMeetings } from "@/lib/server/store";

export async function GET() {
  try {
    const meetings = await listMeetings();
    return NextResponse.json({ meetings }, { status: 200 });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = CreateMeetingRequestSchema.parse(body);
    const meeting = await createMeeting(parsed);
    return NextResponse.json({ meeting }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
