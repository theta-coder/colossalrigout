'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ShieldAlert, HelpCircle, RefreshCw, AlertCircle, RotateCcw } from 'lucide-react';
import { ReturnsPolicyPayload, validateInternalPath } from '../../lib/returns-policy';

export default function ReturnsClient() {
  const [data, setData] = useState<ReturnsPolicyPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPolicy = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/returns-policy');
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Failed to load returns policy.');
      setData(json.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load returns policy.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicy();
  }, []);

  const settings = data?.settings;
  const conditions = data?.conditions || [];
  const steps = data?.steps || [];
  const infoSections = data?.infoSections || [];
  const cta = data?.cta;

  return (
    <div className="max-w-7xl mx-auto px-4 pb-16">
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

      <div className="py-4 text-xs sm:text-sm text-neutral-500">
        <Link href="/" className="hover:text-black">Home</Link> <span className="mx-1">/</span>{' '}
        <span className="text-neutral-900 font-medium">{settings?.breadcrumbLabel || 'Returns & Exchanges'}</span>
      </div>

      {loading && (
        <section className="max-w-3xl mx-auto pb-16">
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-5 h-5 animate-spin text-neutral-400 mr-2" />
            <span className="text-sm text-neutral-500">Loading returns policy…</span>
          </div>
        </section>
      )}

      {!loading && error && (
        <section className="max-w-3xl mx-auto pb-16">
          <div className="text-center py-12 bg-white rounded-md border border-neutral-200">
            <AlertCircle className="w-6 h-6 text-red-500 mx-auto mb-2" />
            <p className="text-sm text-neutral-600 mb-3">{error}</p>
            <button
              onClick={fetchPolicy}
              className="inline-flex items-center gap-1.5 text-xs font-semibold bg-black text-white px-4 py-2 rounded-md hover:bg-neutral-800 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Try Again
            </button>
          </div>
        </section>
      )}

      {!loading && !error && settings && !settings.active && (
        <section className="max-w-3xl mx-auto pb-16">
          <div className="text-center py-16 bg-neutral-50 rounded-xl border border-neutral-200">
            <RotateCcw className="w-8 h-8 text-neutral-400 mx-auto mb-3" />
            <h3 className="font-display text-lg font-bold text-neutral-900">Returns Policy Updating</h3>
            <p className="text-sm text-neutral-500 mt-2 max-w-sm mx-auto font-light">
              Our returns policy is currently being updated. Please contact our support team for any queries regarding your order.
            </p>
            <div className="mt-6">
              <Link href="/contact" className="inline-block bg-black text-white text-xs font-bold px-6 py-2.5 rounded-md hover:bg-neutral-800 transition">
                CONTACT SUPPORT
              </Link>
            </div>
          </div>
        </section>
      )}

      {!loading && !error && settings && settings.active !== false && (
        <section className="max-w-3xl mx-auto pb-16 animate-fade-up">
          {settings.windowTitle && (
            <div className="bg-white rounded-md border border-neutral-200 p-6 sm:p-8 mb-8 text-center shadow-sm">
              <p className="font-display text-2xl font-extrabold text-neutral-900">{settings.windowTitle}</p>
              {settings.windowDescription && (
                <p className="text-sm text-neutral-600 mt-2 font-light whitespace-pre-line">
                  {settings.windowDescription}
                </p>
              )}
            </div>
          )}

          {conditions.length > 0 && (
            <div className="mb-8">
              <h2 className="font-display text-xl font-bold mb-3 text-neutral-900 tracking-wide flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-neutral-800" /> {settings.conditionsHeading || 'Return Conditions'}
              </h2>
              <ul className="space-y-2.5 text-sm text-neutral-600 list-disc pl-5 font-light">
                {conditions.map((c) => (
                  <li key={c.id}>{c.text}</li>
                ))}
              </ul>
            </div>
          )}

          {steps.length > 0 && (
            <div className="mb-8">
              <h2 className="font-display text-xl font-bold mb-4 text-neutral-900 tracking-wide">
                {settings.stepsHeading || 'How to Return an Item'}
              </h2>
              <ol className="space-y-5">
                {steps.map((step, idx) => {
                  const safePath = validateInternalPath(step.linkPath);
                  return (
                    <li key={step.id} className="flex gap-4 items-start">
                      <span className="flex-none w-8 h-8 rounded-full bg-black text-white text-sm font-semibold flex items-center justify-center shadow-sm">
                        {idx + 1}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-neutral-900">{step.title}</p>
                        <p className="text-xs text-neutral-500 mt-0.5 font-light leading-relaxed whitespace-pre-line">
                          {step.description}
                          {step.linkLabel && safePath && (
                            <>
                              {' '}Go to{' '}
                              <Link href={safePath} className="underline font-normal text-black hover:text-neutral-700">
                                {step.linkLabel}
                              </Link>
                              .
                            </>
                          )}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}

          {infoSections.map((sec) => (
            <div key={sec.id} className="mb-8">
              <h2 className="font-display text-xl font-bold mb-3 text-neutral-900 tracking-wide">{sec.title}</h2>
              <p className="text-sm text-neutral-600 leading-relaxed font-light whitespace-pre-line">
                {sec.description}
              </p>
            </div>
          ))}

          {cta && cta.active !== false && (
            <div className="bg-black text-white rounded-md p-6 text-center shadow-lg flex flex-col items-center mt-10">
              <HelpCircle className="w-5 h-5 text-purple-400 mb-1" />
              <p className="font-semibold text-sm mb-1">{cta.heading || 'Still have questions?'}</p>
              <p className="text-neutral-300 text-xs mb-4 max-w-xs font-light whitespace-pre-line">
                {cta.description}
              </p>
              <Link
                href={validateInternalPath(cta.buttonPath) || '/contact'}
                className="inline-block bg-white text-black text-xs font-semibold px-6 py-2.5 rounded-md hover:bg-neutral-200 transition active:scale-95 shadow uppercase"
              >
                {cta.buttonLabel || 'CONTACT US'}
              </Link>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
