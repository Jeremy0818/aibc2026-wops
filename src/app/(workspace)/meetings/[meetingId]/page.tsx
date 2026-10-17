import { Suspense } from "react";
import { MeetingDetailView } from "@/components/meetings/meeting-detail-view";
import { LoadingState } from "@/components/ui/state-views";

export default function MeetingDetailPage({
  params,
}: {
  params: Promise<{ meetingId: string }>;
}) {
  return (
    <Suspense
      fallback={
        <LoadingState
          title="Loading meeting details..."
          description="Resolving meeting brief and preparation context."
        />
      }
    >
      <MeetingDetailParamResolver params={params} />
    </Suspense>
  );
}

async function MeetingDetailParamResolver({
  params,
}: {
  params: Promise<{ meetingId: string }>;
}) {
  const { meetingId } = await params;
  return <MeetingDetailView meetingId={meetingId} />;
}
