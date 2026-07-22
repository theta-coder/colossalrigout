'use client';

import React, { useState, useEffect, useRef } from 'react';
import ImageWithFallback from './ui/ImageWithFallback';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { auth } from '../lib/firebase';
import { useToast } from '../context/ToastContext';

interface CampaignCard {
  id: string;
  cardType: 'discount' | 'announcement' | 'store' | 'new-arrival' | 'event';
  eyebrowText: string;
  heading: string;
  description: string;
  buttonText: string;
  overlayOpacity: number;
  textPosition: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
  actionType: 'campaign-products' | 'collection' | 'product' | 'store-location' | 'custom-page';
  productId?: string;
  collectionId?: string;
  storeId?: string;
  internalPath?: string;
  hasDiscount: boolean;
  promotionId?: string;
  backgroundImageUrl?: string;
  startsAt: string;
  endsAt: string;
}

interface CampaignCardsCarouselProps {
  initialCards?: CampaignCard[];
}

export default function CampaignCardsCarousel({ initialCards }: CampaignCardsCarouselProps = {}) {
  const [cards, setCards] = useState<CampaignCard[]>(initialCards || []);
  const [loading, setLoading] = useState(!initialCards);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [paused, setPaused] = useState(false);
  const [inView, setInView] = useState(true);
  const sectionRef = useRef<HTMLElement>(null);
  const touchStartX = useRef<number | null>(null);
  const router = useRouter();
  const { showToast } = useToast();
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [visibleCount, setVisibleCount] = useState(3);

  // IntersectionObserver to pause auto-play when off-screen
  useEffect(() => {
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

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setVisibleCount(3);
      } else if (window.innerWidth >= 640) {
        setVisibleCount(2);
      } else {
        setVisibleCount(1);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Campaign visibility is its own clock. It only hides/shows cards and never
  // grants a discount; promotion eligibility remains server-controlled.
  useEffect(() => {
    const removeExpiredCards = () => {
      const now = Date.now();
      setCards(current => current.filter(card => now >= new Date(card.startsAt).getTime() && now < new Date(card.endsAt).getTime()));
    };
    const timer = window.setInterval(removeExpiredCards, 15_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    async function fetchActiveCards() {
      try {
        const res = await fetch('/api/campaign-cards/active');
        const json = await res.json();
        if (json.success) {
          setCards(json.data || []);
        }
      } catch (err) {
        console.error('Error fetching active campaign cards:', err);
      } finally {
        setLoading(false);
      }
    }
    // Server-rendered homepage passes initialCards; avoid an immediate duplicate API request.
    if (!initialCards) fetchActiveCards();

    // Check media query for reduced motion
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setPrefersReducedMotion(mediaQuery.matches);
      const listener = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, [initialCards]);

  // Auto-play effect
  useEffect(() => {
    const maxIndex = Math.max(0, cards.length - visibleCount);
    if (maxIndex === 0 || prefersReducedMotion || paused || !inView) return;

    const startTimer = () => {
      timerRef.current = setInterval(() => {
        setCurrentIndex((prev) => prev >= maxIndex ? 0 : prev + 1);
      }, 5000);
    };

    startTimer();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [cards.length, visibleCount, prefersReducedMotion, paused, inView]);

  useEffect(() => {
    setCurrentIndex(prev => Math.min(prev, Math.max(0, cards.length - visibleCount)));
  }, [cards.length, visibleCount]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse bg-neutral-200 rounded-md h-52 sm:h-60 md:h-64"></div>
          ))}
        </div>
      </div>
    );
  }

  if (cards.length === 0) {
    return null; // Hide completely
  }

  const handleCardClick = (e: React.MouseEvent, card: CampaignCard) => {
    // If it requires login and no user is signed in
    if (card.hasDiscount && card.promotionId) {
      // Fetch eligibility to see if it requires login
      e.preventDefault();
      checkEligibilityAndNavigate(card);
    }
  };

  const checkEligibilityAndNavigate = async (card: CampaignCard) => {
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/promotions/eligibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          promotionId: card.promotionId,
        }),
      });
      const json = await res.json();
      
      let targetPath = '/shop';
      if (card.actionType === 'product' && card.productId) {
        targetPath = `/product?id=${card.productId}`;
      } else if (card.actionType === 'collection' && card.collectionId) {
        targetPath = `/shop?collection=${card.collectionId}`;
      } else if (card.actionType === 'campaign-products' && card.promotionId) {
        targetPath = `/shop?promotion=${card.promotionId}`;
      } else if (card.actionType === 'store-location' && card.storeId) {
        targetPath = `/contact?store=${card.storeId}`;
      } else if (card.actionType === 'custom-page' && card.internalPath) {
        targetPath = card.internalPath;
      }

      if (json.success && !json.eligible && json.loginRequired) {
        // Redirect to login page and return back to home/origin
        router.push(`/login?returnTo=${encodeURIComponent(targetPath)}`);
      } else if (json.success && !json.eligible) {
        showToast(json.reason || 'This offer is not available for your account.', { type: 'info' });
      } else {
        router.push(targetPath);
      }
    } catch (err) {
      console.error('Error validating eligibility on card click:', err);
    }
  };

  const getActionLink = (card: CampaignCard) => {
    if (card.actionType === 'product' && card.productId) {
      return `/product?id=${card.productId}`;
    } else if (card.actionType === 'collection' && card.collectionId) {
      return `/shop?collection=${card.collectionId}`;
    } else if (card.actionType === 'campaign-products' && card.promotionId) {
      return `/shop?promotion=${card.promotionId}`;
    } else if (card.actionType === 'store-location' && card.storeId) {
      return `/contact?store=${card.storeId}`;
    } else if (card.actionType === 'custom-page' && card.internalPath) {
      return card.internalPath;
    }
    return '/shop';
  };

  const renderCard = (card: CampaignCard) => {
    const link = getActionLink(card);
    const textAlignmentClass = card.textPosition.includes('right') ? 'text-right items-end' : 'text-left items-start';
    const textVerticalClass = card.textPosition.includes('top') ? 'justify-start' : 'justify-end';
    
    return (
      <div
        key={card.id}
        className="relative rounded-md overflow-hidden h-52 sm:h-60 md:h-64 group w-full select-none"
      >
        <ImageWithFallback
          src={card.backgroundImageUrl}
          alt={card.heading || 'Campaign card'}
          fill
          sizes="(max-width: 639px) 100vw, (max-width: 767px) 50vw, 33vw"
          className="object-cover transition duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-black" style={{ opacity: card.overlayOpacity }}></div>
        <div className={`absolute inset-0 p-5 text-white flex flex-col ${textVerticalClass} ${textAlignmentClass}`}>
          {card.eyebrowText && (
            <p className="text-xs font-semibold tracking-wide uppercase">{card.eyebrowText}</p>
          )}
          <p className="font-display text-2xl sm:text-3xl font-extrabold uppercase mt-0.5">{card.heading}</p>
          {card.description && (
            <p className="text-xs mt-1 max-w-[200px] text-neutral-200 line-clamp-2">{card.description}</p>
          )}
          <Link
            href={link}
            onClick={(e) => handleCardClick(e, card)}
            className="mt-3.5 inline-block bg-white text-black text-xs font-bold px-4 py-2 rounded uppercase tracking-wider hover:bg-neutral-100 transition"
          >
            {card.buttonText}
          </Link>
        </div>
      </div>
    );
  };

  const maxIndex = Math.max(0, cards.length - visibleCount);
  const carouselActive = maxIndex > 0;
  const goPrevious = () => setCurrentIndex(prev => prev <= 0 ? maxIndex : prev - 1);
  const goNext = () => setCurrentIndex(prev => prev >= maxIndex ? 0 : prev + 1);

  return (
    <section
      ref={sectionRef}
      className="max-w-7xl mx-auto px-4 py-12 w-full relative group"
      aria-roledescription={carouselActive ? 'carousel' : undefined}
      aria-label="Featured campaigns"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setPaused(false); }}
      onTouchStart={(event) => { touchStartX.current = event.touches[0]?.clientX ?? null; setPaused(true); }}
      onTouchEnd={(event) => {
        const end = event.changedTouches[0]?.clientX;
        if (touchStartX.current !== null && end !== undefined) {
          const delta = end - touchStartX.current;
          if (Math.abs(delta) > 45) delta > 0 ? goPrevious() : goNext();
        }
        touchStartX.current = null;
        setPaused(false);
      }}
    >
      <div className="overflow-hidden">
        <div
          className={`flex -mx-2 ${prefersReducedMotion ? '' : 'transition-transform duration-500 ease-in-out'}`}
          style={{
            transform: `translateX(-${currentIndex * (100 / visibleCount)}%)`
          }}
        >
          {cards.map((card) => (
            <div key={card.id} className={`${cards.length === 1 ? 'min-w-full' : cards.length === 2 ? 'min-w-full sm:min-w-[50%]' : 'min-w-full sm:min-w-[50%] md:min-w-[33.3333%]'} shrink-0 px-2`}>
              {renderCard(card)}
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Controls */}
      {carouselActive && <button
        type="button"
        aria-label="Previous campaign"
        onClick={goPrevious}
        className="absolute left-6 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white text-black border shadow flex items-center justify-center opacity-100 md:opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition duration-300 z-10"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>}

      {carouselActive && <button
        type="button"
        aria-label="Next campaign"
        onClick={goNext}
        className="absolute right-6 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white text-black border shadow flex items-center justify-center opacity-100 md:opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition duration-300 z-10"
      >
        <ChevronRight className="w-5 h-5" />
      </button>}

      {carouselActive && <div className="mt-4 flex justify-center gap-2" aria-label="Choose campaign page">
        {Array.from({ length: maxIndex + 1 }, (_, index) => (
          <button
            type="button"
            key={index}
            aria-label={`Show campaign page ${index + 1}`}
            aria-current={currentIndex === index ? 'true' : undefined}
            onClick={() => setCurrentIndex(index)}
            className={`h-2 rounded-full transition-all ${currentIndex === index ? 'w-6 bg-black' : 'w-2 bg-neutral-300'}`}
          />
        ))}
      </div>}
    </section>
  );
}
