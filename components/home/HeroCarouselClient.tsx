'use client';

import React from 'react';
import ImageWithFallback from '@/components/ui/ImageWithFallback';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { HeroSlide } from '@/lib/server/homepage';

interface Props {
  slides: HeroSlide[];
}

export default function HeroCarouselClient({ slides }: Props) {
  const [current, setCurrent] = React.useState(0);
  const [inView, setInView] = React.useState(true);
  const sectionRef = React.useRef<HTMLElement>(null);

  // IntersectionObserver to pause auto-play when off-screen
  React.useEffect(() => {
    if (!sectionRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );
    observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  // Auto-play with visibility & viewport aware pause
  React.useEffect(() => {
    if (slides.length <= 1 || !inView) return;

    let interval: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      interval = setInterval(() => {
        setCurrent(prev => (prev + 1) % slides.length);
      }, 6000);
    };

    const stop = () => {
      if (interval) { clearInterval(interval); interval = null; }
    };

    const handleVisibility = () => {
      if (document.hidden) stop(); else start();
    };

    start();
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      stop();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [slides.length, inView]);

  // Touch swipe support for mobile & touch devices
  const touchStartX = React.useRef<number | null>(null);
  const touchEndX = React.useRef<number | null>(null);
  const minSwipeDistance = 40; // px threshold

  const handleTouchStart = (e: React.TouchEvent) => {
    touchEndX.current = null;
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return;
    const distance = touchStartX.current - touchEndX.current;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      setCurrent(prev => (prev + 1) % slides.length);
    } else if (isRightSwipe) {
      setCurrent(prev => (prev === 0 ? slides.length - 1 : prev - 1));
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    touchEndX.current = null;
    touchStartX.current = e.clientX;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (touchStartX.current !== null) {
      touchEndX.current = e.clientX;
    }
  };

  const handleMouseUp = () => {
    handleTouchEnd();
  };

  if (slides.length === 0) return null;

  return (
    <section
      ref={sectionRef}
      className="relative bg-[#f4efe9] overflow-hidden select-none touch-pan-y"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="relative w-full aspect-[4/5] sm:aspect-[16/9] md:aspect-[21/9] lg:h-[520px] min-h-[350px] max-h-[85vh]">
        {slides.map((slide, idx) => {
          const isActive = current === idx;
          return (
            <div
              key={slide.id}
              className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
              }`}
            >
              <ImageWithFallback
                src={slide.image}
                alt={slide.subtitle || slide.title || 'Hero Banner'}
                fill
                priority={idx === 0}
                fetchPriority={idx === 0 ? 'high' : 'auto'}
                sizes="100vw"
                className="absolute inset-0 object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent sm:bg-gradient-to-r sm:from-black/65 sm:via-black/20 sm:to-transparent" />

              <div className="relative z-20 max-w-7xl mx-auto h-full flex flex-col justify-end sm:justify-center px-4 sm:px-6 pb-12 sm:pb-0">
                <div className={`transition-all duration-700 delay-300 transform ${isActive ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
                  <h1 className="font-display text-white text-4xl sm:text-6xl lg:text-7xl font-extrabold leading-[1.05] tracking-tight max-w-xl drop-shadow">
                    {typeof slide.title === 'string' ? (
                      slide.title.includes('\n') ? (
                        slide.title.split('\n').map((line: string, lineIdx: number) => (
                          <React.Fragment key={lineIdx}>
                            {lineIdx > 0 && <br />}
                            {line}
                          </React.Fragment>
                        ))
                      ) : (
                        slide.title
                      )
                    ) : (
                      slide.title
                    )}
                  </h1>
                  <p className="mt-3 sm:mt-5 text-neutral-100 max-w-lg text-xs sm:text-base drop-shadow pr-2 font-light">
                    {slide.subtitle}
                  </p>
                  <div className="mt-5 sm:mt-6 flex flex-wrap gap-2 sm:gap-3">
                    <Link
                      href={slide.btn1Link}
                      className="bg-white text-black text-xs sm:text-sm font-semibold px-4 sm:px-6 py-2.5 sm:py-3 rounded-md hover:bg-neutral-200 transition shadow-md"
                    >
                      {slide.btn1Text}
                    </Link>
                    {slide.btn2Text && (
                      <Link
                        href={slide.btn2Link || '#'}
                        className="border border-white text-white text-xs sm:text-sm font-semibold px-4 sm:px-6 py-2.5 sm:py-3 rounded-md hover:bg-white hover:text-black transition shadow-md"
                      >
                        {slide.btn2Text}
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Navigation Arrows */}
        {slides.length > 1 && (
          <>
            <button
              onClick={() => setCurrent(prev => (prev === 0 ? slides.length - 1 : prev - 1))}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/15 hover:bg-black/45 text-white flex items-center justify-center backdrop-blur-[2px] transition-all z-20 focus:outline-none hover:scale-105 active:scale-95 border border-white/10 cursor-pointer"
              aria-label="Previous slide"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => setCurrent(prev => (prev + 1) % slides.length)}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/15 hover:bg-black/45 text-white flex items-center justify-center backdrop-blur-[2px] transition-all z-20 focus:outline-none hover:scale-105 active:scale-95 border border-white/10 cursor-pointer"
              aria-label="Next slide"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}

        {/* Slide Indicator Dots */}
        {slides.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrent(idx)}
                className={`h-1.5 rounded-full transition-all duration-300 focus:outline-none cursor-pointer ${
                  current === idx ? 'w-6 bg-white' : 'w-1.5 bg-white/50 hover:bg-white/80'
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        )}

        {/* Brand badge */}
        <div className="hidden sm:block absolute z-20 bottom-8 right-8 bg-[#f4f4f3] shadow-xl rounded-md px-8 py-6 text-center w-40">
          <p className="font-display font-bold text-xl tracking-wider">CR</p>
          <p className="text-[10px] tracking-widest mt-1">COLOSSAL RIGOUT</p>
          <p className="text-[9px] text-neutral-400 mt-1">WEAR YOUR CONFIDENCE</p>
        </div>
        <div className="sm:hidden absolute z-20 top-4 right-4 bg-[#f4f4f3]/95 shadow-lg rounded-md px-3 py-2 text-center">
          <p className="font-display font-bold text-sm leading-none">CR</p>
          <p className="text-[7px] tracking-widest mt-1 whitespace-nowrap">COLOSSAL RIGOUT</p>
        </div>
      </div>
    </section>
  );
}
