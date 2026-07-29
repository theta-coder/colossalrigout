import React from 'react';
import { Truck, RotateCcw, ShieldCheck, MapPin, Headphones, Gift } from 'lucide-react';
import { getActiveTrustBenefits } from '@/lib/server/homepage';

export default async function TrustBenefitsSection() {
  const benefits = await getActiveTrustBenefits();

  if (!benefits || benefits.length === 0) {
    return null;
  }

  return (
    <div className="border-t border-neutral-200 bg-[#fbfbfa] py-4 sm:py-7">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-x sm:divide-y-0 divide-neutral-200">
          {benefits.map((benefit) => {
            const Icon =
              benefit.icon === 'truck'
                ? Truck
                : benefit.icon === 'returns'
                ? RotateCcw
                : benefit.icon === 'store'
                ? MapPin
                : benefit.icon === 'support'
                ? Headphones
                : benefit.icon === 'gift'
                ? Gift
                : ShieldCheck;

            return (
              <div
                key={benefit.id}
                className="flex min-h-16 w-full items-center justify-center gap-3 px-4 py-4 sm:min-h-14 sm:py-2"
              >
                <Icon className="w-5 h-5 text-neutral-800 shrink-0" aria-hidden="true" />
                <div className="min-w-0 text-left">
                  <p className="font-display font-bold text-xs uppercase tracking-wider text-neutral-900">
                    {benefit.title}
                  </p>
                  <p className="text-neutral-500 text-[10px] mt-0.5">{benefit.subtitle}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
