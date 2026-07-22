export function ReviewsSkeleton() {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-8" aria-busy="true">
      <span className="sr-only">Loading customer reviews</span>
      <div className="flex items-end justify-between gap-4 mb-6">
        <div className="space-y-2">
          <div className="h-6 w-56 bg-neutral-200 rounded-md animate-pulse" />
          <div className="h-3 w-44 bg-neutral-200 rounded-md animate-pulse" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="min-h-52 rounded-lg border border-neutral-200 bg-neutral-100 p-6">
            <div className="h-3 w-20 bg-neutral-200 rounded-md animate-pulse" />
            <div className="mt-6 h-3 w-full bg-neutral-200 rounded-md animate-pulse" />
            <div className="mt-2 h-3 w-5/6 bg-neutral-200 rounded-md animate-pulse" />
            <div className="mt-2 h-3 w-2/3 bg-neutral-200 rounded-md animate-pulse" />
            <div className="mt-12 h-3 w-24 bg-neutral-200 rounded-md animate-pulse" />
          </div>
        ))}
      </div>
    </section>
  );
}
