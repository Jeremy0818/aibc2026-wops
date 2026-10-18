import { Suspense } from "react";
import { ProposalsHubView } from "@/components/proposals/proposals-hub-view";
import { LoadingState } from "@/components/ui/state-views";

export default function ProposalsPage() {
  return (
    <Suspense
      fallback={
        <LoadingState
          title="Loading your proposals..."
          description="Retrieving your personal pre-meeting preparation outputs."
        />
      }
    >
      <ProposalsHubView />
    </Suspense>
  );
}
