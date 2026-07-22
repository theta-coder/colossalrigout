'use client';

import React from 'react';
import Image from 'next/image';
import { Trash2, AlertCircle } from 'lucide-react';
import { formatPkr } from '@/lib/utils';
import { QuotedCartLine } from '@/lib/server/commerce-pricing';

interface CartLineItemProps {
  line: QuotedCartLine;
  onChangeQty: (variantId: string, delta: number) => void;
  onRemove: (variantId: string) => void;
}

export default function CartLineItem({ line, onChangeQty, onRemove }: CartLineItemProps) {
  const isOutOfStock = !line.inStock;
  const isMaxStock = line.qty >= line.availableStock;

  return (
    <div className="flex gap-4 p-4 sm:p-5 border-b border-neutral-100 animate-fade-up">
      {/* Image */}
      <div className="relative w-20 h-24 sm:w-24 sm:h-28 flex-none rounded-xl overflow-hidden bg-neutral-100 border border-neutral-200 shadow-2xs">
        <Image
          src={line.img || '/colossal-rigout-logo.png'}
          alt={line.productName}
          fill
          className={`object-cover ${isOutOfStock ? 'opacity-50' : 'opacity-100'}`}
        />
        {isOutOfStock && (
          <span className="absolute inset-0 bg-black/60 text-white text-[9px] font-bold uppercase flex items-center justify-center p-1 text-center">
            OUT OF STOCK
          </span>
        )}
      </div>

      {/* Details & Actions */}
      <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <h4 className="font-semibold text-sm sm:text-base text-neutral-900 leading-tight">
            {line.productName}
          </h4>
          <p className="text-xs text-neutral-500 font-medium">
            Size: <span className="text-neutral-800 font-bold uppercase">{line.sizeName}</span> &middot; Color:{' '}
            <span className="text-neutral-800 font-bold">{line.colorName}</span>
          </p>

          <p className="text-xs font-bold text-neutral-900 mt-1">
            {formatPkr(line.unitPrice)}
          </p>

          {isOutOfStock ? (
            <p className="text-[11px] font-bold text-red-600 flex items-center gap-1 mt-1">
              <AlertCircle className="w-3.5 h-3.5" /> Currently out of stock. Please remove from cart to proceed.
            </p>
          ) : isMaxStock ? (
            <p className="text-[10px] text-amber-600 font-semibold">
              Max available stock reached ({line.availableStock} units)
            </p>
          ) : null}
        </div>

        {/* Quantity Controls & Line Total */}
        <div className="flex items-center justify-between sm:justify-end gap-6 pt-2 sm:pt-0">
          <div className="flex items-center border border-neutral-300 rounded-lg bg-white shadow-2xs">
            <button
              type="button"
              onClick={() => onChangeQty(line.variantId, -1)}
              className="w-8 h-8 flex items-center justify-center text-sm font-bold text-neutral-600 hover:bg-neutral-100 rounded-l-lg transition cursor-pointer"
            >
              -
            </button>
            <span className="w-8 text-center text-xs font-bold text-neutral-900">{line.qty}</span>
            <button
              type="button"
              disabled={isMaxStock || isOutOfStock}
              onClick={() => onChangeQty(line.variantId, 1)}
              className="w-8 h-8 flex items-center justify-center text-sm font-bold text-neutral-600 hover:bg-neutral-100 disabled:opacity-30 rounded-r-lg transition cursor-pointer"
            >
              +
            </button>
          </div>

          <div className="text-right">
            <p className="font-display font-extrabold text-sm sm:text-base text-neutral-900">
              {formatPkr(line.lineTotal)}
            </p>
          </div>

          <button
            type="button"
            onClick={() => onRemove(line.variantId)}
            className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
            title="Remove line item"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
