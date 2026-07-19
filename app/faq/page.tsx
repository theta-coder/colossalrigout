'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Search, ChevronDown, HelpCircle } from 'lucide-react';

interface FaqItem {
  cat: string;
  q: string;
  a: string;
}

const faqData: FaqItem[] = [
  { cat: 'Orders', q: 'How do I place an order?', a: 'Browse the shop, select your size and color, add to cart, and complete checkout with your shipping and payment details.' },
  { cat: 'Orders', q: 'Can I cancel or change my order?', a: 'Orders can be changed or cancelled within 2 hours of placing them. Contact us immediately with your order number.' },
  { cat: 'Shipping', q: 'How long does delivery take?', a: 'Standard delivery takes 3\u20135 business days within major cities and 5\u20137 days for other areas.' },
  { cat: 'Shipping', q: 'Do you offer free shipping?', a: 'Yes, all orders over $75 ship free. Orders below that have a flat shipping fee at checkout.' },
  { cat: 'Shipping', q: 'Do you ship internationally?', a: 'Currently we only ship within Pakistan. International shipping is coming soon.' },
  { cat: 'Returns', q: 'What is your return policy?', a: 'We offer a 30-day return window on unworn items with tags attached. See our Returns & Exchanges page for full details.' },
  { cat: 'Returns', q: 'How do I start a return?', a: "Go to the Track Order page, enter your order details, and select 'Start a Return', or contact our support team." },
  { cat: 'Payments', q: 'What payment methods do you accept?', a: 'We accept Cash on Delivery.' },
  { cat: 'Payments', q: 'Is Cash on Delivery available?', a: 'Yes, COD is available on all orders within Pakistan at no extra charge.' },
  { cat: 'Sizing', q: 'How do I find my size?', a: 'Check the Size Guide linked on every product page for a full chest, waist, and length chart with measuring tips.' },
  { cat: 'Sizing', q: "What if the size doesn't fit?", a: 'No problem \u2014 exchange it for a different size within 30 days, free of charge.' },
];

export default function FAQ() {
  const [activeCat, setActiveCat] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [openFaqs, setOpenFaqs] = useState<Record<string, boolean>>({});

  const categories = ['All', 'Orders', 'Shipping', 'Returns', 'Payments', 'Sizing'];

  // Toggle single FAQ accordion
  const toggleFaq = (key: string) => {
    setOpenFaqs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Filter list
  const filteredFaqs = faqData.filter((faq) => {
    const matchesCategory = activeCat === 'All' || faq.cat === activeCat;
    const matchesSearch =
      faq.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.a.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Group by category for visual sections
  const groupedFaqs: Record<string, FaqItem[]> = {};
  filteredFaqs.forEach((faq) => {
    if (!groupedFaqs[faq.cat]) {
      groupedFaqs[faq.cat] = [];
    }
    groupedFaqs[faq.cat].push(faq);
  });

  return (
    <div className="max-w-7xl mx-auto px-4 pb-16">
      {/* PAGE HEADER BANNER */}
      <section className="relative h-40 sm:h-56 md:h-64 overflow-hidden -mx-4">
        <Image
          src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1920&q=80"
          alt="FAQ Banner"
          fill
          priority
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-black/50"></div>
        <div className="relative z-10 max-w-7xl mx-auto h-full flex flex-col justify-center px-4">
          <h1 className="font-display text-white text-3xl sm:text-4xl font-extrabold tracking-tight">
            FREQUENTLY ASKED QUESTIONS
          </h1>
        </div>
      </section>

      {/* BREADCRUMB */}
      <div className="py-4 text-xs sm:text-sm text-neutral-500">
        <Link href="/" className="hover:text-black">Home</Link> <span className="mx-1">/</span>{' '}
        <span className="text-neutral-900 font-medium">FAQ</span>
      </div>

      {/* SEARCH */}
      <section className="max-w-2xl mx-auto pb-8 animate-fade-up">
        <div className="flex items-center border border-neutral-300 rounded-full px-4 py-3 bg-white focus-within:border-black transition">
          <input
            type="text"
            placeholder="Search questions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 outline-none text-sm bg-transparent text-neutral-800"
          />
          <Search className="w-4 h-4 text-neutral-500 flex-none" />
        </div>
      </section>

      {/* CATEGORY TABS */}
      <section className="max-w-3xl mx-auto pb-6">
        <div className="flex gap-2 overflow-x-auto cat-scroll">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setActiveCat(c)}
              className={`flex-none border rounded-full px-4 py-1.5 text-xs font-medium whitespace-nowrap transition ${
                c === activeCat
                  ? 'bg-black text-white border-black shadow-sm'
                  : 'border-neutral-300 hover:border-black text-neutral-600 bg-white'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </section>

      {/* FAQ LIST */}
      <section className="max-w-3xl mx-auto pb-16">
        {filteredFaqs.length === 0 ? (
          <p className="text-sm text-neutral-500 text-center py-10 bg-white rounded-md border border-neutral-200">
            No questions match your search. Try another keyword.
          </p>
        ) : (
          <div className="space-y-8 animate-fade-up">
            {Object.keys(groupedFaqs).map((cat) => (
              <div key={cat}>
                <p className="font-display text-lg font-bold mb-3 text-neutral-900 tracking-wide">{cat}</p>
                <div className="divide-y divide-neutral-200 border border-neutral-200 bg-white rounded-md px-4 shadow-sm">
                  {groupedFaqs[cat].map((faq, i) => {
                    const key = `${cat}-${i}`;
                    const isOpen = !!openFaqs[key];
                    return (
                      <div key={key}>
                        <button
                          onClick={() => toggleFaq(key)}
                          className="w-full flex items-center justify-between py-4 text-sm font-semibold text-left gap-3 text-neutral-800 hover:text-black"
                        >
                          <span>{faq.q}</span>
                          <ChevronDown
                            className={`w-4 h-4 flex-none text-neutral-400 transition-transform ${
                              isOpen ? 'rotate-180 text-black' : ''
                            }`}
                          />
                        </button>
                        <div
                          className={`accordion-content transition-all duration-300 ${
                            isOpen ? 'open' : ''
                          }`}
                        >
                          <p className="text-sm text-neutral-600 leading-relaxed pb-4 font-light">
                            {faq.a}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* CAN'T FIND ANSWER PROMO */}
        <div className="bg-black text-white rounded-md p-6 text-center mt-10 shadow-lg flex flex-col items-center">
          <HelpCircle className="w-5 h-5 text-neutral-400 mb-1" />
          <p className="font-semibold text-sm mb-1">Can&apos;t find your answer?</p>
          <p className="text-neutral-300 text-xs mb-4 max-w-xs font-light">
            Please feel free to contact our support team. We are here to help you!
          </p>
          <Link
            href="/contact"
            className="inline-block bg-white text-black text-xs font-semibold px-6 py-2.5 rounded-md hover:bg-neutral-200 transition active:scale-95"
          >
            CONTACT US
          </Link>
        </div>
      </section>
    </div>
  );
}
