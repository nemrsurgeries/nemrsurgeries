export default function CaseDetailLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="h-4 w-28 rounded bg-slate-200/70 dark:bg-slate-800/70" />
          <div className="h-7 w-64 max-w-full rounded-md bg-slate-200 dark:bg-slate-800" />
          <div className="h-4 w-48 rounded bg-slate-200/70 dark:bg-slate-800/70" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-24 rounded-md bg-slate-200 dark:bg-slate-800" />
          <div className="h-9 w-24 rounded-md bg-slate-200 dark:bg-slate-800" />
        </div>
      </div>

      <div className="flex gap-2 overflow-hidden border-b border-slate-200 dark:border-slate-800 pb-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-8 w-24 shrink-0 rounded-md bg-slate-200/80 dark:bg-slate-800/80"
          />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="h-56 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4"
          >
            <div className="h-5 w-40 rounded bg-slate-200 dark:bg-slate-800" />
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((__, j) => (
                <div key={j} className="space-y-1.5">
                  <div className="h-3 w-20 rounded bg-slate-100 dark:bg-slate-800/70" />
                  <div className="h-4 w-28 rounded bg-slate-200 dark:bg-slate-800" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
