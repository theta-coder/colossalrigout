'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { HomepageReview } from '@/lib/server/homepage';

interface Props {
  reviews: HomepageReview[];
}

export default function ReviewsCarouselClient({ reviews }: Props) {
  const [currentReview, setCurrentReview] = React.useState(0);
  const [windowWidth, setWindowWidth] = React.useState(1200);

  React.useEffect(() => {
    setWindowWidth(window.innerWidth);
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getVisibleSlides = () => {
    if (windowWidth >= 1024) return 3;
    if (windowWidth >= 640) return 2;
    return 1;
  };

  const visibleSlides = getVisibleSlides();
  const maxIndex = Math.max(0, reviews.length - visibleSlides);

  const nextReview = () => {
    setCurrentReview((prev) => (prev >= maxIndex ? 0 : prev + 1));
  };

  const prevReview = () => {
    setCurrentReview((prev) => (prev === 0 ? maxIndex : prev - 1));
  };

  if (!reviews || reviews.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 py-8 w-full overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 gap-4">
        <div>
          <h2 className="font-display text-xl sm:text-2xl font-bold tracking-wide text-neutral-900">
            WHAT OUR CUSTOMERS SAY
          </h2>
          <p className="text-neutral-500 text-xs sm:text-sm">Real reviews from real Colossal Rigout shoppers.</p>
        </div>

        {/* Navigation Controls */}
        {reviews.length > visibleSlides && (
          <div className="flex items-center gap-2">
            <button
              onClick={prevReview}
              className="w-10 h-10 rounded-full border border-neutral-200 bg-white hover:bg-black hover:text-white text-neutral-800 transition flex items-center justify-center active:scale-90 cursor-pointer shadow-xs"
              aria-label="Previous Review"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={nextReview}
              className="w-10 h-10 rounded-full border border-neutral-200 bg-white hover:bg-black hover:text-white text-neutral-800 transition flex items-center justify-center active:scale-90 cursor-pointer shadow-xs"
              aria-label="Next Review"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {/* Carousel Viewport Container */}
      <div className="relative overflow-hidden w-full px-0.5 py-2">
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${currentReview * (100 / visibleSlides)}%)` }}
        >
          {reviews.map((r) => (
            <div key={r.id} className="w-full sm:w-1/2 lg:w-1/3 shrink-0 px-2 sm:px-3 flex flex-col">
              <div className="bg-[#f4f4f3] border border-neutral-200 rounded-lg p-6 flex flex-col justify-between h-full hover:shadow-md transition duration-300 min-h-[220px]">
                <div>
                  <div className="flex gap-0.5 text-amber-500 text-sm">
                    {Array.from({ length: r.rating || 5 }).map((_, i) => (
                      <span key={i}>&#9733;</span>
                    ))}
                  </div>
                  <p className="text-sm text-neutral-700 mt-4 leading-relaxed italic font-sans">
                    &ldquo;{r.body}&rdquo;
                  </p>
                </div>
                <div className="mt-5 pt-4 border-t border-neutral-200/50 flex flex-col">
                  <p className="text-xs font-semibold text-neutral-900">{r.customerName}</p>

                  <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                    <Link
                      href={`/product?id=${r.productId}`}
                      className="text-[10px] text-neutral-400 hover:text-black hover:underline transition font-medium"
                    >
                      {r.productNameSnapshot || 'View Product'}
                    </Link>

                    {r.verifiedPurchase && (
                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[8px] font-extrabold px-1.5 py-0.5 rounded tracking-wide uppercase">
                        Verified Buyer
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dots Indicators */}
      {maxIndex > 0 && (
        <div className="flex justify-center items-center gap-1.5 mt-6">
          {Array.from({ length: maxIndex + 1 }).map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentReview(i)}
              className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                currentReview === i ? 'w-6 bg-black' : 'w-2 bg-neutral-300 hover:bg-neutral-400'
              }`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
