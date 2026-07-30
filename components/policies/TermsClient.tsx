'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function TermsClient() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Terms & Conditions | Colossal Rigout',
    description: 'Read the official Terms & Conditions of Colossal Rigout. Understand store rules, order acceptance, pricing in PKR, shipping, returns, intellectual property, and Pakistani governing law.',
    url: 'https://colossalrigout.pk/terms',
    publisher: {
      '@type': 'Organization',
      name: 'Colossal Rigout',
      logo: 'https://colossalrigout.pk/colossal-rigout-logo.png',
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="max-w-7xl mx-auto px-4 pb-16">
        {/* HERO BANNER */}
        <section className="relative h-40 sm:h-56 md:h-64 overflow-hidden -mx-4">
          <Image
            src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1920&q=80"
            alt="Colossal Rigout Terms and Conditions Banner"
            fill
            priority
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-black/60"></div>
          <div className="relative z-10 max-w-7xl mx-auto h-full flex flex-col justify-center px-4">
            <h1 className="font-display text-white text-3xl sm:text-4xl font-extrabold tracking-tight">
              TERMS &amp; CONDITIONS
            </h1>
            <p className="text-xs sm:text-sm text-neutral-300 mt-2 font-light max-w-xl">
              Terms of service and store guidelines governing your purchases at Colossal Rigout.
            </p>
          </div>
        </section>

        {/* BREADCRUMBS */}
        <div className="py-4 text-xs sm:text-sm text-neutral-500">
          <Link href="/" className="hover:text-black">Home</Link> <span className="mx-1">/</span>{' '}
          <span className="text-neutral-900 font-medium">Terms &amp; Conditions</span>
        </div>

        {/* MAIN TERMS CONTENT */}
        <section className="max-w-3xl mx-auto pb-16 space-y-6 animate-fade-up">
          {/* HEADER STATEMENT CARD */}
          <div className="bg-white rounded-lg border border-neutral-200/80 p-6 sm:p-8 text-center shadow-sm">
            <h2 className="font-display text-2xl font-extrabold text-neutral-900 mb-3">
              Agreement to Store Terms
            </h2>
            <p className="text-sm text-neutral-600 font-light leading-relaxed max-w-2xl mx-auto">
              Welcome to Colossal Rigout (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;). By accessing or purchasing from <strong className="font-semibold text-neutral-800">https://colossalrigout.pk</strong>, you agree to comply with and be bound by the following Terms &amp; Conditions. Please review these terms carefully before placing an order.
            </p>
          </div>

          {/* 1. STORE TERMS & ELIGIBILITY */}
          <div className="bg-white rounded-lg border border-neutral-200/80 p-6 sm:p-7 shadow-sm">
            <h2 className="font-display text-xl font-bold mb-3 text-neutral-900 tracking-wide">
              1. Store Terms &amp; User Eligibility
            </h2>
            <p className="text-sm text-neutral-600 font-light leading-relaxed mb-3">
              By placing an order on Colossal Rigout, you confirm that you are at least 18 years of age or accessing the website under the supervision of a parent or legal guardian in Pakistan.
            </p>
            <ul className="space-y-2 text-sm text-neutral-600 list-disc pl-5 font-light">
              <li>You agree to provide current, complete, and accurate billing, contact, and delivery information for all purchases.</li>
              <li>You agree not to reproduce, duplicate, copy, or exploit any portion of our store service or products without express written permission.</li>
            </ul>
          </div>

          {/* 2. PRICING, CURRENCY & PRODUCT AVAILABILITY */}
          <div className="bg-white rounded-lg border border-neutral-200/80 p-6 sm:p-7 shadow-sm">
            <h2 className="font-display text-xl font-bold mb-3 text-neutral-900 tracking-wide">
              2. Pricing, Currency &amp; Product Accuracy
            </h2>
            <p className="text-sm text-neutral-600 font-light leading-relaxed mb-3">
              All prices listed on Colossal Rigout are in <strong className="font-semibold text-neutral-800">Pakistani Rupees (PKR)</strong>.
            </p>
            <ul className="space-y-2 text-sm text-neutral-600 list-disc pl-5 font-light">
              <li>We reserve the right to modify prices or adjust product availability at any time without prior notice.</li>
              <li>While we make every effort to display garment colors and textures accurately, actual screen color renditions may vary slightly depending on monitor display settings.</li>
              <li>In the event of an inadvertent pricing or typographical error, we reserve the right to cancel affected orders prior to dispatch and notify you immediately.</li>
            </ul>
          </div>

          {/* 3. ORDER ACCEPTANCE & CANCELLATION POLICY */}
          <div className="bg-white rounded-lg border border-neutral-200/80 p-6 sm:p-7 shadow-sm">
            <h2 className="font-display text-xl font-bold mb-3 text-neutral-900 tracking-wide">
              3. Order Acceptance &amp; Cancellation Policy
            </h2>
            <p className="text-sm text-neutral-600 font-light leading-relaxed mb-3">
              Submitting an order online represents an offer to purchase our products. Order receipt confirmation emails do not signify final order acceptance.
            </p>
            <ul className="space-y-2 text-sm text-neutral-600 list-disc pl-5 font-light">
              <li>Colossal Rigout reserves the right to accept or decline orders for reasons including stock limitations, address verification issues, or suspected fraud.</li>
              <li>Customers may request order cancellation prior to dispatch by contacting support immediately. Once an order is dispatched to courier partners, standard return policies apply.</li>
            </ul>
          </div>

          {/* 4. SHIPPING & DELIVERY */}
          <div className="bg-white rounded-lg border border-neutral-200/80 p-6 sm:p-7 shadow-sm">
            <h2 className="font-display text-xl font-bold mb-3 text-neutral-900 tracking-wide">
              4. Shipping &amp; Delivery Terms
            </h2>
            <p className="text-sm text-neutral-600 font-light leading-relaxed mb-3">
              Deliveries are fulfilled nationwide across Pakistan:
            </p>
            <ul className="space-y-2 text-sm text-neutral-600 list-disc pl-5 font-light">
              <li>Standard shipping is <strong className="font-semibold text-neutral-800">Rs. 250</strong> across Pakistan. Shipping is <strong className="font-semibold text-neutral-800">free</strong> on all orders of <strong className="font-semibold text-neutral-800">Rs. 2,500</strong> or more.</li>
              <li>Orders are shipped through <strong className="font-semibold text-neutral-800">TCS</strong> and are generally delivered within <strong className="font-semibold text-neutral-800">3 to 7 business days</strong>.</li>
              <li>Delivery times may occasionally be affected by circumstances outside our control, including public holidays, harsh weather, remote locations, or courier transit delays.</li>
              <li>For complete logistics guidelines, please consult our official <Link href="/shipping-policy" className="underline font-medium hover:text-black">Shipping Policy</Link>.</li>
            </ul>
          </div>

          {/* 5. RETURNS & EXCHANGES */}
          <div className="bg-white rounded-lg border border-neutral-200/80 p-6 sm:p-7 shadow-sm">
            <h2 className="font-display text-xl font-bold mb-3 text-neutral-900 tracking-wide">
              5. Returns, Exchanges &amp; Refund Terms
            </h2>
            <p className="text-sm text-neutral-600 font-light leading-relaxed mb-3">
              We stand behind product quality with a fair return procedure:
            </p>
            <ul className="space-y-2 text-sm text-neutral-600 list-disc pl-5 font-light">
              <li>Returns and exchanges must be requested within <strong className="font-semibold text-neutral-800">2 days</strong> of receiving your order.</li>
              <li>Items must be unused, unwashed, and returned in original condition with all original tags attached. Approved refunds are processed within 5 to 7 business days.</li>
              <li>For complete return eligibility and step-by-step guidance, please review our official <Link href="/returns" className="underline font-medium hover:text-black">Returns &amp; Exchanges Policy</Link>.</li>
            </ul>
          </div>

          {/* 6. INTELLECTUAL PROPERTY */}
          <div className="bg-white rounded-lg border border-neutral-200/80 p-6 sm:p-7 shadow-sm">
            <h2 className="font-display text-xl font-bold mb-3 text-neutral-900 tracking-wide">
              6. Intellectual Property Rights
            </h2>
            <p className="text-sm text-neutral-600 font-light leading-relaxed">
              All content on <strong className="font-semibold text-neutral-800">colossalrigout.pk</strong>, including trademarks, logos, brand titles, text, imagery, product designs, graphics, and user interface code, are the sole intellectual property of Colossal Rigout and protected under Pakistani copyright and intellectual property laws. Unauthorized reproduction or commercial use is strictly prohibited.
            </p>
          </div>

          {/* 7. LIMITATION OF LIABILITY & GOVERNING LAW */}
          <div className="bg-white rounded-lg border border-neutral-200/80 p-6 sm:p-7 shadow-sm">
            <h2 className="font-display text-xl font-bold mb-3 text-neutral-900 tracking-wide">
              7. Limitation of Liability &amp; Governing Law
            </h2>
            <p className="text-sm text-neutral-600 font-light leading-relaxed mb-3">
              Colossal Rigout shall not be liable for indirect, incidental, or consequential damages arising from the use of our store website, delayed courier transit, or third-party service interruptions.
            </p>
            <p className="text-sm text-neutral-600 font-light leading-relaxed">
              These Terms &amp; Conditions are governed by and construed in accordance with the laws of the <strong className="font-semibold text-neutral-800">Islamic Republic of Pakistan</strong>. Any disputes arising in connection with these terms shall fall under the exclusive jurisdiction of the competent courts of <strong className="font-semibold text-neutral-800">Lahore, Pakistan</strong>.
            </p>
          </div>

          {/* 8. CONTACT INFORMATION */}
          <div className="bg-white rounded-lg border border-neutral-200/80 p-6 sm:p-7 shadow-sm text-center">
            <h2 className="font-display text-xl font-bold mb-2 text-neutral-900">Questions About Our Terms?</h2>
            <p className="text-sm text-neutral-600 font-light mb-6">
              If you have any questions regarding these Terms &amp; Conditions, please reach out to our legal and customer service team.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/contact"
                className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 bg-black text-white text-xs font-bold uppercase tracking-wider rounded hover:bg-neutral-800 transition"
              >
                Contact Support Page
              </Link>
              <a
                href="mailto:colossalrigout@gmail.com"
                className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 border border-neutral-300 text-neutral-800 text-xs font-bold uppercase tracking-wider rounded hover:bg-neutral-100 transition"
              >
                Email Support Team
              </a>
            </div>
            <p className="text-xs text-neutral-400 mt-4 font-light">
              Official Location: Kareem Block, Iqbal Town, Lahore, Pakistan &bull; Phone:{' '}
              <a href="tel:+923284844309" className="hover:text-neutral-900 underline">
                03284844309
              </a>
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
