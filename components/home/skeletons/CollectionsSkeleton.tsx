export function CollectionsSkeleton() {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-10" aria-busy="true">
      <span className="sr-only">Loading collections</span>
      <div className="flex items-end justify-between gap-4 mb-6">
        <div className="space-y-2">
          <div className="h-6 w-52 bg-neutral-200 rounded-md animate-pulse" />
          <div className="h-3 w-40 bg-neutral-200 rounded-md animate-pulse" />
        </div>
        <div className="h-3 w-12 bg-neutral-200 rounded-md animate-pulse" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-48 sm:h-60 md:h-72 bg-neutral-200 rounded-md animate-pulse" />
        ))}
      </div>
    </section>
  );
}
