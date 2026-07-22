'use client';

import React from 'react';

export default function ProductDetailsSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 pb-16 pt-4 animate-fade-in font-sans">
      {/* 1. BREADCRUMB SKELETON */}
      <div className="py-4 flex items-center gap-2">
        <div className="w-10 h-3.5 bg-neutral-200 dark:bg-neutral-800 animate-pulse rounded" />
        <span className="text-neutral-300">/</span>
        <div className="w-10 h-3.5 bg-neutral-200 dark:bg-neutral-800 animate-pulse rounded" />
        <span className="text-neutral-300">/</span>
        <div className="w-14 h-3.5 bg-neutral-200 dark:bg-neutral-800 animate-pulse rounded" />
        <span className="text-neutral-300">/</span>
        <div className="w-32 h-3.5 bg-neutral-300 dark:bg-neutral-700 animate-pulse rounded font-medium" />
      </div>

      {/* 2. MAIN PRODUCT SECTION (2 COLUMNS) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 pt-2">
        {/* LEFT COLUMN: IMAGE GALLERY SKELETON */}
        <div className="lg:col-span-7 flex flex-col-reverse md:flex-row gap-4">
          {/* Vertical Thumbnails */}
          <div className="flex md:flex-col gap-3 shrink-0">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="w-16 h-20 sm:w-20 sm:h-24 rounded-xl bg-neutral-900 animate-pulse border border-neutral-800 shrink-0 relative overflow-hidden flex items-center justify-center"
              >
                <div className="w-8 h-8 border border-amber-500/20 rounded-full animate-pulse" />
              </div>
            ))}
          </div>

          {/* Main Large Image Stage */}
          <div className="relative flex-1 aspect-[3/4] rounded-2xl overflow-hidden bg-neutral-900 border border-neutral-800 shadow-xs flex items-center justify-center">
            {/* Heart button skeleton top right */}
            <div className="absolute top-3 right-3 w-9 h-9 bg-white/10 dark:bg-neutral-800 rounded-full" />
            
            {/* Golden emblem skeleton center */}
            <div className="w-28 h-28 border-2 border-amber-500/20 rounded-full animate-pulse flex items-center justify-center">
              <div className="w-14 h-14 border-t-2 border-amber-500/30 rounded-full" />
            </div>

            {/* Expand zoom icon skeleton bottom right */}
            <div className="absolute bottom-3 right-3 w-8 h-8 bg-white/10 dark:bg-neutral-800 rounded-lg" />
            
            {/* Shimmer */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer pointer-events-none" />
          </div>
        </div>

        {/* RIGHT COLUMN: PRODUCT INFO & PURCHASE SKELETON */}
        <div className="lg:col-span-5 space-y-6">
          {/* Category Subtitle */}
          <div className="w-20 h-3.5 bg-neutral-300 dark:bg-neutral-700 animate-pulse rounded font-mono uppercase tracking-wider" />

          {/* Product Title */}
          <div className="w-3/4 sm:w-4/5 h-8 sm:h-10 bg-neutral-800 dark:bg-neutral-800 animate-pulse rounded-lg" />

          {/* Rating Line */}
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="w-3.5 h-3.5 bg-amber-400/40 animate-pulse rounded-full" />
              ))}
            </div>
            <div className="w-28 h-3.5 bg-neutral-200 dark:bg-neutral-800 animate-pulse rounded" />
          </div>

          {/* Price Card Box Skeleton */}
          <div className="p-4 sm:p-5 rounded-2xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-24 h-7 bg-neutral-900 dark:bg-neutral-700 animate-pulse rounded-md" />
              <div className="w-14 h-4 bg-neutral-300 dark:bg-neutral-800 animate-pulse rounded line-through" />
              <div className="w-32 h-5 bg-rose-500/20 animate-pulse rounded-full" />
            </div>
            <div className="w-56 h-3 bg-neutral-300 dark:bg-neutral-800 animate-pulse rounded" />
          </div>

          {/* Color Selection Skeleton */}
          <div className="space-y-3 pt-1">
            <div className="w-28 h-4 bg-neutral-300 dark:bg-neutral-700 animate-pulse rounded font-bold" />
            <div className="flex gap-2.5">
              <div className="w-8 h-8 rounded-full bg-neutral-300 dark:bg-neutral-700 animate-pulse ring-2 ring-black" />
              <div className="w-8 h-8 rounded-full bg-neutral-400 dark:bg-neutral-800 animate-pulse" />
            </div>
          </div>

          {/* Size Selection Skeleton */}
          <div className="space-y-3 pt-1">
            <div className="w-28 h-4 bg-neutral-300 dark:bg-neutral-700 animate-pulse rounded font-bold" />
            <div className="flex gap-2">
              {['S', 'M', 'L', 'XL'].map((s, i) => (
                <div key={i} className="w-10 h-10 bg-neutral-200 dark:bg-neutral-800 animate-pulse rounded-lg border border-neutral-300/50" />
              ))}
            </div>
          </div>

          {/* Stock Status Badge */}
          <div className="w-full h-9 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 rounded-xl animate-pulse flex items-center justify-between px-4">
            <div className="w-36 h-3.5 bg-emerald-300/40 rounded" />
            <div className="w-16 h-3.5 bg-emerald-300/40 rounded" />
          </div>

          {/* Quantity & Add to Cart Row */}
          <div className="flex items-center gap-3 pt-2">
            <div className="w-24 h-12 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl animate-pulse" />
            <div className="flex-1 h-12 bg-neutral-900 dark:bg-neutral-800 animate-pulse rounded-xl" />
          </div>

          {/* Accordions Skeleton */}
          <div className="space-y-3 pt-4 border-t border-neutral-200 dark:border-neutral-800">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl animate-pulse flex items-center justify-between px-4">
                <div className="w-40 h-4 bg-neutral-300 dark:bg-neutral-700 rounded" />
                <div className="w-4 h-4 bg-neutral-300 dark:bg-neutral-700 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. YOU MAY ALSO LIKE (RELATED PRODUCTS SKELETON) */}
      <div className="mt-16 pt-10 border-t border-neutral-200 dark:border-neutral-800 space-y-6">
        <div className="flex items-center justify-between">
          <div className="w-48 h-6 bg-neutral-300 dark:bg-neutral-700 animate-pulse rounded font-bold" />
          <div className="w-32 h-4 bg-neutral-200 dark:bg-neutral-800 animate-pulse rounded" />
        </div>

        {/* 4 Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-3">
              <div className="w-full aspect-[3/4] bg-neutral-900 animate-pulse rounded-xl relative overflow-hidden border border-neutral-800 flex items-center justify-center">
                <div className="w-16 h-16 border border-amber-500/20 rounded-full animate-pulse" />
              </div>
              <div className="w-4/5 h-4 bg-neutral-200 dark:bg-neutral-800 animate-pulse rounded" />
              <div className="w-20 h-4 bg-neutral-200 dark:bg-neutral-800 animate-pulse rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
