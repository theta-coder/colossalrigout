function Pulse({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-neutral-200 ${className}`} />;
}

export function SectionHeadingSkeleton({ subtitle = false }: { subtitle?: boolean }) {
  return (
    <div className="flex items-end justify-between gap-4 mb-6">
      <div className="space-y-2">
        <Pulse className="h-6 w-44 sm:w-56" />
        {subtitle && <Pulse className="h-3 w-32 sm:w-44" />}
      </div>
      <Pulse className="h-3 w-12" />
    </div>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="min-w-0">
      <Pulse className="aspect-[3/4] w-full" />
      <Pulse className="mt-3 h-3 w-4/5" />
      <Pulse className="mt-2 h-3 w-2/5" />
      <div className="mt-2 flex gap-1.5">
        <Pulse className="h-3 w-3 rounded-full" />
        <Pulse className="h-3 w-3 rounded-full" />
      </div>
    </div>
  );
}

export function ProductRowSkeleton({ titleSubtitle = true }: { titleSubtitle?: boolean }) {
  return (
    <section className="mx-auto w-full max-w-7xl overflow-hidden px-4 py-8">
      <SectionHeadingSkeleton subtitle={titleSubtitle} />
      <div className="grid grid-cols-2 gap-x-4 gap-y-6 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => <ProductCardSkeleton key={index} />)}
      </div>
    </section>
  );
}

export function HeroSkeleton() {
  return (
    <section className="relative w-full overflow-hidden bg-neutral-200" aria-busy="true" aria-label="Loading hero">
      <Pulse className="min-h-[350px] w-full rounded-none aspect-[4/5] sm:aspect-[16/9] md:aspect-[21/9] lg:h-[520px] lg:aspect-auto" />
      <div className="absolute inset-x-4 bottom-10 max-w-xl space-y-4 sm:bottom-1/3 sm:right-auto sm:w-full">
        <Pulse className="h-10 w-52 bg-neutral-300/80 sm:h-14 sm:w-80" /><Pulse className="h-4 w-64 bg-neutral-300/80 sm:w-96" /><div className="flex gap-3"><Pulse className="h-10 w-28 bg-neutral-300/80" /><Pulse className="h-10 w-32 bg-neutral-300/80" /></div>
      </div>
    </section>
  );
}

export function CategoriesSkeleton() {
  return <div className="grid grid-cols-3 gap-5 sm:grid-cols-4 md:grid-cols-6 md:gap-8" aria-busy="true">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="flex flex-col items-center gap-3"><Pulse className="aspect-square w-full max-w-28 rounded-xl" /><Pulse className="h-3 w-16" /></div>)}</div>;
}

export function PromoCampaignSkeleton() {
  return <section className="relative my-8 w-full overflow-hidden bg-neutral-900 px-4 py-12 sm:py-16" aria-busy="true"><div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-8 md:flex-row"><div className="w-full max-w-xl space-y-3"><Pulse className="h-5 w-24 bg-neutral-700" /><Pulse className="h-10 w-56 bg-neutral-700 sm:w-80" /><Pulse className="h-4 w-72 max-w-full bg-neutral-700" /></div><div className="w-full max-w-sm space-y-5 rounded-2xl border border-white/10 bg-white/5 p-6 sm:p-8"><Pulse className="mx-auto h-3 w-24 bg-neutral-700" /><div className="grid grid-cols-4 gap-3">{Array.from({ length: 4 }).map((_, index) => <Pulse key={index} className="h-16 bg-neutral-700" />)}</div><Pulse className="h-11 w-full bg-neutral-700" /></div></div></section>;
}

export function CollectionsSkeleton() {
  return <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4" aria-busy="true">{Array.from({ length: 4 }).map((_, index) => <Pulse key={index} className="h-48 sm:h-60 md:h-72" />)}</div>;
}

export function ReviewsSkeleton() {
  return <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">{Array.from({ length: 3 }).map((_, index) => <div key={index} className="min-h-52 rounded-lg border border-neutral-200 bg-neutral-100 p-6"><Pulse className="h-3 w-20" /><Pulse className="mt-6 h-3 w-full" /><Pulse className="mt-2 h-3 w-5/6" /><Pulse className="mt-2 h-3 w-2/3" /><Pulse className="mt-12 h-3 w-24" /></div>)}</div>;
}

export function TrustBenefitsSkeleton() {
  return <section className="border-y border-neutral-200 bg-white py-6 sm:py-8" aria-busy="true"><div className="mx-auto grid max-w-7xl grid-cols-2 gap-5 px-4 md:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="flex items-center gap-3"><Pulse className="h-6 w-6 rounded-full" /><div className="flex-1 space-y-2"><Pulse className="h-3 w-24" /><Pulse className="h-2.5 w-20" /></div></div>)}</div></section>;
}

export default function HomePageSkeleton() {
  return (
    <div className="flex flex-col" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading the Colossal Rigout homepage</span>

      <HeroSkeleton />

      <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:py-16">
        <SectionHeadingSkeleton />
        <CategoriesSkeleton />
      </section>

      <ProductRowSkeleton />

      <PromoCampaignSkeleton />

      <ProductRowSkeleton />

      <section className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-4 px-4 py-8 sm:grid-cols-2">
        <Pulse className="h-36 sm:h-48" /><Pulse className="h-36 sm:h-48" />
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-10">
        <SectionHeadingSkeleton subtitle />
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => <Pulse key={index} className="h-48 sm:h-60 md:h-72" />)}
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-8">
        <SectionHeadingSkeleton subtitle />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => <div key={index} className="min-h-52 rounded-lg border border-neutral-200 bg-neutral-100 p-6"><Pulse className="h-3 w-20" /><Pulse className="mt-6 h-3 w-full" /><Pulse className="mt-2 h-3 w-5/6" /><Pulse className="mt-2 h-3 w-2/3" /><Pulse className="mt-12 h-3 w-24" /></div>)}
        </div>
      </section>

      <section className="border-y border-neutral-200 bg-white py-6 sm:py-8">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-5 px-4 md:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="flex items-center gap-3"><Pulse className="h-6 w-6 rounded-full" /><div className="flex-1 space-y-2"><Pulse className="h-3 w-24" /><Pulse className="h-2.5 w-20" /></div></div>)}</div>
      </section>

      <section className="w-full bg-[#f4efe9] py-12 sm:py-16">
        <div className="mx-auto max-w-2xl px-4 text-center"><Pulse className="mx-auto h-8 w-72 max-w-full" /><Pulse className="mx-auto mt-3 h-3 w-80 max-w-full" /><div className="mx-auto mt-6 flex max-w-md flex-col gap-3 sm:flex-row"><Pulse className="h-12 flex-1 bg-white" /><Pulse className="h-12 w-full bg-neutral-800 sm:w-28" /></div></div>
      </section>
    </div>
  );
}
