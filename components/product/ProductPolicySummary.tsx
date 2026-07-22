'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Truck, RotateCcw, ChevronDown, ShieldCheck } from 'lucide-react';
import { ShippingPolicySettings } from '@/lib/shipping-policy';
import { ReturnsPolicySettings } from '@/lib/returns-policy';
import { formatPkr } from '@/lib/utils';

interface ProductPolicySummaryProps {
  shipping?: ShippingPolicySettings;
  returns?: ReturnsPolicySettings;
}

export default function ProductPolicySummary({
  shipping,
  returns,
}: ProductPolicySummaryProps) {
  const [isOpen, setIsOpen] = useState(false);

  const freeThreshold = shipping?.freeShippingThreshold ?? 5000;
  const flatRate = shipping?.flatRate ?? 500;
  const minDays = shipping?.deliveryMinBusinessDays ?? 4;
  const maxDays = shipping?.deliveryMaxBusinessDays ?? 6;
  const returnDays = returns?.returnWindowDays ?? 30;

  return (
    <div className="border border-neutral-200 rounded-xl overflow-hidden bg-neutral-50/50">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-neutral-100/50 transition cursor-pointer"
      >
        <span className="font-semibold text-xs tracking-wider uppercase text-neutral-900 flex items-center gap-2">
          <Truck className="w-4 h-4 text-neutral-700" /> SHIPPING &amp; RETURNS
        </span>
        <ChevronDown
          className={`w-4 h-4 text-neutral-500 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="px-5 pb-5 pt-1 text-xs text-neutral-600 space-y-4 border-t border-neutral-200/80 animate-fade-in">
          {/* Shipping Highlights */}
          <div className="flex items-start gap-3 bg-white p-3.5 rounded-lg border border-neutral-200">
            <Truck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-neutral-900">
                {shipping?.freeShippingEnabled !== false
                  ? `Free shipping on orders over ${formatPkr(freeThreshold)}.`
                  : `Flat rate delivery across Pakistan.`}
              </p>
              <p className="text-neutral-500 font-light leading-relaxed">
                Standard delivery within {minDays}–{maxDays} business days for {formatPkr(flatRate)} flat rate.
              </p>
              {shipping?.productPageNote && (
                <p className="text-[11px] text-neutral-400 italic mt-1">{shipping.productPageNote}</p>
              )}
            </div>
          </div>

          {/* Returns Highlights */}
          <div className="flex items-start gap-3 bg-white p-3.5 rounded-lg border border-neutral-200">
            <RotateCcw className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-neutral-900">
                {returnDays}-Day Easy Return &amp; Exchange Window
              </p>
              <p className="text-neutral-500 font-light leading-relaxed">
                {returns?.productPageSummary ||
                  'Item must be unworn, undamaged, with original tags intact.'}
              </p>
            </div>
          </div>

          {/* Links to Full Policies */}
          <div className="flex items-center gap-4 pt-1 text-[11px] font-semibold">
            <Link
              href="/shipping-policy"
              className="text-neutral-900 hover:underline flex items-center gap-1"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-neutral-500" /> View Shipping Policy →
            </Link>
            <Link
              href="/returns"
              className="text-neutral-900 hover:underline flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5 text-neutral-500" /> View Returns &amp; Exchanges →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
