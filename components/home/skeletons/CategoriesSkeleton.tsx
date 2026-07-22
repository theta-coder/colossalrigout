export function CategoriesSkeleton() {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:py-16" aria-busy="true">
      <span className="sr-only">Loading categories</span>
      <div className="flex items-end justify-between gap-4 mb-8">
        <div className="h-6 w-44 sm:w-56 bg-neutral-200 rounded-md animate-pulse" />
        <div className="h-3 w-12 bg-neutral-200 rounded-md animate-pulse" />
      </div>
      <div className="grid grid-cols-3 gap-5 sm:grid-cols-4 md:grid-cols-6 md:gap-8">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-3">
            <div className="aspect-square w-full max-w-28 rounded-xl bg-neutral-200 animate-pulse" />
            <div className="h-3 w-16 bg-neutral-200 rounded-md animate-pulse" />
          </div>
        ))}
      </div>
    </section>
  );
}
