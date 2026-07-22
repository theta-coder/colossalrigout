'use client';

import React from 'react';

export default function ShopSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 pb-16 pt-4 animate-fade-in font-sans">
      {/* 1. TIMER EXPIRY SALE PROMO BANNER SKELETON */}
      <div className="w-full my-4 rounded-2xl overflow-hidden shadow-md bg-neutral-950 p-6 sm:p-8 relative border border-neutral-800 flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Left Text Content */}
        <div className="space-y-3 w-full md:w-1/2 text-left">
          <div className="w-32 h-4 bg-amber-500/30 animate-pulse rounded-md" />
          <div className="w-56 sm:w-72 h-8 sm:h-10 bg-neutral-800 animate-pulse rounded-lg" />
          <div className="w-44 h-4 bg-amber-400/20 animate-pulse rounded" />
          <div className="w-36 h-3 bg-neutral-800/80 animate-pulse rounded" />
        </div>

        {/* Right Countdown & Button */}
        <div className="flex flex-col items-center md:items-end gap-3 w-full md:w-auto">
          <div className="w-24 h-3 bg-neutral-800 animate-pulse rounded" />
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="w-12 h-14 bg-neutral-900 border border-neutral-800 animate-pulse rounded-lg flex flex-col items-center justify-center gap-1.5"
              >
                <div className="w-6 h-4 bg-neutral-800 rounded" />
                <div className="w-5 h-2 bg-neutral-800/60 rounded" />
              </div>
            ))}
          </div>
          <div className="w-36 h-9 bg-white/20 animate-pulse rounded-lg mt-1" />
        </div>

        {/* Shimmer Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer pointer-events-none" />
      </div>

      {/* 2. BREADCRUMB SKELETON */}
      <div className="py-4 flex items-center gap-2">
        <div className="w-10 h-3.5 bg-neutral-200 dark:bg-neutral-800 animate-pulse rounded" />
        <span className="text-neutral-300">/</span>
        <div className="w-12 h-3.5 bg-neutral-200 dark:bg-neutral-800 animate-pulse rounded" />
      </div>

      {/* 3. QUICK CHIPS BAR SKELETON */}
      <div className="pb-6 flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="flex gap-1.5 p-1 bg-neutral-200/50 dark:bg-neutral-800/50 rounded-full self-start">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="w-14 sm:w-16 h-7 bg-neutral-300/80 dark:bg-neutral-700 animate-pulse rounded-full" />
          ))}
        </div>
        <span className="text-neutral-300 hidden sm:inline">|</span>
        <div className="flex gap-2 overflow-x-auto">
          {[1, 2, 3].map((i) => (
            <div key={i} className="w-24 sm:w-28 h-7 bg-neutral-200 dark:bg-neutral-800 animate-pulse rounded-full border border-neutral-300/40" />
          ))}
        </div>
      </div>

      {/* 4. MAIN SHOP LAYOUT (SIDEBAR + PRODUCT GRID) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* SIDEBAR SKELETON */}
        <div className="hidden lg:block space-y-7">
          {/* Categories */}
          <div className="space-y-3">
            <div className="w-24 h-4 bg-neutral-300 dark:bg-neutral-700 animate-pulse rounded font-bold" />
            {[
              { name: 'w-32', count: 'w-6' },
              { name: 'w-20', count: 'w-5' },
              { name: 'w-16', count: 'w-5' },
              { name: 'w-20', count: 'w-5' },
              { name: 'w-16', count: 'w-5' },
              { name: 'w-24', count: 'w-5' },
            ].map((item, i) => (
              <div key={i} className="flex justify-between items-center pr-2">
                <div className={`${item.name} h-3.5 bg-neutral-200 dark:bg-neutral-800 animate-pulse rounded`} />
                <div className={`${item.count} h-3.5 bg-neutral-200 dark:bg-neutral-800 animate-pulse rounded-full`} />
              </div>
            ))}
          </div>

          {/* Explore Collections */}
          <div className="space-y-3 pt-2">
            <div className="w-36 h-4 bg-neutral-300 dark:bg-neutral-700 animate-pulse rounded font-bold" />
            {['w-28', 'w-24', 'w-28', 'w-20'].map((w, i) => (
              <div key={i} className={`${w} h-3.5 bg-neutral-200 dark:bg-neutral-800 animate-pulse rounded`} />
            ))}
          </div>

          {/* Sizes */}
          <div className="space-y-3 pt-2">
            <div className="w-12 h-4 bg-neutral-300 dark:bg-neutral-700 animate-pulse rounded font-bold" />
            <div className="flex gap-2">
              {['S', 'M', 'L', 'XL'].map((s, i) => (
                <div key={i} className="w-8 h-8 bg-neutral-200 dark:bg-neutral-800 animate-pulse rounded-md border border-neutral-300/40" />
              ))}
            </div>
          </div>

          {/* Colors */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between pr-4">
              <div className="w-16 h-4 bg-neutral-300 dark:bg-neutral-700 animate-pulse rounded font-bold" />
              <div className="w-12 h-3 bg-neutral-200 dark:bg-neutral-800 animate-pulse rounded" />
            </div>
            <div className="flex flex-wrap gap-2.5">
              {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                <div key={i} className="w-7 h-7 bg-neutral-200 dark:bg-neutral-800 animate-pulse rounded-full border border-neutral-300/40" />
              ))}
            </div>
          </div>

          {/* Price Range */}
          <div className="space-y-3 pt-2">
            <div className="w-24 h-4 bg-neutral-300 dark:bg-neutral-700 animate-pulse rounded font-bold" />
            {/* Price Pills */}
            <div className="flex flex-wrap gap-1.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-6 bg-neutral-200 dark:bg-neutral-800 animate-pulse rounded-full w-20" />
              ))}
            </div>
            {/* Min / Max Inputs */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="h-9 bg-neutral-200 dark:bg-neutral-800 animate-pulse rounded-lg" />
              <div className="h-9 bg-neutral-200 dark:bg-neutral-800 animate-pulse rounded-lg" />
            </div>
            {/* Clear Filters Button */}
            <div className="w-full h-9 bg-neutral-200 dark:bg-neutral-800 animate-pulse rounded-md border border-neutral-300/50 mt-2" />
          </div>
        </div>

        {/* PRODUCTS GRID SKELETON */}
        <div className="lg:col-span-3 space-y-6">
          {/* Header Bar (Showing X of Y & Sort Dropdown) */}
          <div className="flex items-center justify-between pb-2 border-b border-neutral-200 dark:border-neutral-800">
            <div className="w-36 h-4 bg-neutral-200 dark:bg-neutral-800 animate-pulse rounded" />
            <div className="w-32 h-8 bg-neutral-200 dark:bg-neutral-800 animate-pulse rounded-md" />
          </div>

          {/* 6 Product Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="space-y-3 group">
                {/* 3:4 Aspect Image Card Skeleton */}
                <div className="w-full aspect-[3/4] bg-neutral-900 animate-pulse rounded-xl relative overflow-hidden flex items-center justify-center border border-neutral-800">
                  <div className="absolute top-3 right-3 w-8 h-8 bg-white/10 dark:bg-neutral-800 rounded-full" />
                  <div className="w-20 h-20 border-2 border-amber-500/20 rounded-full animate-pulse flex items-center justify-center">
                    <div className="w-10 h-10 border-t-2 border-amber-500/30 rounded-full" />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer pointer-events-none" />
                </div>

                {/* Product Name Skeleton */}
                <div className="w-4/5 h-4 bg-neutral-200 dark:bg-neutral-800 animate-pulse rounded" />

                {/* Price Skeleton */}
                <div className="w-24 h-4 bg-neutral-200 dark:bg-neutral-800 animate-pulse rounded" />

                {/* Color Swatch Dots Skeleton */}
                <div className="flex gap-1.5 pt-0.5">
                  <div className="w-3.5 h-3.5 bg-neutral-300 dark:bg-neutral-700 animate-pulse rounded-full" />
                  <div className="w-3.5 h-3.5 bg-neutral-300 dark:bg-neutral-700 animate-pulse rounded-full" />
                </div>
              </div>
            ))}
          </div>

          {/* Load More Button Skeleton */}
          <div className="pt-4 flex justify-center">
            <div className="w-36 h-10 bg-neutral-200 dark:bg-neutral-800 animate-pulse rounded-md border border-neutral-300/50" />
          </div>
        </div>
      </div>
    </div>
  );
}
