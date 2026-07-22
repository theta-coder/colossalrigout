export function TrustBenefitsSkeleton() {
  return (
    <div className="border-t border-neutral-200 bg-[#fbfbfa] py-6 sm:py-8" aria-busy="true">
      <span className="sr-only">Loading trust benefits</span>
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-5 px-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-6 w-6 rounded-full bg-neutral-200 animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-24 bg-neutral-200 rounded-md animate-pulse" />
              <div className="h-2.5 w-20 bg-neutral-200 rounded-md animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
