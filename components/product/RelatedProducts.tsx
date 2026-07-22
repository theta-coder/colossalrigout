'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Product as CatalogProduct } from '@/lib/products';
import { ColorDocument } from '@/types/commerce';
import { formatPkr } from '@/lib/utils';
import { getEffectiveProductPrice } from '@/lib/shop-filters';
import ColorSwatch from '@/components/ui/ColorSwatch';

interface RelatedProductsProps {
  products: CatalogProduct[];
  colorsById?: Map<string, ColorDocument>;
  title?: string;
}

export default function RelatedProducts({ products, colorsById, title = 'YOU MAY ALSO LIKE' }: RelatedProductsProps) {
  if (!products || products.length === 0) return null;

  return (
    <section className="pt-12 border-t border-neutral-200">
      <div className="flex items-center justify-between mb-8">
        <h3 className="font-display text-xl sm:text-2xl font-extrabold tracking-tight uppercase text-neutral-900">
          {title}
        </h3>
        <Link
          href="/shop"
          className="text-xs font-semibold text-neutral-600 hover:text-black transition uppercase tracking-wider underline underline-offset-4"
        >
          Explore Catalog →
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
        {products.map((p) => {
          const effPrice = getEffectiveProductPrice(p);
          const hasDiscount = (p as any).discountPrice && (p as any).discountPrice < (p as any).retailPrice;
          const isCampaign = Boolean((p as any).campaignDiscountApplied);
          const originalPrice = (p as any).manualPrice || (p as any).retailPrice || p.price;
          const isOutOfStock = (p.totalStock ?? 1) <= 0;

          // Resolve color swatches
          const productSwatches: ColorDocument[] = [];
          if (Array.isArray(p.colorIds) && colorsById) {
            p.colorIds.forEach((cId) => {
              const col = colorsById.get(cId);
              if (col) productSwatches.push(col);
            });
          }

          const productSlug = (p as any).slug || String(p.id);

          return (
            <div
              key={p.id}
              className={`prod-card group flex flex-col transition-opacity ${
                isOutOfStock ? 'opacity-75' : ''
              }`}
            >
              <div className="relative overflow-hidden rounded-xl bg-neutral-100 aspect-[3/4] border border-neutral-200">
                {/* Out of Stock Highlight Pill Badge */}
                {isOutOfStock ? (
                  <span className="absolute top-2 left-2 bg-neutral-900/90 text-white text-[9px] font-bold px-2.5 py-1 rounded-md tracking-wider uppercase z-10 shadow-sm border border-neutral-700">
                    OUT OF STOCK
                  </span>
                ) : p.isBestseller ? (
                  <span className="absolute top-2 left-2 bg-black text-white text-[9px] font-bold px-2 py-0.5 rounded tracking-wide z-10">
                    BESTSELLER
                  </span>
                ) : null}

                <Link href={`/product/${productSlug}`} className="absolute inset-0 block cursor-pointer z-0">
                  <Image
                    src={p.img}
                    alt={p.name}
                    fill
                    sizes="(max-width: 768px) 50vw, 25vw"
                    className="object-cover transition duration-500 group-hover:scale-105"
                  />
                </Link>
              </div>

              <Link
                href={`/product/${productSlug}`}
                className="mt-3 text-xs sm:text-sm font-semibold text-neutral-900 hover:underline truncate"
              >
                {p.name}
              </Link>

              {/* PKR Price */}
              <div className="flex items-center gap-2 mt-1">
                {isCampaign ? (
                  <>
                    <span className="text-xs sm:text-sm font-extrabold text-red-600">{formatPkr(effPrice)}</span>
                    <span className="text-[11px] text-neutral-400 line-through font-medium">
                      {formatPkr(originalPrice)}
                    </span>
                  </>
                ) : hasDiscount ? (
                  <>
                    <span className="text-xs sm:text-sm font-extrabold text-red-600">{formatPkr(effPrice)}</span>
                    <span className="text-[11px] text-neutral-400 line-through font-medium">
                      {formatPkr((p as any).retailPrice)}
                    </span>
                  </>
                ) : (
                  <span className="text-xs sm:text-sm text-neutral-800 font-semibold">{formatPkr(effPrice)}</span>
                )}
              </div>

              {/* Colors */}
              {productSwatches.length > 0 && (
                <div className="flex items-center gap-1.5 mt-2">
                  {productSwatches.map((colorDoc) => (
                    <ColorSwatch key={colorDoc.id} color={colorDoc} size="xs" />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
