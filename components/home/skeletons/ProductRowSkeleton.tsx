export function ProductRowSkeleton() {
  return (
    <section className="mx-auto w-full max-w-7xl overflow-hidden px-4 py-8" aria-busy="true">
      <span className="sr-only">Loading products</span>
      <div className="flex items-end justify-between gap-4 mb-6">
        <div className="space-y-2">
          <div className="h-6 w-44 sm:w-56 bg-neutral-200 rounded-md animate-pulse" />
          <div className="h-3 w-32 sm:w-44 bg-neutral-200 rounded-md animate-pulse" />
        </div>
        <div className="h-3 w-12 bg-neutral-200 rounded-md animate-pulse" />
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-6 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="min-w-0">
            <div className="aspect-[3/4] w-full bg-neutral-200 rounded-md animate-pulse" />
            <div className="mt-3 h-3 w-4/5 bg-neutral-200 rounded-md animate-pulse" />
            <div className="mt-2 h-3 w-2/5 bg-neutral-200 rounded-md animate-pulse" />
            <div className="mt-2 flex gap-1.5">
              <div className="h-3 w-3 rounded-full bg-neutral-200 animate-pulse" />
              <div className="h-3 w-3 rounded-full bg-neutral-200 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
