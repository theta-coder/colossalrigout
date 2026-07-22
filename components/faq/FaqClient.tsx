'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Search, ChevronDown, HelpCircle, RefreshCw } from 'lucide-react';
import { FaqCategory, FaqItem } from '../../lib/faq';

export default function FaqClient() {
  const [activeCat, setActiveCat] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [openFaqs, setOpenFaqs] = useState<Record<string, boolean>>({});

  const [categories, setCategories] = useState<FaqCategory[]>([]);
  const [faqData, setFaqData] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [catRes, faqRes] = await Promise.all([
          fetch('/api/faq-categories'),
          fetch('/api/faqs'),
        ]);
        const catData = await catRes.json();
        const faqJson = await faqRes.json();
        if (cancelled) return;
        if (!catRes.ok || !catData.success) throw new Error(catData.message || 'Failed to load categories.');
        if (!faqRes.ok || !faqJson.success) throw new Error(faqJson.message || 'Failed to load FAQs.');
        setCategories(catData.data || []);
        setFaqData(faqJson.data || []);
      } catch (err: any) {
        if (!cancelled) setError(err.message || 'Something went wrong loading FAQ data.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchData();
    return () => { cancelled = true; };
  }, []);

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    Promise.all([fetch('/api/faq-categories'), fetch('/api/faqs')])
      .then(async ([catRes, faqRes]) => {
        const catData = await catRes.json();
        const faqJson = await faqRes.json();
        if (!catRes.ok || !catData.success) throw new Error(catData.message || 'Failed to load categories.');
        if (!faqRes.ok || !faqJson.success) throw new Error(faqJson.message || 'Failed to load FAQs.');
        setCategories(catData.data || []);
        setFaqData(faqJson.data || []);
      })
      .catch((err: any) => setError(err.message || 'Retry failed.'))
      .finally(() => setLoading(false));
  };

  const categoryTabs = ['All', ...categories.map((c) => c.id)];
  const categoryNameMap = Object.fromEntries(categories.map((c) => [c.id, c.name]));

  const toggleFaq = (key: string) => {
    setOpenFaqs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const filteredFaqs = faqData.filter((faq) => {
    const normalizedSearch = searchQuery.trim().toLowerCase();
    const matchesCategory = activeCat === 'All' || faq.categoryId === activeCat;
    const matchesSearch =
      faq.question.toLowerCase().includes(normalizedSearch) ||
      faq.answer.toLowerCase().includes(normalizedSearch) ||
      (categoryNameMap[faq.categoryId] || '').toLowerCase().includes(normalizedSearch);
    return matchesCategory && matchesSearch;
  });

  const groupedFaqs: Record<string, FaqItem[]> = {};
  categories.forEach((cat) => {
    const items = filteredFaqs.filter((f) => f.categoryId === cat.id);
    if (items.length > 0) {
      groupedFaqs[cat.id] = items;
    }
  });

  return (
    <div className="max-w-7xl mx-auto px-4 pb-16">
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

      <div className="py-4 text-xs sm:text-sm text-neutral-500">
        <Link href="/" className="hover:text-black">Home</Link> <span className="mx-1">/</span>{' '}
        <span className="text-neutral-900 font-medium">FAQ</span>
      </div>

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

      {loading && (
        <section className="max-w-3xl mx-auto pb-16">
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="w-5 h-5 animate-spin text-neutral-400 mr-2" />
            <span className="text-sm text-neutral-500">Loading FAQs…</span>
          </div>
        </section>
      )}

      {!loading && error && (
        <section className="max-w-3xl mx-auto pb-16">
          <div className="text-center py-12 bg-white rounded-md border border-neutral-200">
            <p className="text-sm text-neutral-600 mb-3">{error}</p>
            <button
              onClick={handleRetry}
              className="inline-flex items-center gap-1.5 text-xs font-semibold bg-black text-white px-4 py-2 rounded-md hover:bg-neutral-800 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Try Again
            </button>
          </div>
        </section>
      )}

      {!loading && !error && (
        <>
          <section className="max-w-3xl mx-auto pb-6">
            <div className="flex gap-2 overflow-x-auto cat-scroll">
              {categoryTabs.map((tabId) => {
                const label = tabId === 'All' ? 'All' : (categoryNameMap[tabId] || tabId);
                return (
                  <button
                    key={tabId}
                    onClick={() => setActiveCat(tabId)}
                    aria-pressed={tabId === activeCat}
                    className={`flex-none border rounded-full px-4 py-1.5 text-xs font-medium whitespace-nowrap transition ${
                      tabId === activeCat
                        ? 'bg-black text-white border-black shadow-sm'
                        : 'border-neutral-300 hover:border-black text-neutral-600 bg-white'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="max-w-3xl mx-auto pb-16">
            {faqData.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-md border border-neutral-200">
                <p className="text-sm text-neutral-500">No FAQs are available yet. Please contact our support team.</p>
              </div>
            ) : filteredFaqs.length === 0 ? (
              <p className="text-sm text-neutral-500 text-center py-10 bg-white rounded-md border border-neutral-200">
                No questions match your search. Try another keyword.
              </p>
            ) : (
              <div className="space-y-8 animate-fade-up">
                {Object.keys(groupedFaqs).map((catId) => (
                  <div key={catId}>
                    <p className="font-display text-lg font-bold mb-3 text-neutral-900 tracking-wide">
                      {categoryNameMap[catId] || catId}
                    </p>
                    <div className="divide-y divide-neutral-200 border border-neutral-200 bg-white rounded-md px-4 shadow-sm">
                      {groupedFaqs[catId].map((faq) => {
                        const isOpen = !!openFaqs[faq.id];
                        const answerId = `faq-answer-${faq.id}`;
                        return (
                          <div key={faq.id}>
                            <button
                              onClick={() => toggleFaq(faq.id)}
                              aria-expanded={isOpen}
                              aria-controls={answerId}
                              className="w-full flex items-center justify-between py-4 text-sm font-semibold text-left gap-3 text-neutral-800 hover:text-black"
                            >
                              <span>{faq.question}</span>
                              <ChevronDown
                                className={`w-4 h-4 flex-none text-neutral-400 transition-transform ${
                                  isOpen ? 'rotate-180 text-black' : ''
                                }`}
                              />
                            </button>
                            <div
                              id={answerId}
                              className={`accordion-content transition-all duration-300 ${
                                isOpen ? 'open' : ''
                              }`}
                            >
                              <p className="text-sm text-neutral-600 leading-relaxed pb-4 font-light">
                                {faq.answer}
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
        </>
      )}
    </div>
  );
}
