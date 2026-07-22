export function HeroSkeleton() {
  return (
    <section className="relative w-full overflow-hidden bg-neutral-200" aria-busy="true">
      <span className="sr-only">Loading hero section</span>
      <div className="animate-pulse min-h-[350px] w-full rounded-none aspect-[4/5] sm:aspect-[16/9] md:aspect-[21/9] lg:h-[520px] lg:aspect-auto bg-neutral-200" />
      <div className="absolute inset-x-4 bottom-10 max-w-xl space-y-4 sm:bottom-1/3 sm:right-auto sm:w-full">
        <div className="h-10 w-52 bg-neutral-300/80 rounded-md sm:h-14 sm:w-80 animate-pulse" />
        <div className="h-4 w-64 bg-neutral-300/80 rounded-md sm:w-96 animate-pulse" />
        <div className="flex gap-3">
          <div className="h-10 w-28 bg-neutral-300/80 rounded-md animate-pulse" />
          <div className="h-10 w-32 bg-neutral-300/80 rounded-md animate-pulse" />
        </div>
      </div>
    </section>
  );
}
