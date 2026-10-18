import { Suspense, type ReactNode } from "react";
import { AuthProvider } from "@/lib/client/auth-context";
import { WorkspaceShell } from "@/components/layout/workspace-shell";

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center bg-[#faf9f6] text-xs text-[#5c5852]">
            Getting WOPS! ready...
          </div>
        }
      >
        <WorkspaceShell>{children}</WorkspaceShell>
      </Suspense>
    </AuthProvider>
  );
}
