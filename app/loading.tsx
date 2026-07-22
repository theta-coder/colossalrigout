import React from 'react';

export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8 animate-pulse space-y-6">
      <div className="flex items-center gap-2">
        <div className="h-3 w-16 bg-neutral-200 rounded"></div>
        <span className="text-neutral-300">/</span>
        <div className="h-3 w-28 bg-neutral-200 rounded"></div>
      </div>
      <div className="h-8 w-48 bg-neutral-300 rounded-md"></div>
      <div className="w-full h-64 bg-white border border-neutral-200 rounded-2xl shadow-xs p-6 space-y-4">
        <div className="h-5 w-1/3 bg-neutral-200 rounded"></div>
        <div className="h-4 w-2/3 bg-neutral-200 rounded"></div>
        <div className="h-4 w-1/2 bg-neutral-200 rounded"></div>
      </div>
    </div>
  );
}
