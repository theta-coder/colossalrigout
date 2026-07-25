'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ReturnsPolicyPayload, validateInternalPath } from '../../lib/returns-policy';

export default function ReturnsClient({ initialData }: { initialData?: ReturnsPolicyPayload | null }) {
  const [data, setData] = useState<ReturnsPolicyPayload | null>(initialData || null);
  const [loading, setLoading] = useState(!initialData);

  useEffect(() => {
    const fetchPolicy = async () => {
      try {
        const res = await fetch('/api/returns-policy');
        const json = await res.json();
        if (res.ok && json.success && json.data) {
          setData(json.data);
        }
      } catch {
        // Fall back to initial/default content gracefully
      } finally {
        setLoading(false);
      }
    };
    fetchPolicy();
  }, []);

  const sanitizeText = (text?: string): string => {
    if (!text) return '';
    return text
      .replace(/12-hour/gi, '2-day')
      .replace(/12 hours/gi, '2 days')
      .replace(/12 hour/gi, '2 day');
  };

  const settings = data?.settings;
  const cta = data?.cta;

  return (
    <div className="max-w-7xl mx-auto px-4 pb-16">
      {/* HERO BANNER */}
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
            {settings?.pageTitle || 'RETURNS & EXCHANGES'}
          </h1>
        </div>
      </section>

      {/* BREADCRUMBS */}
      <div className="py-4 text-xs sm:text-sm text-neutral-500">
        <Link href="/" className="hover:text-black">Home</Link> <span className="mx-1">/</span>{' '}
        <span className="text-neutral-900 font-medium">{settings?.breadcrumbLabel || 'Returns & Exchanges'}</span>
      </div>

      {/* MAIN POLICY CONTENT */}
      <section className="max-w-3xl mx-auto pb-16 space-y-6 animate-fade-up">
        {/* 1. 2-DAY RETURN WINDOW HEADER CARD */}
        <div className="bg-white rounded-lg border border-neutral-200/80 p-6 sm:p-8 text-center shadow-sm">
          <h2 className="font-display text-2xl font-extrabold text-neutral-900 mb-3">
            {sanitizeText(settings?.windowTitle) || '2-Day Return Window'}
          </h2>
          <p className="text-sm text-neutral-600 font-light leading-relaxed max-w-2xl mx-auto">
            {sanitizeText(settings?.windowDescription) ||
              'Customers may request a return or exchange within 2 days of receiving their order. The request must be submitted through our Contact page. Items must remain unused, unwashed, and in their original condition with all tags and packaging attached.'}
          </p>
        </div>

        {/* 2. ELIGIBLE ITEMS */}
        <div className="bg-white rounded-lg border border-neutral-200/80 p-6 sm:p-7 shadow-sm">
          <h2 className="font-display text-xl font-bold mb-3 text-neutral-900 tracking-wide">
            {settings?.conditionsHeading || 'Eligible Items'}
          </h2>
          <p className="text-sm text-neutral-700 font-medium mb-3">Products are eligible only if:</p>
          <ul className="space-y-2 text-sm text-neutral-600 list-disc pl-5 font-light">
            <li>Unused and unwashed</li>
            <li>Original tags attached</li>
            <li>Original packaging included</li>
            <li>No signs of wear, alteration, fragrance, stains, or customer-caused damage</li>
          </ul>
        </div>

        {/* 3. NON-RETURNABLE ITEMS */}
        <div className="bg-white rounded-lg border border-neutral-200/80 p-6 sm:p-7 shadow-sm">
          <h2 className="font-display text-xl font-bold mb-3 text-neutral-900 tracking-wide">Non-Returnable Items</h2>
          <ul className="space-y-2 text-sm text-neutral-600 list-disc pl-5 font-light">
            <li>Sale or clearance products</li>
            <li>Gift cards</li>
            <li>Used or washed products</li>
            <li>Products without original tags</li>
            <li>Items damaged after delivery by the customer</li>
            <li>Items returned after the 2-day request window</li>
          </ul>
        </div>

        {/* 4. DAMAGED OR INCORRECT ORDERS */}
        <div className="bg-white rounded-lg border border-neutral-200/80 p-6 sm:p-7 shadow-sm">
          <h2 className="font-display text-xl font-bold mb-3 text-neutral-900 tracking-wide">Damaged or Incorrect Orders</h2>
          <p className="text-sm text-neutral-600 leading-relaxed font-light">
            If a customer receives a damaged, defective, or incorrect item, they must contact us within 2 days of delivery and provide their order number, clear photos, and a description of the issue. After verification, we may offer a replacement, exchange, or refund.
          </p>
        </div>

        {/* 5. EXCHANGE POLICY */}
        <div className="bg-white rounded-lg border border-neutral-200/80 p-6 sm:p-7 shadow-sm">
          <h2 className="font-display text-xl font-bold mb-3 text-neutral-900 tracking-wide">Exchange Policy</h2>
          <p className="text-sm text-neutral-600 leading-relaxed font-light">
            Eligible items may be exchanged for another size or colour, subject to stock availability. Exchanges are processed only after the returned item has been received and inspected.
          </p>
        </div>

        {/* 6. REFUND POLICY */}
        <div className="bg-white rounded-lg border border-neutral-200/80 p-6 sm:p-7 shadow-sm">
          <h2 className="font-display text-xl font-bold mb-3 text-neutral-900 tracking-wide">Refund Policy</h2>
          <p className="text-sm text-neutral-600 leading-relaxed font-light">
            Approved refunds are processed within 5–7 business days after inspection. The time required for the refund to appear may depend on the payment provider. Cash-on-delivery refunds may be issued through an agreed bank account or supported digital payment method.
          </p>
        </div>

        {/* 7. RETURN SHIPPING */}
        <div className="bg-white rounded-lg border border-neutral-200/80 p-6 sm:p-7 shadow-sm space-y-3">
          <h2 className="font-display text-xl font-bold text-neutral-900 tracking-wide">Return Shipping</h2>
          <p className="text-sm text-neutral-600 leading-relaxed font-light">
            Approved returns and exchange shipments across Pakistan are handled through our authorized courier partner <strong className="font-semibold text-neutral-800">TCS</strong>.
          </p>
          <p className="text-sm text-neutral-600 leading-relaxed font-light">
            If the return is caused by our mistake, such as a wrong, damaged, or defective item, Colossal Rigout will bear the reasonable return shipping cost.
          </p>
          <p className="text-sm text-neutral-600 leading-relaxed font-light">
            If the customer is returning an item due to size preference, colour preference, change of mind, or another personal reason, the customer will pay the return shipping cost.
          </p>
        </div>

        {/* 8. HOW TO REQUEST A RETURN OR EXCHANGE */}
        <div className="bg-white rounded-lg border border-neutral-200/80 p-6 sm:p-7 shadow-sm">
          <h2 className="font-display text-xl font-bold mb-4 text-neutral-900 tracking-wide">How to Request a Return or Exchange</h2>
          <ol className="space-y-3.5 text-sm text-neutral-600 font-light">
            <li className="flex gap-3 items-start">
              <span className="flex-none w-6 h-6 rounded-full bg-black text-white text-xs font-semibold flex items-center justify-center mt-0.5">1</span>
              <span className="leading-relaxed">Open the Contact page within 2 days of delivery.</span>
            </li>
            <li className="flex gap-3 items-start">
              <span className="flex-none w-6 h-6 rounded-full bg-black text-white text-xs font-semibold flex items-center justify-center mt-0.5">2</span>
              <span className="leading-relaxed">Provide your order number and contact details.</span>
            </li>
            <li className="flex gap-3 items-start">
              <span className="flex-none w-6 h-6 rounded-full bg-black text-white text-xs font-semibold flex items-center justify-center mt-0.5">3</span>
              <span className="leading-relaxed">Explain whether you need a return or exchange.</span>
            </li>
            <li className="flex gap-3 items-start">
              <span className="flex-none w-6 h-6 rounded-full bg-black text-white text-xs font-semibold flex items-center justify-center mt-0.5">4</span>
              <span className="leading-relaxed">Upload or send clear photos if the item is damaged, defective, or incorrect.</span>
            </li>
            <li className="flex gap-3 items-start">
              <span className="flex-none w-6 h-6 rounded-full bg-black text-white text-xs font-semibold flex items-center justify-center mt-0.5">5</span>
              <span className="leading-relaxed">Wait for approval and return instructions.</span>
            </li>
            <li className="flex gap-3 items-start">
              <span className="flex-none w-6 h-6 rounded-full bg-black text-white text-xs font-semibold flex items-center justify-center mt-0.5">6</span>
              <span className="leading-relaxed">Do not send any item back before receiving approval.</span>
            </li>
          </ol>
        </div>

        {/* 9. IMPORTANT CONDITIONS */}
        <div className="bg-white rounded-lg border border-neutral-200/80 p-6 sm:p-7 shadow-sm">
          <h2 className="font-display text-xl font-bold mb-3 text-neutral-900 tracking-wide">Important Conditions</h2>
          <p className="text-sm text-neutral-600 leading-relaxed font-light">
            Returns sent without approval may not be accepted. Colossal Rigout reserves the right to reject a return if the product does not meet the stated conditions. Original delivery charges are non-refundable unless the order was incorrect, damaged, or defective.
          </p>
        </div>

        {/* LAST UPDATED LINE */}
        <div className="text-center pt-2 pb-2">
          <p className="text-xs text-neutral-400 italic">Last updated: July 2026</p>
        </div>

        {/* NEED HELP SECTION */}
        <div className="bg-black text-white rounded-lg p-6 sm:p-8 text-center shadow-lg flex flex-col items-center">
          <h2 className="font-display text-xl font-bold mb-2">
            {cta?.heading || 'Need Help?'}
          </h2>
          <p className="text-neutral-300 text-xs sm:text-sm mb-5 max-w-md font-light leading-relaxed">
            {cta?.description || 'For return or exchange assistance, contact our support team through the Contact page.'}
          </p>
          <Link
            href={validateInternalPath(cta?.buttonPath) || '/contact'}
            aria-label="Contact Colossal Rigout support for returns and exchanges"
            className="inline-block bg-white text-black text-xs font-bold px-7 py-3 rounded-md hover:bg-neutral-200 transition active:scale-95 shadow uppercase tracking-wider"
          >
            {cta?.buttonLabel || 'CONTACT US'}
          </Link>
        </div>
      </section>
    </div>
  );
}
