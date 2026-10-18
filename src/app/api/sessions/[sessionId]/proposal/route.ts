import { NextRequest, NextResponse } from "next/server";
import { GenerateProposalRequestSchema } from "@/contracts/proposal";
import { handleRouteError, WopsApiError } from "@/lib/server/api-error";
import { synthesizeCampaignProposal } from "@/lib/server/gemini";
import {
  getMeetingById,
  getSessionById,
  listDocumentsByMeetingId,
  saveProposal,
  saveSession,
} from "@/lib/server/store";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = await params;
    let session = await getSessionById(sessionId);
    if (!session) {
      throw new WopsApiError(
        "NOT_FOUND",
        `Session '${sessionId}' was not found`,
        404,
      );
    }

    const meeting = await getMeetingById(session.meetingId);
    if (!meeting) {
      throw new WopsApiError(
        "NOT_FOUND",
        `Associated meeting '${session.meetingId}' was not found`,
        404,
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

    const parsed = GenerateProposalRequestSchema.parse(rawBody);
    if (
      parsed.selectedConceptId &&
      parsed.selectedConceptId !== session.selectedConceptId
    ) {
      session = await saveSession({
        ...session,
        selectedConceptId: parsed.selectedConceptId,
      });
    }

    const documents = await listDocumentsByMeetingId(meeting.id);
    const keyFacts = documents.flatMap((doc) => doc.extractedFacts);

    const proposalId = `prop_${session.id}_${crypto.randomUUID().replace(/-/g, "").slice(0, 6)}`;

    const proposal = await synthesizeCampaignProposal({
      proposalId,
      meeting,
      documents,
      keyFacts,
      session,
      selectedConceptId: parsed.selectedConceptId,
      additionalNotes: parsed.additionalNotes,
    });

    const saved = await saveProposal(proposal);
    return NextResponse.json({ proposal: saved }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
