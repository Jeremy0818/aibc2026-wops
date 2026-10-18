import { NextRequest, NextResponse } from "next/server";
import {
  FactCategory,
  MeetingContextResponseSchema,
} from "@/contracts/document";
import { handleRouteError, WopsApiError } from "@/lib/server/api-error";
import {
  getMeetingById,
  listDocumentsByMeetingId,
} from "@/lib/server/store";

const STANDARD_CATEGORIES: FactCategory[] = [
  "client_objective",
  "requirement",
  "target_audience",
  "budget",
  "constraint",
  "deliverable",
  "timeline",
];

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
    const readyDocs = documents.filter((d) => d.processingStatus === "ready");
    const keyFacts = readyDocs.flatMap((doc) => doc.extractedFacts);

    const docSummaries = readyDocs
      .map((doc) => doc.summary)
      .filter((s): s is string => Boolean(s && s.trim()));

    const synthesizedBrief =
      docSummaries.length > 0
        ? docSummaries.join(" ")
        : readyDocs.length > 0
          ? `${meeting.clientName} (${meeting.projectName}) brief grounded with ${keyFacts.length} extracted fact(s).`
          : undefined;

    const presentCategories = new Set(keyFacts.map((f) => f.category));
    const missingCategories = STANDARD_CATEGORIES.filter(
      (cat) => !presentCategories.has(cat),
    );

    const contextPayload = MeetingContextResponseSchema.parse({
      meeting,
      documents,
      ...(synthesizedBrief ? { synthesizedBrief } : {}),
      keyFacts,
      missingCategories,
      contextVersion: meeting.contextVersion ?? 1,
    });

    return NextResponse.json(contextPayload, { status: 200 });
  } catch (error) {
    return handleRouteError(error);
  }
}
