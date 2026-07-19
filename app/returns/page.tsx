'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ShieldAlert, ArrowRight, HelpCircle } from 'lucide-react';

export default function ReturnsPolicy() {
  return (
    <div className="max-w-7xl mx-auto px-4 pb-16">
      {/* PAGE HEADER BANNER */}
      <section className="relative h-40 sm:h-56 md:h-64 overflow-hidden -mx-4">
        <Image
          src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1920&q=80"
          alt="Returns and exchanges banner"
          fill
          priority
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-black/50"></div>
        <div className="relative z-10 max-w-7xl mx-auto h-full flex flex-col justify-center px-4">
          <h1 className="font-display text-white text-3xl sm:text-4xl font-extrabold tracking-tight">
            RETURNS &amp; EXCHANGES
          </h1>
        </div>
      </section>

      {/* BREADCRUMB */}
      <div className="py-4 text-xs sm:text-sm text-neutral-500">
        <Link href="/" className="hover:text-black">Home</Link> <span className="mx-1">/</span>{' '}
        <span className="text-neutral-900 font-medium">Returns &amp; Exchanges</span>
      </div>

      {/* CONTENT */}
      <section className="max-w-3xl mx-auto pb-16 animate-fade-up">
        <div className="bg-white rounded-md border border-neutral-200 p-6 sm:p-8 mb-8 text-center shadow-sm">
          <p className="font-display text-2xl font-extrabold text-neutral-900">30-Day Return Window</p>
          <p className="text-sm text-neutral-600 mt-2 font-light">
            Not the right fit? Send it back within 30 days of delivery for a full refund or exchange.
          </p>
        </div>

        <h2 className="font-display text-xl font-bold mb-3 text-neutral-900 tracking-wide flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-neutral-800" /> Return Conditions
        </h2>
        <ul className="space-y-2.5 text-sm text-neutral-600 mb-8 list-disc pl-5 font-light">
          <li>Item must be unworn, unwashed, and in original condition</li>
          <li>All original tags must still be attached</li>
          <li>Item must be in its original packaging where possible</li>
          <li>Sale/clearance items marked &ldquo;Final Sale&rdquo; are not eligible for return</li>
          <li>Undergarments and accessories worn against skin are non-returnable for hygiene reasons</li>
        </ul>

        <h2 className="font-display text-xl font-bold mb-4 text-neutral-900 tracking-wide">How to Return an Item</h2>
        <ol className="space-y-5 mb-8">
          <li className="flex gap-4 items-start">
            <span className="flex-none w-8 h-8 rounded-full bg-black text-white text-sm font-semibold flex items-center justify-center shadow-sm">
              1
            </span>
            <div>
              <p className="text-sm font-semibold text-neutral-900">Start your return</p>
              <p className="text-xs text-neutral-500 mt-0.5 font-light">
                Go to <Link href="/track-order" className="underline font-normal text-black">Track Order</Link> and enter your order details, or contact us with your order number.
              </p>
            </div>
          </li>
          <li className="flex gap-4 items-start">
            <span className="flex-none w-8 h-8 rounded-full bg-black text-white text-sm font-semibold flex items-center justify-center shadow-sm">
              2
            </span>
            <div>
              <p className="text-sm font-semibold text-neutral-900">Pack your item</p>
              <p className="text-xs text-neutral-500 mt-0.5 font-light">
                Repack the item with tags attached in its original or similar packaging.
              </p>
            </div>
          </li>
          <li className="flex gap-4 items-start">
            <span className="flex-none w-8 h-8 rounded-full bg-black text-white text-sm font-semibold flex items-center justify-center shadow-sm">
              3
            </span>
            <div>
              <p className="text-sm font-semibold text-neutral-900">Hand it over for pickup</p>
              <p className="text-xs text-neutral-500 mt-0.5 font-light">
                Our courier partner will collect the package from your address within 2&ndash;3 days.
              </p>
            </div>
          </li>
          <li className="flex gap-4 items-start">
            <span className="flex-none w-8 h-8 rounded-full bg-black text-white text-sm font-semibold flex items-center justify-center shadow-sm">
              4
            </span>
            <div>
              <p className="text-sm font-semibold text-neutral-900">Get your refund or exchange</p>
              <p className="text-xs text-neutral-500 mt-0.5 font-light">
                Once received and inspected, refunds are processed within 5&ndash;7 business days.
              </p>
            </div>
          </li>
        </ol>

        <h2 className="font-display text-xl font-bold mb-3 text-neutral-900 tracking-wide">Refund Timeline</h2>
        <p className="text-sm text-neutral-600 mb-8 leading-relaxed font-light">
          Cash on Delivery orders are refunded via bank transfer or store credit within 5&ndash;7 business days of us receiving your return.
        </p>

        <h2 className="font-display text-xl font-bold mb-3 text-neutral-900 tracking-wide">Exchanges</h2>
        <p className="text-sm text-neutral-600 mb-8 leading-relaxed font-light">
          Need a different size or color? Select &ldquo;Exchange&rdquo; instead of &ldquo;Refund&rdquo; when starting your return &mdash; we&apos;ll ship the replacement as soon as your original item is picked up.
        </p>

        <div className="bg-black text-white rounded-md p-6 text-center shadow-lg flex flex-col items-center">
          <HelpCircle className="w-5 h-5 text-purple-400 mb-1" />
          <p className="font-semibold text-sm mb-1">Still have questions?</p>
          <p className="text-neutral-300 text-xs mb-4 max-w-xs font-light">
            Our support team is happy to help with any return or exchange queries.
          </p>
          <Link
            href="/contact"
            className="inline-block bg-white text-black text-xs font-semibold px-6 py-2.5 rounded-md hover:bg-neutral-200 transition active:scale-95 shadow"
          >
            CONTACT US
          </Link>
        </div>
      </section>
    </div>
  );
}
