'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '../context/CartContext';
import { useProducts } from '../context/ProductsContext';
import { Product } from '../lib/products';
import dynamic from 'next/dynamic';

const QuickAddModal = dynamic(() => import('../components/QuickAddModal'), { ssr: false });
const CampaignCardsCarousel = dynamic(() => import('../components/CampaignCardsCarousel'), { ssr: false });
import { ShopCategory } from '../lib/category';
import { Truck, RotateCcw, ShieldCheck, MapPin, Heart, Star, Sparkles, X, ChevronLeft, ChevronRight } from 'lucide-react';

const colorClasses: Record<string, string> = {
  Black: 'bg-black',
  Stone: 'bg-stone-300',
  Navy: 'bg-blue-900',
  Blue: 'bg-blue-600',
  White: 'bg-white border border-neutral-300',
  Grey: 'bg-neutral-500',
  Amber: 'bg-amber-800',
};

export default function Home() {
  const { addToCart, toggleWishlist, wishlist } = useCart();
  const { products } = useProducts();

  // Custom Hero Slides State from Firestore
  const [customSlides, setCustomSlides] = React.useState<any[]>([]);
  const [slidesLoading, setSlidesLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchSlides = async () => {
      try {
        const response = await fetch('/api/hero');
        if (!response.ok) throw new Error(`Hero request failed with status ${response.status}`);
        const data = await response.json();
        if (Array.isArray(data.slides)) setCustomSlides(data.slides);
      } catch (err) {
        console.error("Error loading hero slides: ", err);
      } finally {
        setSlidesLoading(false);
      }
    };
    fetchSlides();
  }, []);

  const heroSlides = React.useMemo(() => {
    return customSlides.filter(slide => typeof slide.image === 'string' && slide.image.startsWith('data:image/'));
  }, [customSlides]);

  const [currentHeroSlide, setCurrentHeroSlide] = React.useState(0);

  // Auto-play Hero Carousel
  React.useEffect(() => {
    if (heroSlides.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentHeroSlide((prev) => (prev + 1) % heroSlides.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [heroSlides.length]);

  // Quick Add State
  const [quickAddProduct, setQuickAddProduct] = React.useState<Product | null>(null);

  // Dynamic Promo Campaign State
  const [activeCampaign, setActiveCampaign] = React.useState<any>(null);
  const [campaignLoading, setCampaignLoading] = React.useState(true);
  const [serverOffset, setServerOffset] = React.useState(0);
  const [countdown, setCountdown] = React.useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [campaignExpired, setCampaignExpired] = React.useState(false);

  // Fetch active campaign from API
  React.useEffect(() => {
    const fetchCampaign = async () => {
      try {
        const res = await fetch('/api/promo-campaigns/active');
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          setActiveCampaign(json.data[0]);
          // Calculate server/client clock offset for accurate countdown
          const serverTime = new Date(json.serverNow).getTime();
          const clientTime = Date.now();
          setServerOffset(serverTime - clientTime);
          setCampaignExpired(false);
        } else {
          setActiveCampaign(null);
        }
      } catch {
        setActiveCampaign(null);
      } finally {
        setCampaignLoading(false);
      }
    };
    fetchCampaign();

    // Revalidate on page focus
    const handleFocus = () => fetchCampaign();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  // Accurate countdown timer synced to server time
  React.useEffect(() => {
    if (!activeCampaign?.endsAt) return;
    const endMs = new Date(activeCampaign.endsAt).getTime();

    const tick = () => {
      const nowSynced = Date.now() + serverOffset;
      const remaining = endMs - nowSynced;
      if (remaining <= 0) {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        setCampaignExpired(true);
        return;
      }
      const totalSecs = Math.floor(remaining / 1000);
      setCountdown({
        days: Math.floor(totalSecs / 86400),
        hours: Math.floor((totalSecs % 86400) / 3600),
        minutes: Math.floor((totalSecs % 3600) / 60),
        seconds: totalSecs % 60,
      });
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [activeCampaign, serverOffset]);

  // Swiper Carousel States
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
  const maxIndex = Math.max(0, 4 - visibleSlides); // 4 reviews total

  const nextReview = () => {
    setCurrentReview((prev) => (prev >= maxIndex ? 0 : prev + 1));
  };

  const prevReview = () => {
    setCurrentReview((prev) => (prev === 0 ? maxIndex : prev - 1));
  };

  // Product Carousels (New Arrivals and Best Sellers)
  const [currentNewArrivals, setCurrentNewArrivals] = React.useState(0);
  const [currentBestSellers, setCurrentBestSellers] = React.useState(0);

  const productVisibleSlides = React.useMemo(() => {
    if (windowWidth >= 1280) return 6;
    if (windowWidth >= 1024) return 4;
    if (windowWidth >= 768) return 3;
    return 2; // Mobile & tablet: 2 items side-by-side
  }, [windowWidth]);

  const maxProductIndex = Math.max(0, 10 - productVisibleSlides); // 10 products total

  const nextNewArrivals = () => {
    setCurrentNewArrivals((prev) => (prev >= maxProductIndex ? 0 : prev + 1));
  };

  const prevNewArrivals = () => {
    setCurrentNewArrivals((prev) => (prev === 0 ? maxProductIndex : prev - 1));
  };

  const nextBestSellers = () => {
    setCurrentBestSellers((prev) => (prev >= maxProductIndex ? 0 : prev + 1));
  };

  const prevBestSellers = () => {
    setCurrentBestSellers((prev) => (prev === 0 ? maxProductIndex : prev - 1));
  };

  // Auto-play New Arrivals carousel
  React.useEffect(() => {
    if (maxProductIndex <= 0) return;
    const interval = setInterval(() => {
      setCurrentNewArrivals((prev) => (prev >= maxProductIndex ? 0 : prev + 1));
    }, 4000);
    return () => clearInterval(interval);
  }, [maxProductIndex]);

  // Auto-play Best Sellers carousel
  React.useEffect(() => {
    if (maxProductIndex <= 0) return;
    const interval = setInterval(() => {
      setCurrentBestSellers((prev) => (prev >= maxProductIndex ? 0 : prev + 1));
    }, 4000);
    return () => clearInterval(interval);
  }, [maxProductIndex]);

  const newArrivals = React.useMemo(() => {
    // Return latest 10 products first or find original items
    return products.slice().reverse().slice(0, 10);
  }, [products]);

  const bestSellers = React.useMemo(() => {
    const list = products.filter(p => p.isBestseller);
    if (list.length > 0) return list.slice(0, 10);
    return products.slice(0, 10); // fallback if none are marked as bestseller
  }, [products]);

  // Dynamic Shop Categories state from API / Firestore
  const [customCategories, setCustomCategories] = React.useState<ShopCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = React.useState(true);
  const [categoriesError, setCategoriesError] = React.useState(false);

  React.useEffect(() => {
    const fetchDynamicCategories = async () => {
      try {
        const res = await fetch('/api/categories');
        if (!res.ok) throw new Error(`Category request failed with status ${res.status}`);
        const data = await res.json();
        if (!data.success || !Array.isArray(data.data)) throw new Error(data.message || 'Invalid category response');
        setCustomCategories(data.data);
      } catch (err) {
        console.error("Error fetching homepage categories:", err);
        setCategoriesError(true);
      } finally {
        setCategoriesLoading(false);
      }
    };
    fetchDynamicCategories();
  }, []);

  const categories = React.useMemo(() => {
    return customCategories
      .filter(c => c.active)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [customCategories]);

  const [collections, setCollections] = React.useState<any[]>([]);
  React.useEffect(() => {
    fetch('/api/commerce/collections').then(response => response.json()).then(data => setCollections((data.data || []).filter((item: any) => item.active !== false && item.featuredOnHome !== false).map((item: any) => ({ ...item, title: item.name, img: item.imageData || '/colossal-rigout-logo.png' }))));
  }, []);

  const reviews = [
    { name: 'Ayesha K.', rating: 5, quote: 'The fabric quality is amazing and it fit true to size. Ordering again!', product: 'Ribbed Knit Top' },
    { name: 'Hamza R.', rating: 5, quote: 'Fast delivery and the denim jacket looks even better in person.', product: 'Denim Jacket' },
    { name: 'Sana M.', rating: 4, quote: 'Loved the dress, exactly like the photos. The checkout was smooth too.', product: 'Midi Wrap Dress' },
    { name: 'Bilal A.', rating: 5, quote: 'Comfortable sneakers, great for everyday wear. Worth the price.', product: 'Everyday Sneakers' },
  ];

  const instaPosts = [
    'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?auto=format&fit=crop&w=300&q=80',
    'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=300&q=80',
    'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=300&q=80',
    'https://images.unsplash.com/photo-1490114538077-0a7f8cb49891?auto=format&fit=crop&w=300&q=80',
    'https://images.unsplash.com/photo-1552374196-c4e7ffc6e126?auto=format&fit=crop&w=300&q=80',
    'https://images.unsplash.com/photo-1516762689617-e1cffcef479d?auto=format&fit=crop&w=300&q=80',
  ];

  const handleQuickAdd = (product: Product) => {
    setQuickAddProduct(product);
  };

  const renderProductCard = (product: Product, showBestsellerBadge = false) => {
    return (
      <div className="prod-card group flex flex-col h-full">
        <div className="relative overflow-hidden rounded-md bg-neutral-100 aspect-[3/4]">
          {showBestsellerBadge && (
            <span className="absolute top-2 left-2 bg-black text-white text-[9px] font-semibold px-2 py-0.5 rounded tracking-wide z-10">
              BESTSELLER
            </span>
          )}
          <Link href={`/product?id=${product.id}`} className="absolute inset-0 block cursor-pointer z-0">
            <Image
              src={product.img}
              alt={product.name}
              fill
              className="object-cover transition duration-500 group-hover:scale-105"
            />
          </Link>
          <button
            onClick={() => toggleWishlist(product.id)}
            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/95 flex items-center justify-center text-sm shadow hover:bg-neutral-100 active:scale-90 transition z-10"
          >
            <Heart
              className={`w-4 h-4 ${
                wishlist.includes(product.id) ? 'fill-red-500 text-red-500' : 'text-neutral-600'
              }`}
            />
          </button>
          <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition duration-300 z-10">
            <button
              onClick={() => handleQuickAdd(product)}
              className="w-full bg-black/90 text-white text-[10px] font-semibold py-2 rounded hover:bg-black transition text-center"
            >
              QUICK ADD +
            </button>
          </div>
        </div>
        <Link href={`/product?id=${product.id}`} className="mt-2 text-sm font-medium text-neutral-900 hover:underline">
          {product.name}
        </Link>
        <div className="flex items-center gap-2 mt-1">
          {(product as any).discountPrice && (product as any).discountPrice < (product as any).retailPrice ? (
            <>
              <span className="text-sm font-extrabold text-red-600">${(product as any).discountPrice.toFixed(2)}</span>
              <span className="text-xs text-neutral-400 line-through font-medium">${((product as any).retailPrice || product.price).toFixed(2)}</span>
            </>
          ) : (
            <span className="text-sm text-neutral-800 font-semibold">${product.price.toFixed(2)}</span>
          )}
        </div>
        {showBestsellerBadge && (
          <p className="text-[10px] text-neutral-500 flex items-center gap-1 mt-0.5">
            <Star className="w-3 h-3 fill-amber-400 text-amber-500" /> {product.rating || '4.8'} &middot; {product.sold || '100+ sold'}
          </p>
        )}
        <div className="flex gap-1 mt-1">
          {product.colors.map((c, i) => (
            <span key={i} className={`w-3 h-3 rounded-full ${colorClasses[c] || 'bg-stone-300'} inline-block`}></span>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-0">
      {/* HERO SECTION */}
      {heroSlides.length > 0 && <section className="relative bg-[#f4efe9] overflow-hidden">
        <div className="relative w-full aspect-[4/5] sm:aspect-[16/9] md:aspect-[21/9] lg:h-[520px] min-h-[350px] max-h-[85vh]">
          {heroSlides.map((slide, idx) => {
            const isActive = currentHeroSlide === idx;
            return (
              <div
                key={idx}
                className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                  isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
                }`}
              >
                <Image
                  src={slide.image}
                  alt={slide.subtitle}
                  fill
                  priority={idx === 0}
                  className="absolute inset-0 object-cover object-center"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent sm:bg-gradient-to-r sm:from-black/65 sm:via-black/20 sm:to-transparent"></div>

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
          <button
            onClick={(e) => {
              e.stopPropagation();
              setCurrentHeroSlide((prev) => (prev === 0 ? heroSlides.length - 1 : prev - 1));
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/15 hover:bg-black/45 text-white flex items-center justify-center backdrop-blur-[2px] transition-all z-20 focus:outline-none hover:scale-105 active:scale-95 border border-white/10 cursor-pointer"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setCurrentHeroSlide((prev) => (prev + 1) % heroSlides.length);
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/15 hover:bg-black/45 text-white flex items-center justify-center backdrop-blur-[2px] transition-all z-20 focus:outline-none hover:scale-105 active:scale-95 border border-white/10 cursor-pointer"
            aria-label="Next slide"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Slide Indicator Dots */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20">
            {heroSlides.map((_, idx) => (
              <button
                key={idx}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentHeroSlide(idx);
                }}
                className={`h-1.5 rounded-full transition-all duration-300 focus:outline-none cursor-pointer ${
                  currentHeroSlide === idx ? 'w-6 bg-white' : 'w-1.5 bg-white/50 hover:bg-white/80'
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>

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
      </section>}

      {/* SHOP BY CATEGORY */}
      <section className="max-w-7xl mx-auto px-4 py-10 sm:py-16 w-full">
        <div className="flex items-center justify-between mb-8">
          <h2 className="font-display text-xl sm:text-2xl md:text-3xl font-bold tracking-wide">SHOP BY CATEGORY</h2>
          <Link
            href="/shop"
            className="text-xs sm:text-sm font-medium flex items-center gap-1 hover:underline whitespace-nowrap"
          >
            View all <span>&rarr;</span>
          </Link>
        </div>
        {categoriesLoading ? (
          <div className="py-10 text-center text-sm text-neutral-400">Loading categories...</div>
        ) : categoriesError ? (
          <div className="py-10 text-center text-sm text-neutral-500">Categories are temporarily unavailable.</div>
        ) : categories.length === 0 ? (
          <div className="py-10 text-center text-sm text-neutral-500">No active categories are available.</div>
        ) : (
          <div
            className="flex overflow-x-auto pb-4 md:pb-0 scrollbar-none snap-x -mx-4 px-4 sm:mx-0 sm:px-0 md:grid gap-4 sm:gap-6 md:gap-4 lg:gap-6 xl:gap-8 justify-start md:justify-center"
            style={{ gridTemplateColumns: `repeat(${Math.min(categories.length, 8)}, minmax(0, 1fr))` }}
          >
          {categories.map((c) => (
            <Link
              key={c.id || c.slug}
              href={`/shop?cat=${c.slug}`}
              className="text-center transition shrink-0 snap-center group w-20 sm:w-24 md:w-full max-w-[150px] mx-auto"
            >
              {c.style === 'sale' ? (
                <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-full md:h-auto md:aspect-square rounded-2xl bg-black text-white flex items-center justify-center mx-auto font-display font-bold text-xs sm:text-sm md:text-base lg:text-lg transition group-hover:-translate-y-1.5 shadow-sm group-hover:shadow-md">
                  {c.name.toUpperCase()}
                </div>
              ) : (
                <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-full md:h-auto md:aspect-square rounded-2xl overflow-hidden relative mx-auto transition group-hover:-translate-y-1.5 shadow-sm group-hover:shadow-md bg-neutral-100">
                  {c.imageUrl ? (
                    <Image src={c.imageUrl} alt={c.name} fill className="object-cover" />
                  ) : (
                    <span className="absolute inset-0 flex items-center justify-center px-2 text-center text-xs font-semibold text-neutral-500">
                      {c.name}
                    </span>
                  )}
                </div>
              )}
              <p className="mt-3 text-xs sm:text-sm lg:text-base font-semibold text-neutral-800 group-hover:text-black truncate">
                {c.name}
              </p>
            </Link>
          ))}
          </div>
        )}
      </section>

      {/* NEW ARRIVALS */}
      <section className="max-w-7xl mx-auto px-4 py-8 w-full overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 gap-4">
          <div>
            <h2 className="font-display text-xl sm:text-2xl font-bold tracking-wide text-neutral-900">NEW ARRIVALS</h2>
            <p className="text-neutral-500 text-xs sm:text-sm">Fresh styles. Just in.</p>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/shop?cat=new-arrival" className="text-sm font-medium hover:underline text-neutral-800 whitespace-nowrap">
              View all
            </Link>
            {maxProductIndex > 0 && (
              <div className="hidden md:flex items-center gap-1.5">
                <button
                  onClick={prevNewArrivals}
                  className="w-8 h-8 rounded-full border border-neutral-200 bg-white hover:bg-black hover:text-white text-neutral-800 transition flex items-center justify-center active:scale-90 cursor-pointer shadow-xs"
                  aria-label="Previous Products"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={nextNewArrivals}
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
            style={{ transform: `translateX(-${currentNewArrivals * (100 / productVisibleSlides)}%)` }}
          >
            {newArrivals.map((product) => (
              <div
                key={product.id}
                className="shrink-0 px-2 sm:px-3 flex flex-col"
                style={{ width: `${100 / productVisibleSlides}%` }}
              >
                {renderProductCard(product, false)}
              </div>
            ))}
          </div>
        </div>

        {/* Mobile Static Grid */}
        <div className="block md:hidden px-0.5 py-2">
          <div className="grid grid-cols-2 gap-x-4 gap-y-6">
            {newArrivals.map((product) => (
              <div key={product.id} className="flex flex-col">
                {renderProductCard(product, false)}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DYNAMIC PROMO CAMPAIGN BANNER */}
      {!campaignLoading && activeCampaign && !campaignExpired && (
        <section className="w-full bg-[#111110] text-white py-12 sm:py-16 my-8 overflow-hidden relative">
          {/* Dynamic background image from database */}
          <div className="absolute inset-0" style={{ opacity: activeCampaign.backgroundOverlayOpacity ? 1 - activeCampaign.backgroundOverlayOpacity : 0.45 }}>
            {activeCampaign.backgroundImageUrl ? (
              <img
                src={activeCampaign.backgroundImageUrl}
                alt="Promotion Background"
                className="w-full h-full object-cover object-center"
              />
            ) : (
              <img
                src="/colossal-rigout-logo.png"
                alt="Fallback"
                className="w-full h-full object-cover object-center opacity-20"
              />
            )}
          </div>
          {/* Dark overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/30" />
          
          <div className={`max-w-7xl mx-auto px-4 relative flex flex-col md:flex-row items-center justify-between gap-8 ${
            activeCampaign.textAlignment === 'center' ? 'md:justify-center text-center' : ''
          }`}>
            <div className={`space-y-3 max-w-xl ${activeCampaign.textAlignment === 'center' ? 'text-center' : 'text-center md:text-left'}`}>
              {activeCampaign.badgeText && (
                <span className="inline-block bg-amber-500 text-black font-display font-black text-[10px] tracking-widest px-3 py-1 rounded uppercase">
                  {activeCampaign.badgeText}
                </span>
              )}
              <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-none text-white">
                {activeCampaign.heading}
              </h2>
              {activeCampaign.description && (
                <p className="text-neutral-300 text-sm sm:text-base font-medium">
                  {activeCampaign.highlightText && (
                    <span className="text-amber-400 font-bold">{activeCampaign.highlightText} </span>
                  )}
                  {activeCampaign.description}
                  {activeCampaign.discountMode === 'coupon' && activeCampaign.couponCode && (
                    <> Use code <span className="font-mono bg-white/10 text-white px-2 py-0.5 rounded text-xs font-semibold">{activeCampaign.couponCode}</span> at checkout.</>
                  )}
                </p>
              )}
            </div>

            <div className="flex flex-col items-center gap-5 shrink-0 bg-white/5 border border-white/10 backdrop-blur-md p-6 sm:p-8 rounded-2xl w-full max-w-sm">
              <p className="text-xs font-bold tracking-widest text-neutral-400 uppercase text-center">
                Offer Ends In
              </p>
              
              <div className={`grid gap-4 text-center ${countdown.days > 0 ? 'grid-cols-4' : 'grid-cols-3'}`}>
                {countdown.days > 0 && (
                  <div className="flex flex-col items-center min-w-[60px] bg-black/45 p-3 rounded-xl border border-white/5">
                    <span className="font-mono text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
                      {String(countdown.days).padStart(2, '0')}
                    </span>
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mt-1">Days</span>
                  </div>
                )}
                <div className="flex flex-col items-center min-w-[60px] bg-black/45 p-3 rounded-xl border border-white/5">
                  <span className="font-mono text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
                    {String(countdown.hours).padStart(2, '0')}
                  </span>
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mt-1">Hours</span>
                </div>
                <div className="flex flex-col items-center min-w-[60px] bg-black/45 p-3 rounded-xl border border-white/5">
                  <span className="font-mono text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
                    {String(countdown.minutes).padStart(2, '0')}
                  </span>
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mt-1">Mins</span>
                </div>
                <div className="flex flex-col items-center min-w-[60px] bg-black/45 p-3 rounded-xl border border-white/5">
                  <span className="font-mono text-3xl sm:text-4xl font-extrabold tracking-tight text-amber-400">
                    {String(countdown.seconds).padStart(2, '0')}
                  </span>
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mt-1">Secs</span>
                </div>
              </div>

              <Link
                href={`/shop?campaign=${activeCampaign.id}`}
                className="w-full bg-white hover:bg-neutral-100 text-black text-center text-xs font-bold py-3 px-6 rounded-lg transition uppercase tracking-wider active:scale-[0.98] cursor-pointer shadow-md"
              >
                {activeCampaign.ctaText}
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* BEST SELLERS */}
      <section className="max-w-7xl mx-auto px-4 py-8 w-full overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 gap-4">
          <div>
            <h2 className="font-display text-xl sm:text-2xl font-bold tracking-wide text-neutral-900">BEST SELLERS</h2>
            <p className="text-neutral-500 text-xs sm:text-sm">Loved by our customers.</p>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/shop?cat=best-seller" className="text-sm font-medium hover:underline text-neutral-800 whitespace-nowrap">
              View all
            </Link>
            {maxProductIndex > 0 && (
              <div className="hidden md:flex items-center gap-1.5">
                <button
                  onClick={prevBestSellers}
                  className="w-8 h-8 rounded-full border border-neutral-200 bg-white hover:bg-black hover:text-white text-neutral-800 transition flex items-center justify-center active:scale-90 cursor-pointer shadow-xs"
                  aria-label="Previous Products"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={nextBestSellers}
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
            style={{ transform: `translateX(-${currentBestSellers * (100 / productVisibleSlides)}%)` }}
          >
            {bestSellers.map((product) => (
              <div
                key={product.id}
                className="shrink-0 px-2 sm:px-3 flex flex-col"
                style={{ width: `${100 / productVisibleSlides}%` }}
              >
                {renderProductCard(product, true)}
              </div>
            ))}
          </div>
        </div>

        {/* Mobile Static Grid */}
        <div className="block md:hidden px-0.5 py-2">
          <div className="grid grid-cols-2 gap-x-4 gap-y-6">
            {bestSellers.map((product) => (
              <div key={product.id} className="flex flex-col">
                {renderProductCard(product, true)}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PROMO BANNERS */}
      <CampaignCardsCarousel />

      {/* EXPLORE COLLECTIONS */}
      <section className="max-w-7xl mx-auto px-4 py-10 w-full">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-wide">EXPLORE COLLECTIONS</h2>
            <p className="text-neutral-500 text-sm">Handpicked styles for every vibe.</p>
          </div>
          <Link href="/shop" className="text-sm font-medium hover:underline text-neutral-800">
            View all
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {collections.map((coll, idx) => (
            <Link
              href={`/shop?collection=${coll.slug}`}
              key={coll.id || idx}
              className="relative rounded-md overflow-hidden h-48 sm:h-60 md:h-72 group cursor-pointer"
            >
              <Image
                src={coll.img}
                alt={coll.title}
                fill
                className="object-cover transition duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/30"></div>
              <div className="absolute bottom-4 left-4 text-white">
                <p className="font-display font-bold text-base sm:text-lg">{coll.title}</p>
                <p className="text-[10px] mt-0.5 text-neutral-200">{coll.subtitle}</p>
                <p className="text-[11px] underline mt-1.5 font-medium tracking-wider">SHOP NOW</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* REVIEWS */}
      <section className="max-w-7xl mx-auto px-4 py-8 w-full overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 gap-4">
          <div>
            <h2 className="font-display text-xl sm:text-2xl font-bold tracking-wide text-neutral-900">
              WHAT OUR CUSTOMERS SAY
            </h2>
            <p className="text-neutral-500 text-xs sm:text-sm">Real reviews from real Colossal Rigout shoppers.</p>
          </div>
          
          {/* Navigation Controls */}
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
        </div>

        {/* Carousel Viewport Container */}
        <div className="relative overflow-hidden w-full px-0.5 py-2">
          <div
            className="flex transition-transform duration-500 ease-out"
            style={{ transform: `translateX(-${currentReview * (100 / visibleSlides)}%)` }}
          >
            {reviews.map((r, idx) => (
              <div
                key={idx}
                className="w-full sm:w-1/2 lg:w-1/3 shrink-0 px-2 sm:px-3 flex flex-col"
              >
                <div className="bg-[#f4f4f3] border border-neutral-200 rounded-lg p-6 flex flex-col justify-between h-full hover:shadow-md transition duration-300 min-h-[220px]">
                  <div>
                    <div className="flex gap-0.5 text-amber-500 text-sm">
                      {Array.from({ length: r.rating || 5 }).map((_, i) => (
                        <span key={i}>&#9733;</span>
                      ))}
                    </div>
                    <p className="text-sm text-neutral-700 mt-4 leading-relaxed italic">
                      &ldquo;{r.quote}&rdquo;
                    </p>
                  </div>
                  <div className="mt-5 pt-4 border-t border-neutral-200/50 flex flex-col">
                    <p className="text-xs font-semibold text-neutral-900">{r.name}</p>
                    <p className="text-[10px] text-neutral-400 mt-0.5">Verified buyer &middot; {r.product}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Dots Indicators */}
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
      </section>

      {/* SHOP THE LOOK */}
      <section className="max-w-7xl mx-auto px-4 py-10 w-full">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-display text-xl sm:text-2xl font-bold tracking-wide text-neutral-900">
              SHOP THE LOOK
            </h2>
            <p className="text-neutral-500 text-xs sm:text-sm">
              Tag us <span className="font-medium text-black">@colossalrigout</span> to be featured.
            </p>
          </div>
          <a href="#" className="text-xs sm:text-sm font-medium flex items-center gap-1 hover:underline">
            Follow us <span>&rarr;</span>
          </a>
        </div>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2 sm:gap-3">
          {instaPosts.map((img, idx) => (
            <div key={idx} className="relative aspect-square overflow-hidden rounded-md group cursor-pointer">
              <Image
                src={img}
                alt={`Instagram look #${idx}`}
                fill
                className="object-cover transition duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition flex items-center justify-center">
                <span className="opacity-0 group-hover:opacity-100 transition text-white text-xs font-semibold tracking-wide">
                  SHOP LOOK
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SERVICES / TRUST STRIP */}
      <div className="border-t border-neutral-200 bg-[#fbfbfa] py-6 sm:py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-y-4 gap-x-3 text-center md:text-left">
            <div className="flex flex-col sm:flex-row items-center gap-2.5 justify-center md:justify-start">
              <Truck className="w-5 h-5 text-neutral-800 shrink-0" />
              <div>
                <p className="font-display font-bold text-xs uppercase tracking-wider text-neutral-900">Free Shipping</p>
                <p className="text-neutral-500 text-[10px] mt-0.5">On orders over $75</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-2.5 justify-center md:justify-start">
              <RotateCcw className="w-5 h-5 text-neutral-800 shrink-0" />
              <div>
                <p className="font-display font-bold text-xs uppercase tracking-wider text-neutral-900">Easy Returns</p>
                <p className="text-neutral-500 text-[10px] mt-0.5">30-day return policy</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-2.5 justify-center md:justify-start">
              <ShieldCheck className="w-5 h-5 text-neutral-800 shrink-0" />
              <div>
                <p className="font-display font-bold text-xs uppercase tracking-wider text-neutral-900">Secure Payment</p>
                <p className="text-neutral-500 text-[10px] mt-0.5">100% secure checkout</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-2.5 justify-center md:justify-start">
              <MapPin className="w-5 h-5 text-neutral-800 shrink-0" />
              <div>
                <p className="font-display font-bold text-xs uppercase tracking-wider text-neutral-900">Our Store</p>
                <p className="text-neutral-500 text-[10px] mt-0.5">Gulberg, Lahore & more</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* NEWSLETTER */}
      <section className="bg-[#f4efe9] py-12 sm:py-16 w-full">
        <div className="max-w-2xl mx-auto text-center px-4">
          <h2 className="font-display text-2xl sm:text-3xl font-bold flex items-center justify-center gap-2">
            GET 10% OFF YOUR FIRST ORDER <Sparkles className="w-5 h-5 text-purple-600" />
          </h2>
          <p className="text-neutral-600 text-sm mt-2 font-light">
            Subscribe to our newsletter for exclusive offers and new arrivals.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              alert('Thanks for subscribing! Use WELCOME10 coupon code for 10% off.');
              e.currentTarget.reset();
            }}
            className="mt-6 flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto"
          >
            <input
              required
              type="email"
              placeholder="Enter your email"
              className="flex-1 border border-neutral-300 rounded-md px-4 py-3 text-sm outline-none bg-white focus:border-black transition text-neutral-800"
            />
            <button className="bg-black text-white text-sm font-semibold px-6 py-3 rounded-md hover:bg-neutral-800 transition whitespace-nowrap active:scale-95">
              SUBSCRIBE
            </button>
          </form>
        </div>
      </section>

      {/* QUICK ADD MODAL */}
      {quickAddProduct && (
        <QuickAddModal
          product={quickAddProduct}
          onClose={() => setQuickAddProduct(null)}
          onAddToCart={(item) => {
            addToCart(item);
            alert(`Added ${item.name} (${item.size}, ${item.color}) to your Cart!`);
          }}
        />
      )}
    </div>
  );
}
