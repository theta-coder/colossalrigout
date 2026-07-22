import React from 'react';

export default function CheckoutSkeleton() {
  return (
    <div className="max-w-6xl mx-auto px-4 pb-16 animate-pulse">
      {/* Header Skeleton */}
      <div className="pt-6 pb-2 flex items-center justify-between border-b border-neutral-200/50 mb-8">
        <div className="h-8 w-36 bg-neutral-300 rounded-md"></div>
        <div className="h-8 w-36 bg-neutral-200 rounded-full"></div>
      </div>

      {/* Grid Layout */}
      <div className="flex flex-col lg:flex-row gap-8 items-start w-full">
        {/* Left Column: Form Skeleton */}
        <div className="flex-1 w-full bg-white rounded-md border border-neutral-200 p-5 sm:p-7 shadow-xs space-y-6">
          {/* Section 1 */}
          <div className="space-y-4">
            <div className="h-5 w-44 bg-neutral-300 rounded"></div>
            <div className="h-3 w-56 bg-neutral-200 rounded"></div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="sm:col-span-2 space-y-1.5">
                <div className="h-3 w-20 bg-neutral-200 rounded"></div>
                <div className="h-10 w-full bg-neutral-200 rounded-md"></div>
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <div className="h-3 w-28 bg-neutral-200 rounded"></div>
                <div className="h-10 w-full bg-neutral-200 rounded-md"></div>
              </div>
              <div className="space-y-1.5">
                <div className="h-3 w-12 bg-neutral-200 rounded"></div>
                <div className="h-10 w-full bg-neutral-200 rounded-md"></div>
              </div>
              <div className="space-y-1.5">
                <div className="h-3 w-16 bg-neutral-200 rounded"></div>
                <div className="h-10 w-full bg-neutral-200 rounded-md"></div>
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <div className="h-3 w-24 bg-neutral-200 rounded"></div>
                <div className="h-10 w-full bg-neutral-200 rounded-md"></div>
              </div>
            </div>
          </div>

          {/* Section 2 */}
          <div className="border-t border-neutral-100 pt-6 space-y-3">
            <div className="h-5 w-36 bg-neutral-300 rounded"></div>
            <div className="h-16 w-full bg-neutral-200 rounded-md"></div>
          </div>
        </div>

        {/* Right Column: Order Summary Skeleton */}
        <div className="w-full lg:w-80 flex-none bg-white rounded-md border border-neutral-200 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="h-5 w-36 bg-neutral-300 rounded"></div>

          <div className="space-y-3 border-b border-neutral-100 pb-4">
            {[1, 2].map((idx) => (
              <div key={idx} className="flex gap-3">
                <div className="w-12 h-14 bg-neutral-200 rounded-md flex-none"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-3/4 bg-neutral-200 rounded"></div>
                  <div className="h-2.5 w-1/2 bg-neutral-200 rounded"></div>
                </div>
                <div className="h-4 w-12 bg-neutral-200 rounded"></div>
              </div>
            ))}
          </div>

          <div className="space-y-2 pt-2 border-b border-neutral-100 pb-4">
            <div className="flex justify-between">
              <div className="h-3.5 w-16 bg-neutral-200 rounded"></div>
              <div className="h-3.5 w-16 bg-neutral-200 rounded"></div>
            </div>
            <div className="flex justify-between">
              <div className="h-3.5 w-16 bg-neutral-200 rounded"></div>
              <div className="h-3.5 w-12 bg-neutral-200 rounded"></div>
            </div>
          </div>

          <div className="flex justify-between items-center py-2">
            <div className="h-4 w-12 bg-neutral-300 rounded"></div>
            <div className="h-6 w-24 bg-neutral-300 rounded"></div>
          </div>

          <div className="h-12 w-full bg-neutral-300 rounded-md"></div>
        </div>
      </div>
    </div>
  );
}
