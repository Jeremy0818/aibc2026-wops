import { Suspense } from "react";
import { EmployeePrepareView } from "@/components/meetings/employee-prepare-view";
import { LoadingState } from "@/components/ui/state-views";

export default function EmployeePreparePage({
  params,
}: {
  params: Promise<{ meetingId: string }>;
}) {
  return (
    <Suspense
      fallback={
        <LoadingState
          title="Loading your preparation..."
          description="Resolving shared client brief and role-specific AI prompts."
        />
      }
    >
      <EmployeePrepareParamResolver params={params} />
    </Suspense>
  );
}

async function EmployeePrepareParamResolver({
  params,
}: {
  params: Promise<{ meetingId: string }>;
}) {
  const { meetingId } = await params;
  return <EmployeePrepareView meetingId={meetingId} />;
}
