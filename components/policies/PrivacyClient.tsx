'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function PrivacyClient() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Privacy Policy | Colossal Rigout',
    description: 'Read the official Privacy Policy of Colossal Rigout. Learn how we collect, protect, and handle your personal information, cookies, and order data in Pakistan.',
    url: 'https://colossalrigout.pk/privacy',
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
            alt="Colossal Rigout Privacy Policy Banner"
            fill
            priority
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-black/60"></div>
          <div className="relative z-10 max-w-7xl mx-auto h-full flex flex-col justify-center px-4">
            <h1 className="font-display text-white text-3xl sm:text-4xl font-extrabold tracking-tight">
              PRIVACY POLICY
            </h1>
            <p className="text-xs sm:text-sm text-neutral-300 mt-2 font-light max-w-xl">
              Your privacy and data security are fundamental to our commitment at Colossal Rigout.
            </p>
          </div>
        </section>

        {/* BREADCRUMBS */}
        <div className="py-4 text-xs sm:text-sm text-neutral-500">
          <Link href="/" className="hover:text-black">Home</Link> <span className="mx-1">/</span>{' '}
          <span className="text-neutral-900 font-medium">Privacy Policy</span>
        </div>

        {/* MAIN PRIVACY CONTENT */}
        <section className="max-w-3xl mx-auto pb-16 space-y-6 animate-fade-up">
          {/* HEADER STATEMENT CARD */}
          <div className="bg-white rounded-lg border border-neutral-200/80 p-6 sm:p-8 text-center shadow-sm">
            <h2 className="font-display text-2xl font-extrabold text-neutral-900 mb-3">
              Data Protection &amp; Privacy Commitment
            </h2>
            <p className="text-sm text-neutral-600 font-light leading-relaxed max-w-2xl mx-auto">
              At Colossal Rigout (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;), operating via <strong className="font-semibold text-neutral-800">https://colossalrigout.pk</strong>, we respect your personal privacy and are committed to protecting all personal information you share with us. This Privacy Policy details how we collect, process, store, and safeguard your data when you visit our website, place orders, or communicate with customer support.
            </p>
          </div>

          {/* 1. INFORMATION WE COLLECT */}
          <div className="bg-white rounded-lg border border-neutral-200/80 p-6 sm:p-7 shadow-sm">
            <h2 className="font-display text-xl font-bold mb-3 text-neutral-900 tracking-wide">
              1. Information We Collect
            </h2>
            <p className="text-sm text-neutral-600 font-light leading-relaxed mb-4">
              We collect information to provide seamless order fulfillment, responsive customer support, and an optimized shopping experience.
            </p>
            <ul className="space-y-2 text-sm text-neutral-600 list-disc pl-5 font-light">
              <li><strong className="font-medium text-neutral-800">Personal Identification Data:</strong> Full name, delivery address, city, postal code, phone number, and email address provided during checkout or account creation.</li>
              <li><strong className="font-medium text-neutral-800">Order &amp; Transaction Details:</strong> Products purchased, size selections, billing amounts in PKR, and selected payment method (Cash on Delivery / Direct Bank Transfer).</li>
              <li><strong className="font-medium text-neutral-800">Customer Support Inquiries:</strong> Messages, feedback, phone calls, or emails submitted through our Contact page or support hotline.</li>
              <li><strong className="font-medium text-neutral-800">Technical &amp; Device Information:</strong> IP address, browser type, device specifications, operating system, and pages visited via automated logging tools.</li>
            </ul>
          </div>

          {/* 2. HOW WE USE YOUR INFORMATION */}
          <div className="bg-white rounded-lg border border-neutral-200/80 p-6 sm:p-7 shadow-sm">
            <h2 className="font-display text-xl font-bold mb-3 text-neutral-900 tracking-wide">
              2. How We Use Your Information
            </h2>
            <p className="text-sm text-neutral-600 font-light leading-relaxed mb-3">
              We strictly utilize your data for legitimate business purposes and customer fulfillment:
            </p>
            <ul className="space-y-2 text-sm text-neutral-600 list-disc pl-5 font-light">
              <li>Processing, verifying, and dispatching your orders across Pakistan.</li>
              <li>Sending order confirmation SMS/email and real-time tracking updates.</li>
              <li>Handling customer service inquiries, returns, and exchange requests.</li>
              <li>Ensuring security, preventing fraud, and enforcing our terms of service.</li>
              <li>Analyzing website telemetry via Google Analytics to enhance user navigation.</li>
            </ul>
          </div>

          {/* 3. PAYMENT SECURITY & CASH ON DELIVERY */}
          <div className="bg-white rounded-lg border border-neutral-200/80 p-6 sm:p-7 shadow-sm">
            <h2 className="font-display text-xl font-bold mb-3 text-neutral-900 tracking-wide">
              3. Payment Security &amp; Cash on Delivery
            </h2>
            <p className="text-sm text-neutral-600 font-light leading-relaxed">
              We prioritize transaction safety. For Cash on Delivery (COD) orders, payment details are collected physically upon delivery by authorized courier personnel. For online payments, transaction processing is handled securely over encrypted HTTPS connections. We do not store sensitive payment card credentials on our servers.
            </p>
          </div>

          {/* 4. COOKIES & TRACKING TECHNOLOGIES */}
          <div className="bg-white rounded-lg border border-neutral-200/80 p-6 sm:p-7 shadow-sm">
            <h2 className="font-display text-xl font-bold mb-3 text-neutral-900 tracking-wide">
              4. Cookies &amp; Tracking Technologies
            </h2>
            <p className="text-sm text-neutral-600 font-light leading-relaxed mb-3">
              Cookies are small data files stored on your browser to facilitate essential shopping functionality:
            </p>
            <ul className="space-y-2 text-sm text-neutral-600 list-disc pl-5 font-light">
              <li><strong className="font-medium text-neutral-800">Essential Cookies:</strong> Required to maintain your shopping cart items, session status, and checkout progress.</li>
              <li><strong className="font-medium text-neutral-800">Analytics Cookies:</strong> Utilized by services like Google Analytics to understand aggregate visitor traffic and performance without personally identifying individual users.</li>
              <li><strong className="font-medium text-neutral-800">Google Merchant Center Compliance:</strong> Enables Google Shopping product verification and merchant trust validation.</li>
            </ul>
            <p className="text-sm text-neutral-600 font-light leading-relaxed mt-3">
              You can modify your browser settings to decline non-essential cookies at any time, though some interactive features of our store may be limited as a result.
            </p>
          </div>

          {/* 5. THIRD-PARTY SHARING & LOGISTICS */}
          <div className="bg-white rounded-lg border border-neutral-200/80 p-6 sm:p-7 shadow-sm">
            <h2 className="font-display text-xl font-bold mb-3 text-neutral-900 tracking-wide">
              5. Third-Party Sharing &amp; Logistics Partners
            </h2>
            <p className="text-sm text-neutral-600 font-light leading-relaxed mb-3">
              We do not sell, rent, or trade your personal information to third parties for marketing purposes. Your information is shared only with trusted service partners required to operate our business:
            </p>
            <ul className="space-y-2 text-sm text-neutral-600 list-disc pl-5 font-light">
              <li><strong className="font-medium text-neutral-800">Logistics &amp; Courier Partner:</strong> Orders are shipped through TCS. Necessary customer details (name, delivery address, and phone number) are shared with TCS solely for order delivery and tracking.</li>
              <li><strong className="font-medium text-neutral-800">Infrastructure Providers:</strong> Secure hosting, database, and cloud services (Vercel, Firebase) that process data under strict confidentiality standards.</li>
              <li><strong className="font-medium text-neutral-800">Legal Compliance:</strong> We may disclose information if required by law enforcement or regulatory authorities in the Islamic Republic of Pakistan.</li>
            </ul>
          </div>

          {/* 6. DATA RETENTION & YOUR RIGHTS */}
          <div className="bg-white rounded-lg border border-neutral-200/80 p-6 sm:p-7 shadow-sm">
            <h2 className="font-display text-xl font-bold mb-3 text-neutral-900 tracking-wide">
              6. Data Retention &amp; Your Rights
            </h2>
            <p className="text-sm text-neutral-600 font-light leading-relaxed mb-3">
              We retain personal data only for as long as necessary to fulfill customer orders, resolve inquiries, and comply with statutory accounting requirements in Pakistan.
            </p>
            <p className="text-sm text-neutral-700 font-medium mb-2">Your Data Rights Include:</p>
            <ul className="space-y-2 text-sm text-neutral-600 list-disc pl-5 font-light">
              <li>Requesting access to the personal data we hold about you.</li>
              <li>Requesting corrections to inaccurate or incomplete delivery information.</li>
              <li>Requesting deletion or erasure of your customer account record.</li>
            </ul>
          </div>

          {/* 7. CONTACT REGARDING PRIVACY */}
          <div className="bg-white rounded-lg border border-neutral-200/80 p-6 sm:p-7 shadow-sm text-center">
            <h2 className="font-display text-xl font-bold mb-2 text-neutral-900">Have Questions About Your Privacy?</h2>
            <p className="text-sm text-neutral-600 font-light mb-6">
              Our privacy team is available to assist you with any questions, data requests, or privacy concerns.
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
                Email Privacy Team
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
