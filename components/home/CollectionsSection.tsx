import React from 'react';
import Link from 'next/link';
import ImageWithFallback from '@/components/ui/ImageWithFallback';
import { getFeaturedCollections } from '@/lib/server/homepage';

export default async function CollectionsSection() {
  const collections = await getFeaturedCollections();

  if (!collections || collections.length === 0) {
    return null;
  }

  return (
    <section className="max-w-7xl mx-auto px-4 py-10 w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-wide">EXPLORE COLLECTIONS</h2>
          <p className="text-neutral-500 text-sm">Handpicked styles for every vibe.</p>
        </div>
        <Link href="/shop" className="text-sm font-medium hover:underline text-neutral-800">
          View all
        </Link>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {collections.map((coll, idx) => (
          <Link
            href={`/shop?collection=${coll.slug}`}
            key={coll.id || idx}
            className="relative rounded-md overflow-hidden h-48 sm:h-60 md:h-72 group cursor-pointer"
          >
            <ImageWithFallback
              src={coll.img}
              alt={coll.title}
              fill
              sizes="(max-width: 767px) 50vw, 25vw"
              className="object-cover transition duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/30" />
            <div className="absolute bottom-4 left-4 text-white">
              <p className="font-display font-bold text-base sm:text-lg">{coll.title}</p>
              {coll.subtitle && <p className="text-[10px] mt-0.5 text-neutral-200">{coll.subtitle}</p>}
              <p className="text-[11px] underline mt-1.5 font-medium tracking-wider">SHOP NOW</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
