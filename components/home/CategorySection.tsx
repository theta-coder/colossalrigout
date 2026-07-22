import React from 'react';
import Link from 'next/link';
import ImageWithFallback from '@/components/ui/ImageWithFallback';
import { getHomepageCategories } from '@/lib/server/homepage';

export default async function CategorySection() {
  const categories = await getHomepageCategories();

  if (!categories || categories.length === 0) {
    return null;
  }

  return (
    <section className="max-w-7xl mx-auto px-4 py-10 sm:py-16 w-full">
      <div className="flex items-center justify-between mb-8">
        <h2 className="font-display text-xl sm:text-2xl md:text-3xl font-bold tracking-wide">SHOP BY CATEGORY</h2>
        <Link
          href="/shop"
          className="text-xs sm:text-sm font-medium flex items-center gap-1 hover:underline whitespace-nowrap"
        >
          View all <span>&rarr;</span>
        </Link>
      </div>
      <div
        className="flex overflow-x-auto pb-4 md:pb-0 scrollbar-none snap-x -mx-4 px-4 sm:mx-0 sm:px-0 md:grid gap-4 sm:gap-6 md:gap-4 lg:gap-6 xl:gap-8 justify-start md:justify-center"
        style={{ gridTemplateColumns: `repeat(${Math.min(categories.length, 8)}, minmax(0, 1fr))` }}
      >
        {categories.map((c) => (
          <Link
            key={c.id || c.slug}
            href={`/shop?cat=${c.slug}`}
            className="text-center transition shrink-0 snap-center group w-20 sm:w-24 md:w-full max-w-[150px] mx-auto"
          >
            {c.style === 'sale' ? (
              <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-full md:h-auto md:aspect-square rounded-2xl bg-black text-white flex items-center justify-center mx-auto font-display font-bold text-xs sm:text-sm md:text-base lg:text-lg transition group-hover:-translate-y-1.5 shadow-sm group-hover:shadow-md">
                {c.name.toUpperCase()}
              </div>
            ) : (
              <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-full md:h-auto md:aspect-square rounded-2xl overflow-hidden relative mx-auto transition group-hover:-translate-y-1.5 shadow-sm group-hover:shadow-md bg-neutral-100">
                <ImageWithFallback src={c.imageUrl} alt={c.name} fill sizes="(max-width: 767px) 96px, 150px" className="object-cover" />
              </div>
            )}
            <p className="mt-3 text-xs sm:text-sm lg:text-base font-semibold text-neutral-800 group-hover:text-black truncate">
              {c.name}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
