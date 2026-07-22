export function PromoSkeleton() {
  return (
    <section className="relative my-8 w-full overflow-hidden bg-neutral-900 px-4 py-12 sm:py-16" aria-busy="true">
      <span className="sr-only">Loading promotional campaign</span>
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-8 md:flex-row">
        <div className="w-full max-w-xl space-y-3">
          <div className="h-5 w-24 bg-neutral-700 rounded-md animate-pulse" />
          <div className="h-10 w-56 bg-neutral-700 rounded-md sm:w-80 animate-pulse" />
          <div className="h-4 w-72 max-w-full bg-neutral-700 rounded-md animate-pulse" />
        </div>
        <div className="w-full max-w-sm space-y-5 rounded-2xl border border-white/10 bg-white/5 p-6 sm:p-8">
          <div className="mx-auto h-3 w-24 bg-neutral-700 rounded-md animate-pulse" />
          <div className="grid grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 bg-neutral-700 rounded-md animate-pulse" />
            ))}
          </div>
          <div className="h-11 w-full bg-neutral-700 rounded-md animate-pulse" />
        </div>
      </div>
    </section>
  );
}
