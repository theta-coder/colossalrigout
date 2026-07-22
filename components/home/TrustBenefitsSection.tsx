import React from 'react';
import { Truck, RotateCcw, ShieldCheck, MapPin, Headphones, Gift } from 'lucide-react';
import { getActiveTrustBenefits } from '@/lib/server/homepage';

export default async function TrustBenefitsSection() {
  const benefits = await getActiveTrustBenefits();

  if (!benefits || benefits.length === 0) {
    return null;
  }

  return (
    <div className="border-t border-neutral-200 bg-[#fbfbfa] py-6 sm:py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-y-4 gap-x-3 text-center md:text-left">
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
                className="flex flex-col sm:flex-row items-center gap-2.5 justify-center md:justify-start"
              >
                <Icon className="w-5 h-5 text-neutral-800 shrink-0" aria-hidden="true" />
                <div>
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
