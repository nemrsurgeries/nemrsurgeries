export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-7 w-56 rounded-md bg-slate-200 dark:bg-slate-800" />
        <div className="h-4 w-80 max-w-full rounded-md bg-slate-200/70 dark:bg-slate-800/70" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-28 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3"
          >
            <div className="h-3.5 w-24 rounded bg-slate-200 dark:bg-slate-800" />
            <div className="h-7 w-16 rounded bg-slate-200 dark:bg-slate-800" />
            <div className="h-3 w-32 rounded bg-slate-200/70 dark:bg-slate-800/70" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="h-64 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4"
          >
            <div className="h-5 w-40 rounded bg-slate-200 dark:bg-slate-800" />
            <div className="space-y-2.5">
              <div className="h-10 w-full rounded bg-slate-100 dark:bg-slate-800/70" />
              <div className="h-10 w-full rounded bg-slate-100 dark:bg-slate-800/70" />
              <div className="h-10 w-full rounded bg-slate-100 dark:bg-slate-800/70" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
