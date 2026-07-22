'use client';

import React from 'react';
import { Truck, CheckCircle2 } from 'lucide-react';
import { formatPkr } from '@/lib/utils';

interface FreeShippingProgressProps {
  subtotal: number;
  freeShippingThreshold: number;
  remainingForFreeShipping: number;
}

export default function FreeShippingProgress({
  subtotal,
  freeShippingThreshold,
  remainingForFreeShipping,
}: FreeShippingProgressProps) {
  const percentage = Math.min(
    100,
    Math.round((subtotal / Math.max(1, freeShippingThreshold)) * 100)
  );

  const isFree = remainingForFreeShipping <= 0 && subtotal > 0;

  return (
    <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 space-y-2.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-neutral-800 flex items-center gap-1.5">
          <Truck className="w-4 h-4 text-neutral-600" />
          {isFree ? (
            <span className="text-emerald-700 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> YOU UNLOCKED FREE SHIPPING!
            </span>
          ) : (
            <>
              Add <span className="font-bold text-black">{formatPkr(remainingForFreeShipping)}</span> more for FREE SHIPPING
            </>
          )}
        </span>
        <span className="font-mono font-bold text-[11px] text-neutral-500">{percentage}%</span>
      </div>

      <div className="w-full h-2 bg-neutral-200 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-500 rounded-full ${
            isFree ? 'bg-emerald-500' : 'bg-black'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
