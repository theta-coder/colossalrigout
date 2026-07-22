'use client';

import React from 'react';
import Link from 'next/link';
import ImageWithFallback from '@/components/ui/ImageWithFallback';
import dynamic from 'next/dynamic';
import { ChevronLeft, ChevronRight, Heart, Star } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/context/ToastContext';
import type { ProductCardData } from '@/lib/server/homepage';
import { Product } from '@/lib/products';
import { formatPkr } from '@/lib/utils';

const QuickAddModal = dynamic(() => import('@/components/QuickAddModal'), { ssr: false });

const colorClasses: Record<string, string> = {
  Black: 'bg-black',
  Stone: 'bg-stone-300',
  Navy: 'bg-blue-900',
  Blue: 'bg-blue-600',
  White: 'bg-white border border-neutral-300',
  Grey: 'bg-neutral-500',
  Amber: 'bg-amber-800',
};

const toNumericProductId = (value: number | string) => {
  if (typeof value === 'number') return value;
  const parsed = Number.parseInt(value, 10);
  if (Number.isFinite(parsed)) return parsed;
  return Array.from(value).reduce((hash, character) => ((hash * 31) + character.charCodeAt(0)) >>> 0, 0);
};

interface Props {
  title: string;
  subtitle: string;
  viewAllHref: string;
  products: ProductCardData[];
  showBestsellerBadge?: boolean;
}

export default function ProductCarouselClient({
  title,
  subtitle,
  viewAllHref,
  products,
  showBestsellerBadge = false,
}: Props) {
  const { toggleWishlist, wishlist, addToCart } = useCart();
  const { showToast } = useToast();
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [quickAddProduct, setQuickAddProduct] = React.useState<Product | null>(null);
  const [inView, setInView] = React.useState(true);
  const sectionRef = React.useRef<HTMLElement>(null);

  // Responsive slide counts using client width hook
  const [visibleSlides, setVisibleSlides] = React.useState(4);

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

  React.useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1280) setVisibleSlides(6);
      else if (window.innerWidth >= 1024) setVisibleSlides(4);
      else if (window.innerWidth >= 768) setVisibleSlides(3);
      else setVisibleSlides(2);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const maxIndex = Math.max(0, products.length - visibleSlides);

  // Autoplay carousel
  React.useEffect(() => {
    if (maxIndex <= 0 || !inView) return;
    let interval: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      interval = setInterval(() => {
        setCurrentIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
      }, 4000);
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
  }, [maxIndex, inView]);

  const prevSlide = () => setCurrentIndex((prev) => (prev === 0 ? maxIndex : prev - 1));
  const nextSlide = () => setCurrentIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));

  const handleQuickAdd = (product: ProductCardData) => {
    // Cast ProductCardData to Product for QuickAddModal
    const fullProd: Product = {
      id: toNumericProductId(product.id),
      name: product.name,
      price: product.price,
      retailPrice: product.retailPrice,
      discountPrice: product.discountPrice,
      img: product.img,
      images: product.images || [product.img],
      colors: product.colors || [],
      sizes: product.sizes || [],
      cat: product.cat || '',
      description: product.description || '',
    };
    setQuickAddProduct(fullProd);
  };

  const [mounted, setMounted] = React.useState(false);
  const [outOfStockProductIds, setOutOfStockProductIds] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    setMounted(true);
    fetch('/api/commerce/inventory')
      .then((res) => res.json())
      .then((payload) => {
        if (payload.success && Array.isArray(payload.data)) {
          const stockMap = new Map<string, number>();
          payload.data.forEach((variant: any) => {
            const pId = String(variant.productId);
            const stock = Number(variant.availableStock ?? variant.stockOnHand ?? variant.stock ?? 0);
            stockMap.set(pId, (stockMap.get(pId) || 0) + stock);
          });

          const outSet = new Set<string>();
          stockMap.forEach((totalStock, pId) => {
            if (totalStock <= 0) outSet.add(pId);
          });
          setOutOfStockProductIds(outSet);
        }
      })
      .catch(() => {});
  }, []);

  const renderProductCard = (product: ProductCardData) => {
    const numericId = toNumericProductId(product.id);
    const isWishlisted = mounted ? wishlist.includes(numericId) : false;

    const strId = String(product.id);
    const isOutOfStock =
      outOfStockProductIds.has(strId) ||
      (product as any).inStock === false ||
      (typeof product.totalStock === 'number' && product.totalStock <= 0) ||
      (typeof (product as any).stock === 'number' && (product as any).stock <= 0) ||
      (product as any).isOutOfStock === true;

    return (
      <div className="prod-card group flex flex-col h-full">
        <div className="relative overflow-hidden rounded-md bg-neutral-100 aspect-[3/4]">
          {isOutOfStock ? (
            <span className="absolute top-2 left-2 bg-red-600 text-white text-[9px] font-black px-2 py-0.5 rounded tracking-wider uppercase z-20 shadow-sm">
              OUT OF STOCK
            </span>
          ) : showBestsellerBadge ? (
            <span className="absolute top-2 left-2 bg-black text-white text-[9px] font-semibold px-2 py-0.5 rounded tracking-wide z-10">
              BESTSELLER
            </span>
          ) : null}
          <Link href={`/product?id=${product.id}`} className="absolute inset-0 block cursor-pointer z-0">
            <ImageWithFallback
              src={product.img}
              alt={product.name}
              fill
              sizes="(max-width: 767px) 50vw, (max-width: 1023px) 33vw, (max-width: 1279px) 25vw, 17vw"
              className={`object-cover transition duration-500 group-hover:scale-105 ${isOutOfStock ? 'opacity-70 grayscale-[20%]' : ''}`}
            />
          </Link>
          <button
            onClick={() => toggleWishlist(numericId)}
            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/95 flex items-center justify-center text-sm shadow hover:bg-neutral-100 active:scale-90 transition z-10 cursor-pointer"
            aria-label="Wishlist"
          >
            <Heart
              className={`w-4 h-4 ${
                isWishlisted ? 'fill-red-500 text-red-500' : 'text-neutral-600'
              }`}
            />
          </button>
          {isOutOfStock ? (
            <div className="absolute bottom-2 left-2 right-2 z-10">
              <span className="block w-full bg-neutral-900/90 text-red-400 text-[10px] font-black py-2 rounded text-center uppercase tracking-wider shadow">
                OUT OF STOCK
              </span>
            </div>
          ) : (
            <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition duration-300 z-10">
              <button
                onClick={() => handleQuickAdd(product)}
                className="w-full bg-black/90 text-white text-[10px] font-semibold py-2 rounded hover:bg-black transition text-center cursor-pointer"
              >
                QUICK ADD +
              </button>
            </div>
          )}
        </div>
        <Link href={`/product?id=${product.id}`} className="mt-2 text-sm font-medium text-neutral-900 hover:underline">
          {product.name}
        </Link>
        <div className="flex items-center gap-2 mt-1">
          {product.discountPrice && product.discountPrice < (product.retailPrice || product.price) ? (
            <>
              <span className="text-sm font-extrabold text-red-600">{formatPkr(product.discountPrice)}</span>
              <span className="text-xs text-neutral-400 line-through font-medium">
                {formatPkr(product.retailPrice || product.price)}
              </span>
            </>
          ) : (
            <span className="text-sm text-neutral-800 font-semibold">{formatPkr(product.price)}</span>
          )}
        </div>
        {showBestsellerBadge && (
          <p className="text-[10px] text-neutral-500 flex items-center gap-1 mt-0.5">
            <Star className="w-3 h-3 fill-amber-400 text-amber-500" /> {product.rating || '4.8'} &middot; {product.sold || '100+ sold'}
          </p>
        )}
        <div className="flex gap-1 mt-1">
          {(product.colors || []).map((c, i) => (
            <span key={i} className={`w-3 h-3 rounded-full ${colorClasses[c] || 'bg-stone-300'} inline-block`} />
          ))}
        </div>
      </div>
    );
  };

  if (!products || products.length === 0) {
    return null;
  }

  return (
    <section ref={sectionRef} className="max-w-7xl mx-auto px-4 py-8 w-full overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 gap-4">
        <div>
          <h2 className="font-display text-xl sm:text-2xl font-bold tracking-wide text-neutral-900 uppercase">
            {title}
          </h2>
          <p className="text-neutral-500 text-xs sm:text-sm">{subtitle}</p>
        </div>
        <div className="flex items-center gap-4">
          <Link href={viewAllHref} className="text-sm font-medium hover:underline text-neutral-800 whitespace-nowrap">
            View all
          </Link>
          {maxIndex > 0 && (
            <div className="hidden md:flex items-center gap-1.5">
              <button
                onClick={prevSlide}
                className="w-8 h-8 rounded-full border border-neutral-200 bg-white hover:bg-black hover:text-white text-neutral-800 transition flex items-center justify-center active:scale-90 cursor-pointer shadow-xs"
                aria-label="Previous Products"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={nextSlide}
                className="w-8 h-8 rounded-full border border-neutral-200 bg-white hover:bg-black hover:text-white text-neutral-800 transition flex items-center justify-center active:scale-90 cursor-pointer shadow-xs"
                aria-label="Next Products"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Desktop Sliding Carousel */}
      <div className="hidden md:block relative overflow-hidden w-full px-0.5 py-2">
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${currentIndex * (100 / visibleSlides)}%)` }}
        >
          {products.map((product) => (
            <div
              key={product.id}
              className="shrink-0 px-2 sm:px-3 flex flex-col"
              style={{ width: `${100 / visibleSlides}%` }}
            >
              {renderProductCard(product)}
            </div>
          ))}
        </div>
      </div>

      {/* Mobile Static Grid */}
      <div className="block md:hidden px-0.5 py-2">
        <div className="grid grid-cols-2 gap-x-4 gap-y-6">
          {products.map((product) => (
            <div key={product.id} className="flex flex-col">
              {renderProductCard(product)}
            </div>
          ))}
        </div>
      </div>

      {/* Quick Add Modal */}
      {quickAddProduct && (
        <QuickAddModal
          product={quickAddProduct}
          onClose={() => setQuickAddProduct(null)}
          onAddToCart={(item) => {
            addToCart(item);
            showToast(`Added ${item.name} (${item.size}, ${item.color}) to Cart`, {
              type: 'cart',
              actionUrl: '/cart',
              actionLabel: 'View Cart',
            });
          }}
        />
      )}
    </section>
  );
}
