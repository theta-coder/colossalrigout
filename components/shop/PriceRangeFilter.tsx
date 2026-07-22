'use client';

import React from 'react';
import { formatPkr } from '@/lib/utils';
import { X } from 'lucide-react';

interface PriceRangeFilterProps {
  minBound: number;
  maxBound: number;
  selectedMinPrice: number | null;
  selectedMaxPrice: number | null;
  onChange: (min: number | null, max: number | null) => void;
}

export default function PriceRangeFilter({
  minBound,
  maxBound,
  selectedMinPrice,
  selectedMaxPrice,
  onChange,
}: PriceRangeFilterProps) {
  const currentMin = selectedMinPrice !== null ? selectedMinPrice : '';
  const currentMax = selectedMaxPrice !== null ? selectedMaxPrice : '';

  const presets = [
    { label: 'All Prices', min: null, max: null },
    { label: '< PKR 3,000', min: null, max: 3000 },
    { label: '3,000 - 6,000', min: 3000, max: 6000 },
    { label: '6,000 - 10,000', min: 6000, max: 10000 },
    { label: 'PKR 10,000+', min: 10000, max: null },
  ];

  const hasCustomFilter = selectedMinPrice !== null || selectedMaxPrice !== null;

  return (
    <div className="space-y-3 font-sans">
      {/* PRESET PRICE PILLS */}
      <div className="flex flex-wrap gap-1.5">
        {presets.map((p, idx) => {
          const isActive = selectedMinPrice === p.min && selectedMaxPrice === p.max;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => onChange(p.min, p.max)}
              className={`text-xs px-3 py-1.5 rounded-full border transition cursor-pointer font-semibold ${
                isActive
                  ? 'bg-black text-white border-black shadow-xs'
                  : 'bg-white text-neutral-700 border-neutral-300 hover:border-black hover:text-black'
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {/* NUMERIC MIN & MAX PRICE INPUTS */}
      <div className="grid grid-cols-2 gap-2 pt-1">
        <div>
          <label className="text-[10px] uppercase font-bold text-neutral-400 block mb-1">
            Min Price (PKR)
          </label>
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-neutral-400">
              Rs.
            </span>
            <input
              type="number"
              placeholder={String(minBound || 0)}
              value={currentMin}
              onChange={(e) => {
                const val = e.target.value === '' ? null : Number(e.target.value);
                onChange(val, selectedMaxPrice);
              }}
              className="w-full pl-9 pr-2.5 py-2 text-xs font-bold border border-neutral-300 rounded-lg focus:border-black focus:ring-1 focus:ring-black outline-none bg-white text-neutral-900 shadow-2xs"
            />
          </div>
        </div>

        <div>
          <label className="text-[10px] uppercase font-bold text-neutral-400 block mb-1">
            Max Price (PKR)
          </label>
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-neutral-400">
              Rs.
            </span>
            <input
              type="number"
              placeholder={String(maxBound || 10000)}
              value={currentMax}
              onChange={(e) => {
                const val = e.target.value === '' ? null : Number(e.target.value);
                onChange(selectedMinPrice, val);
              }}
              className="w-full pl-9 pr-2.5 py-2 text-xs font-bold border border-neutral-300 rounded-lg focus:border-black focus:ring-1 focus:ring-black outline-none bg-white text-neutral-900 shadow-2xs"
            />
          </div>
        </div>
      </div>

      {/* ACTIVE PRICE SUMMARY CARD */}
      {hasCustomFilter && (
        <div className="flex items-center justify-between bg-neutral-900 text-white px-3 py-2.5 rounded-xl text-xs font-semibold shadow-xs animate-fade-in">
          <span className="text-neutral-400 text-[10px] uppercase font-bold tracking-wider">
            Price Filter:
          </span>
          <div className="flex items-center gap-2">
            <span className="font-bold text-white tracking-tight">
              {selectedMinPrice !== null ? formatPkr(selectedMinPrice) : formatPkr(minBound)} &mdash;{' '}
              {selectedMaxPrice !== null ? formatPkr(selectedMaxPrice) : formatPkr(maxBound)}
            </span>
            <button
              onClick={() => onChange(null, null)}
              className="p-1 text-neutral-400 hover:text-white transition rounded-full hover:bg-neutral-800"
              title="Reset price filter"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
