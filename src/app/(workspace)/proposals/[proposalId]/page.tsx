import { Suspense } from "react";
import { ProposalDetailView } from "@/components/proposals/proposal-detail-view";
import { LoadingState } from "@/components/ui/state-views";

export default function ProposalDetailPage({
  params,
}: {
  params: Promise<{ proposalId: string }>;
}) {
  return (
    <Suspense
      fallback={
        <LoadingState
          title="Loading proposal details..."
          description="Retrieving personal thinking and grounded brief facts."
        />
      }
    >
      <ProposalParamResolver params={params} />
    </Suspense>
  );
}

async function ProposalParamResolver({
  params,
}: {
  params: Promise<{ proposalId: string }>;
}) {
  const { proposalId } = await params;
  return <ProposalDetailView proposalId={proposalId} />;
}
