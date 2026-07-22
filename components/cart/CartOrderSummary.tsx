'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Tag, Check, AlertCircle, ShieldCheck, ArrowRight } from 'lucide-react';
import { formatPkr } from '@/lib/utils';
import { CartQuoteResult } from '@/lib/server/commerce-pricing';

interface CartOrderSummaryProps {
  quote: CartQuoteResult;
  onApplyCoupon: (code: string) => Promise<void>;
  onRemoveCoupon: () => void;
  couponCode: string;
  isQuoting?: boolean;
}

export default function CartOrderSummary({
  quote,
  onApplyCoupon,
  onRemoveCoupon,
  couponCode,
  isQuoting = false,
}: CartOrderSummaryProps) {
  const [inputCode, setInputCode] = useState(couponCode);
  const [submitting, setSubmitting] = useState(false);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCode.trim()) return;
    setSubmitting(true);
    await onApplyCoupon(inputCode.trim());
    setSubmitting(false);
  };

  const hasOutOfStockLines = quote.lines.some((l) => !l.inStock);

  return (
    <div className="bg-white border border-neutral-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-5 lg:sticky lg:top-24">
      <h3 className="font-display font-extrabold text-base uppercase tracking-wider text-neutral-900 border-b border-neutral-100 pb-3">
        ORDER SUMMARY
      </h3>

      {/* Breakdown Rows */}
      <div className="space-y-3 text-xs sm:text-sm">
        <div className="flex justify-between text-neutral-600">
          <span>Subtotal</span>
          <span className="font-bold text-neutral-900">{formatPkr(quote.subtotal)}</span>
        </div>

        <div className="flex justify-between text-neutral-600">
          <span>Standard Shipping</span>
          <span className="font-bold text-neutral-900">
            {quote.shippingAmount === 0 ? (
              <span className="text-emerald-700 font-extrabold uppercase">FREE</span>
            ) : (
              formatPkr(quote.shippingAmount)
            )}
          </span>
        </div>

        {/* Applied Promotions Breakdown */}
        {quote.appliedPromotions.map((promo) => (
          <div
            key={promo.id}
            className="flex justify-between items-center bg-emerald-50 text-emerald-800 p-2.5 rounded-lg border border-emerald-200 text-xs animate-fade-in"
          >
            <div className="space-y-0.5">
              <span className="font-bold flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-emerald-600" />
                {promo.name}
              </span>
              <p className="text-[10px] text-emerald-700">{promo.publicMessage}</p>
            </div>
            <span className="font-extrabold font-mono text-emerald-900">
              - {formatPkr(promo.discountAmount)}
            </span>
          </div>
        ))}
      </div>

      {/* Coupon Code Input */}
      <div className="pt-2 border-t border-neutral-100">
        <label className="block text-[10px] font-extrabold text-neutral-500 uppercase tracking-wider mb-1.5">
          PROMO / COUPON CODE
        </label>
        {couponCode ? (
          <div className="flex items-center justify-between bg-neutral-100 p-2.5 rounded-lg border border-neutral-300">
            <span className="font-mono font-bold text-xs text-neutral-900 uppercase">
              {couponCode}
            </span>
            <button
              type="button"
              onClick={onRemoveCoupon}
              className="text-xs font-bold text-red-600 hover:underline cursor-pointer"
            >
              Remove
            </button>
          </div>
        ) : (
          <form onSubmit={handleApply} className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. WELCOME10"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value)}
              className="flex-1 px-3 py-2 text-xs border border-neutral-300 rounded-lg outline-none focus:border-black uppercase font-mono transition bg-neutral-50"
            />
            <button
              type="submit"
              disabled={submitting || isQuoting || !inputCode.trim()}
              className="px-4 py-2 bg-black text-white text-xs font-bold uppercase rounded-lg hover:bg-neutral-800 disabled:opacity-40 transition cursor-pointer"
            >
              {submitting ? '...' : 'APPLY'}
            </button>
          </form>
        )}

        {quote.couponStatus && (
          <p
            className={`text-[11px] font-semibold mt-2 flex items-center gap-1 ${
              quote.couponStatus.valid ? 'text-emerald-700' : 'text-red-600'
            }`}
          >
            {quote.couponStatus.valid ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5" />
            )}
            {quote.couponStatus.message}
          </p>
        )}
      </div>

      {/* Total */}
      <div className="pt-3 border-t border-neutral-200 flex items-baseline justify-between">
        <span className="font-extrabold text-sm uppercase text-neutral-900">GRAND TOTAL</span>
        <span className="font-display font-extrabold text-xl sm:text-2xl text-neutral-900 tracking-tight">
          {formatPkr(quote.total)}
        </span>
      </div>

      {/* Checkout CTA */}
      {hasOutOfStockLines ? (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-center">
          <p className="text-xs font-bold text-red-700 flex items-center justify-center gap-1">
            <AlertCircle className="w-4 h-4" /> Please remove out-of-stock items to checkout
          </p>
        </div>
      ) : (
        <Link
          href="/checkout"
          className="w-full bg-black text-white text-xs font-extrabold py-3.5 rounded-xl flex items-center justify-center gap-2 hover:bg-neutral-800 transition shadow-md uppercase tracking-wider active:scale-95 cursor-pointer"
        >
          PROCEED TO CHECKOUT <ArrowRight className="w-4 h-4" />
        </Link>
      )}

      <div className="text-[10px] text-neutral-400 text-center flex items-center justify-center gap-1">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Guaranteed Safe & Encrypted Checkout
      </div>
    </div>
  );
}
