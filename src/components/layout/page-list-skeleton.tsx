export function PageListSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-7 w-48 rounded-md bg-slate-200 dark:bg-slate-800" />
        <div className="h-4 w-72 max-w-full rounded-md bg-slate-200/70 dark:bg-slate-800/70" />
      </div>

      <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between gap-4 p-4">
            <div className="space-y-2 flex-1">
              <div className="h-4 w-40 rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-3.5 w-64 max-w-full rounded bg-slate-100 dark:bg-slate-800/70" />
            </div>
            <div className="h-6 w-20 rounded-md bg-slate-200 dark:bg-slate-800" />
          </div>
        ))}
      </div>
    </div>
  );
}
