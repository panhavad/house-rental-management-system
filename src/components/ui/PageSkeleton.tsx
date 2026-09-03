/**
 * Generic, calm loading placeholder shown while a page's Server Component
 * data is still resolving (via the nearest `loading.tsx` Suspense boundary).
 * Deliberately mimics the common "PageHeader + a few content blocks" shape
 * used across the app so navigating in doesn't feel like a jarring blank
 * screen, without trying to pixel-match every individual page.
 */
export function PageSkeleton() {
  return (
    <div className="animate-pulse" role="status" aria-label="Loading">
      <div className="mb-6">
        <div className="mb-3 h-3 w-40 rounded bg-slate-200" />
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="h-7 w-48 rounded bg-slate-200" />
            <div className="mt-2 h-4 w-64 rounded bg-slate-100" />
          </div>
          <div className="h-9 w-28 rounded-md bg-slate-200" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="h-24 rounded-lg bg-slate-100" />
        <div className="h-24 rounded-lg bg-slate-100" />
        <div className="h-24 rounded-lg bg-slate-100" />
      </div>
      <div className="mt-6 h-64 rounded-lg bg-slate-100" />
    </div>
  );
}
