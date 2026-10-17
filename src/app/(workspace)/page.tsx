export default function WorkspaceDashboardPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 py-24 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <main className="mx-auto flex w-full max-w-2xl flex-col items-center text-center gap-4">
        <span className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium uppercase tracking-widest text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          AI-powered meeting preparation
        </span>
        <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
          WOPS!
        </h1>
        <p className="text-xl font-medium text-zinc-600 dark:text-zinc-400">
          Less Chit. More Chat.
        </p>
        <p className="mt-2 max-w-md text-sm text-zinc-500 dark:text-zinc-400">
          Work Out Problems Swiftly — a proactive, voice-first AI thinking
          partner that helps teams prepare for meetings through structured
          ideation.
        </p>
      </main>
    </div>
  );
}
