'use client';

import React from 'react';
import {
  NewsletterSettings,
  DEFAULT_NEWSLETTER_SETTINGS,
  interpolateNewsletterMessage,
} from '@/lib/storefront-settings';

interface NewsletterFormClientProps {
  settings?: NewsletterSettings;
}

export default function NewsletterFormClient({ settings = DEFAULT_NEWSLETTER_SETTINGS }: NewsletterFormClientProps) {
  if (settings?.enabled === false) {
    return null;
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const alertMessage = interpolateNewsletterMessage(
      settings.successMessage,
      settings.couponCode,
      settings.discountType,
      settings.discountValue
    );
    alert(alertMessage);
    e.currentTarget.reset();
  };

  const eyebrow = settings.eyebrow?.trim();
  const heading = settings.heading?.trim() || DEFAULT_NEWSLETTER_SETTINGS.heading;
  const description = settings.description?.trim() || DEFAULT_NEWSLETTER_SETTINGS.description;
  const placeholder = settings.inputPlaceholder?.trim() || DEFAULT_NEWSLETTER_SETTINGS.inputPlaceholder;
  const buttonLabel = settings.buttonLabel?.trim() || DEFAULT_NEWSLETTER_SETTINGS.buttonLabel;

  return (
    <section className="bg-[#f4efe9] py-12 sm:py-16 w-full">
      <div className="max-w-2xl mx-auto text-center px-4 space-y-2">
        {eyebrow && (
          <p className="text-xs font-bold uppercase tracking-widest text-purple-700">
            {eyebrow}
          </p>
        )}
        <h2 className="font-display text-2xl sm:text-3xl font-bold flex items-center justify-center gap-2 text-neutral-900">
          {heading}
        </h2>
        {description && (
          <p className="text-neutral-600 text-sm font-light leading-relaxed">
            {description}
          </p>
        )}
        <form
          onSubmit={handleSubmit}
          className="mt-6 flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto"
        >
          <input
            required
            type="email"
            placeholder={placeholder}
            className="flex-1 border border-neutral-300 rounded-md px-4 py-3 text-sm outline-none bg-white focus:border-black transition text-neutral-800"
          />
          <button
            type="submit"
            className="bg-black text-white text-sm font-semibold px-6 py-3 rounded-md hover:bg-neutral-800 transition whitespace-nowrap active:scale-95 cursor-pointer"
          >
            {buttonLabel}
          </button>
        </form>
        {settings.termsText && (
          <p className="text-[11px] text-neutral-500 font-light mt-2">
            {settings.termsText}
          </p>
        )}
      </div>
    </section>
  );
}
