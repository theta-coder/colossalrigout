'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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
}

export default function CampaignCardsCarousel() {
  const [cards, setCards] = useState<CampaignCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const { currentUser } = useAuth();
  const router = useRouter();
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

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
    fetchActiveCards();

    // Check media query for reduced motion
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setPrefersReducedMotion(mediaQuery.matches);
      const listener = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, []);

  // Auto-play effect
  useEffect(() => {
    if (cards.length <= 3 || prefersReducedMotion) return;

    const startTimer = () => {
      timerRef.current = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % (cards.length - 2));
      }, 5000);
    };

    startTimer();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [cards.length, prefersReducedMotion]);

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
      const res = await fetch('/api/promotions/eligibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promotionId: card.promotionId,
          userId: currentUser?.uid || '',
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
        <Image
          src={card.backgroundImageUrl || '/product-placeholder.png'}
          alt={card.heading}
          fill
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

  // Grid layouts for 1, 2, or 3 cards
  if (cards.length === 1) {
    return (
      <section className="max-w-7xl mx-auto px-4 py-12 w-full">
        {renderCard(cards[0])}
      </section>
    );
  }

  if (cards.length === 2) {
    return (
      <section className="max-w-7xl mx-auto px-4 py-12 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
        {cards.map(renderCard)}
      </section>
    );
  }

  if (cards.length === 3) {
    return (
      <section className="max-w-7xl mx-auto px-4 py-12 w-full">
        {/* Desktop grid */}
        <div className="hidden sm:grid grid-cols-3 gap-4">
          {cards.map(renderCard)}
        </div>
        {/* Mobile Swipeable Carousel */}
        <div className="block sm:hidden relative overflow-hidden h-52">
          <div
            className="flex transition-transform duration-300 ease-in-out h-full"
            style={{ transform: `translateX(-${currentIndex * 100}%)` }}
          >
            {cards.map((c) => (
              <div key={c.id} className="min-w-full h-full px-1">
                {renderCard(c)}
              </div>
            ))}
          </div>
          {/* Navigation dots */}
          <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5 z-10">
            {cards.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className={`w-2 h-2 rounded-full transition-all ${
                  currentIndex === i ? 'bg-white scale-125' : 'bg-white/40'
                }`}
              />
            ))}
          </div>
        </div>
      </section>
    );
  }

  const [visibleCount, setVisibleCount] = useState(3);

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

  // Carousel layout for more than 3 cards
  return (
    <section className="max-w-7xl mx-auto px-4 py-12 w-full relative group">
      <div className="overflow-hidden">
        <div
          className="flex transition-transform duration-500 ease-in-out -mx-2"
          style={{
            transform: `translateX(-${currentIndex * (100 / visibleCount)}%)`
          }}
        >
          {cards.map((card) => (
            <div key={card.id} className="min-w-[100%] sm:min-w-[50%] md:min-w-[33.3333%] shrink-0 px-2">
              {renderCard(card)}
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Controls */}
      <button
        onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
        disabled={currentIndex === 0}
        className="absolute left-6 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white text-black border shadow flex items-center justify-center opacity-0 group-hover:opacity-100 disabled:opacity-0 transition duration-300 z-10"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      <button
        onClick={() => {
          const maxIdx = Math.max(0, cards.length - visibleCount);
          setCurrentIndex((prev) => Math.min(maxIdx, prev + 1));
        }}
        disabled={currentIndex >= Math.max(0, cards.length - visibleCount)}
        className="absolute right-6 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white text-black border shadow flex items-center justify-center opacity-0 group-hover:opacity-100 disabled:opacity-0 transition duration-300 z-10"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </section>
  );
}
