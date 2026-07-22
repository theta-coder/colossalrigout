'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { formatPkr } from '@/lib/utils';
import ColorSwatch from '@/components/ui/ColorSwatch';
import { ColorDocument } from '@/types/commerce';

interface RecommendedProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  retailPrice?: number;
  discountPrice?: number | null;
  img: string;
  cat: string;
  isBestseller?: boolean;
  colors: ColorDocument[];
}

interface CartRecommendationsProps {
  excludeProductIds: string[];
}

export default function CartRecommendations({ excludeProductIds }: CartRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<RecommendedProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchRecs = async () => {
      try {
        const excludeQuery = excludeProductIds.join(',');
        const res = await fetch(`/api/cart/recommendations?exclude=${encodeURIComponent(excludeQuery)}`);
        const data = await res.json();
        if (isMounted && data.success && Array.isArray(data.recommendations)) {
          setRecommendations(data.recommendations);
        }
      } catch (err) {
        console.error('[CartRecommendations] Error loading recommendations:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchRecs();
    return () => {
      isMounted = false;
    };
  }, [excludeProductIds.join(',')]);

  if (!loading && recommendations.length === 0) {
    return null;
  }

  return (
    <section className="mt-16 w-full space-y-6">
      <div className="border-b border-neutral-200 pb-3">
        <h3 className="font-display font-extrabold text-xl sm:text-2xl tracking-tight text-neutral-900 uppercase">
          BESTSELLERS YOU MAY LIKE
        </h3>
        <p className="text-xs text-neutral-500 mt-1">
          Explore top-rated dynamic luxury pieces curated for your outfit
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="aspect-[3/4] bg-neutral-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
          {recommendations.map((p) => (
            <Link
              key={p.id}
              href={`/product/${p.slug}`}
              className="group flex flex-col space-y-2 bg-white rounded-xl border border-neutral-200/80 p-3 shadow-2xs hover:shadow-md transition"
            >
              <div className="relative aspect-[3/4] w-full rounded-lg overflow-hidden bg-neutral-100">
                <Image
                  src={p.img || '/colossal-rigout-logo.png'}
                  alt={p.name}
                  fill
                  sizes="(max-width: 768px) 50vw, 25vw"
                  className="object-cover transition duration-500 group-hover:scale-105"
                />
                {p.isBestseller && (
                  <span className="absolute top-2 left-2 bg-black text-white text-[9px] font-extrabold px-2 py-0.5 rounded tracking-wider uppercase">
                    BESTSELLER
                  </span>
                )}
              </div>

              <div className="space-y-1">
                <p className="font-bold text-xs sm:text-sm text-neutral-900 line-clamp-1 group-hover:text-black transition">
                  {p.name}
                </p>
                <div className="flex items-center gap-1.5 text-xs font-extrabold">
                  <span className="text-neutral-900">{formatPkr(p.price)}</span>
                  {p.discountPrice && p.retailPrice && p.retailPrice > p.price && (
                    <span className="text-neutral-400 line-through text-[11px] font-normal">
                      {formatPkr(p.retailPrice)}
                    </span>
                  )}
                </div>

                {/* Colors Swatches */}
                {Array.isArray(p.colors) && p.colors.length > 0 && (
                  <div className="flex items-center gap-1 pt-1">
                    {p.colors.slice(0, 4).map((col) => (
                      <ColorSwatch key={col.id} color={col} size="sm" />
                    ))}
                    {p.colors.length > 4 && (
                      <span className="text-[10px] text-neutral-400 font-bold">
                        +{p.colors.length - 4}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
