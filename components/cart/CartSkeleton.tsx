import React from 'react';

export default function CartSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 pb-16 animate-pulse">
      {/* Breadcrumb Skeleton */}
      <div className="py-4 flex items-center gap-2">
        <div className="h-3 w-12 bg-neutral-200 rounded"></div>
        <span className="text-neutral-300">/</span>
        <div className="h-3 w-24 bg-neutral-300 rounded"></div>
      </div>

      {/* Title & Count Skeleton */}
      <div className="pb-4">
        <div className="h-8 w-40 bg-neutral-300 rounded-md"></div>
        <div className="h-4 w-32 bg-neutral-200 rounded mt-2"></div>
      </div>

      {/* Main Layout Grid */}
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Left Column: Cart Items Skeleton List */}
        <div className="flex-1 w-full bg-white rounded-lg border border-neutral-200 divide-y divide-neutral-100 shadow-xs">
          {[1, 2, 3].map((idx) => (
            <div key={idx} className="flex gap-4 p-4 sm:p-5">
              {/* Product Image Placeholder */}
              <div className="w-20 h-24 sm:w-24 sm:h-28 flex-none rounded-md bg-neutral-200"></div>

              {/* Product Details Placeholder */}
              <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                <div className="space-y-2">
                  <div className="h-4 bg-neutral-200 rounded w-44 sm:w-60"></div>
                  <div className="h-3 bg-neutral-200 rounded w-28"></div>
                  <div className="h-4 bg-neutral-200 rounded w-20 sm:hidden"></div>
                </div>

                {/* Qty Controls & Price Placeholder */}
                <div className="flex items-center gap-4">
                  <div className="h-8 w-24 bg-neutral-200 rounded"></div>
                  <div className="hidden sm:block h-4 w-16 bg-neutral-200 rounded"></div>
                  <div className="h-6 w-6 bg-neutral-200 rounded-full"></div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Right Column: Order Summary Skeleton Box */}
        <div className="w-full lg:w-96 bg-white rounded-lg border border-neutral-200 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="h-5 w-36 bg-neutral-300 rounded"></div>

          <div className="space-y-3 pb-4 border-b border-neutral-200">
            <div className="flex justify-between items-center">
              <div className="h-4 w-16 bg-neutral-200 rounded"></div>
              <div className="h-4 w-20 bg-neutral-200 rounded"></div>
            </div>
            <div className="flex justify-between items-center">
              <div className="h-4 w-28 bg-neutral-200 rounded"></div>
              <div className="h-4 w-12 bg-neutral-200 rounded"></div>
            </div>
          </div>

          <div className="py-2 space-y-2 border-b border-neutral-200">
            <div className="h-3 w-20 bg-neutral-200 rounded"></div>
            <div className="flex gap-2">
              <div className="h-9 flex-1 bg-neutral-200 rounded"></div>
              <div className="h-9 w-16 bg-neutral-300 rounded"></div>
            </div>
          </div>

          <div className="py-2 flex justify-between items-center">
            <div className="h-5 w-12 bg-neutral-300 rounded"></div>
            <div className="h-7 w-24 bg-neutral-300 rounded"></div>
          </div>

          <div className="h-12 w-full bg-neutral-300 rounded-md"></div>
        </div>
      </div>
    </div>
  );
}
