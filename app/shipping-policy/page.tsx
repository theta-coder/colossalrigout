'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Truck, DollarSign, PackageOpen, Globe, AlertTriangle } from 'lucide-react';

export default function ShippingPolicy() {
  const policies = [
    {
      title: 'Delivery Times',
      desc: 'Orders are typically processed within 1&ndash;2 business days. Standard delivery takes 4&ndash;6 business days once dispatched, while Express delivery arrives within 1&ndash;2 business days. Delivery estimates are shown at checkout based on your location and chosen shipping method.',
      icon: Truck,
    },
    {
      title: 'Shipping Charges',
      desc: 'Standard shipping is a flat $5.00 within Pakistan, and Express shipping is $12.00. Orders over $75 qualify for free standard shipping automatically at checkout. Any applicable charges are calculated and shown before you confirm your order.',
      icon: DollarSign,
    },
    {
      title: 'Order Tracking',
      desc: "Once your order ships, you'll receive a confirmation with your Order ID. Use it along with your email or phone number on our Track Order page to follow your order's status in real time, from Placed to Delivered.",
      icon: PackageOpen,
    },
    {
      title: 'International Shipping',
      desc: "At this time, Colossal Rigout ships within Pakistan only. We're working on expanding to international destinations &mdash; sign up for our newsletter to be the first to know when that becomes available.",
      icon: Globe,
    },
    {
      title: 'Delays & Exceptions',
      desc: "Occasionally, deliveries may be delayed due to weather, public holidays, or high order volume during sale periods. If your order is taking longer than expected, please reach out to our support team and we'll help track it down.",
      icon: AlertTriangle,
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 pb-16">
      {/* PAGE HEADER BANNER */}
      <section className="relative h-40 sm:h-56 md:h-64 overflow-hidden -mx-4">
        <Image
          src="https://images.unsplash.com/photo-1494412651409-8963ce7935a7?auto=format&fit=crop&w=1920&q=80"
          alt="Shipping policy background"
          fill
          priority
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-black/50"></div>
        <div className="relative z-10 max-w-7xl mx-auto h-full flex flex-col justify-center px-4">
          <h1 className="font-display text-white text-3xl sm:text-4xl font-extrabold tracking-tight">
            SHIPPING POLICY
          </h1>
        </div>
      </section>

      {/* BREADCRUMB */}
      <div className="py-4 text-xs sm:text-sm text-neutral-500">
        <Link href="/" className="hover:text-black">Home</Link> <span className="mx-1">/</span>{' '}
        <span className="text-neutral-900 font-medium">Shipping Policy</span>
      </div>

      {/* CONTENT */}
      <section className="max-w-3xl mx-auto pb-16 animate-fade-up">
        <div className="bg-white border border-neutral-200 rounded-md p-6 sm:p-10 space-y-9 shadow-sm">
          {policies.map((p, idx) => {
            const Icon = p.icon;
            return (
              <div key={idx} className="flex gap-4 items-start">
                <div className="bg-neutral-100 p-2.5 rounded-full flex-none mt-1">
                  <Icon className="w-5 h-5 text-neutral-800" />
                </div>
                <div>
                  <h2 className="font-display text-lg font-bold mb-2 text-neutral-900 tracking-wide">{p.title}</h2>
                  <p
                    className="text-neutral-700 text-sm leading-relaxed font-light"
                    dangerouslySetInnerHTML={{ __html: p.desc }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
