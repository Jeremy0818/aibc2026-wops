import { NextRequest, NextResponse } from "next/server";
import { handleRouteError, WopsApiError } from "@/lib/server/api-error";
import { getProposalById } from "@/lib/server/store";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ proposalId: string }> },
) {
  try {
    const { proposalId } = await params;
    const proposal = await getProposalById(proposalId);
    if (!proposal) {
      throw new WopsApiError(
        "NOT_FOUND",
        `Proposal '${proposalId}' was not found`,
        404,
      );
    }

    return NextResponse.json({ proposal }, { status: 200 });
  } catch (error) {
    return handleRouteError(error);
  }
}
