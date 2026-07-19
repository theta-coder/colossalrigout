'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useCart } from '../../context/CartContext';
import { useProducts } from '../../context/ProductsContext';
import { Product as CatalogProduct } from '../../lib/products';
import { Heart, SlidersHorizontal, Star, X, ChevronDown } from 'lucide-react';
import { ShopCategory } from '../../lib/category';

const colorClasses: Record<string, string> = {
  Black: 'bg-black',
  Stone: 'bg-stone-300',
  Navy: 'bg-blue-900',
  Blue: 'bg-blue-600',
  White: 'bg-white border border-neutral-300',
  Grey: 'bg-neutral-500',
  Amber: 'bg-amber-800',
};

function ShopContent() {
  const { toggleWishlist, wishlist, addToCart } = useCart();
  const { products } = useProducts();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Filters State
  const [selectedGroup, setSelectedGroup] = useState<'All' | 'Men' | 'Kids'>('All');
  const [selectedSubCat, setSelectedSubCat] = useState<string>('All');
  const [specialTag, setSpecialTag] = useState<string>('All');
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [priceRange, setPriceRange] = useState<number>(200);
  const [sortBy, setSortBy] = useState<string>('Featured');
  const [visibleCount, setVisibleCount] = useState<number>(6);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [desktopSortOpen, setDesktopSortOpen] = useState(false);
  const [mobileSortOpen, setMobileSortOpen] = useState(false);
  const [isFromHome, setIsFromHome] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCollection, setSelectedCollection] = useState<string>('');

  const [categories, setCategories] = useState<ShopCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  // Dynamic campaign states
  const [campaignProducts, setCampaignProducts] = useState<any[] | null>(null);
  const [campaignDetails, setCampaignDetails] = useState<any | null>(null);
  const [campaignLoading, setCampaignLoading] = useState(false);

  useEffect(() => {
    const fetchCats = async () => {
      try {
        const res = await fetch('/api/categories');
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          setCategories(data.data);
        }
      } catch (err) {
        console.error("Error loading categories in Shop:", err);
      } finally {
        setCategoriesLoading(false);
      }
    };
    fetchCats();
  }, []);

  const sortOptions = [
    'Sort: Featured',
    'Price: Low to High',
    'Price: High to Low',
    'Newest'
  ];



  // Read search queries on mount / transition
  useEffect(() => {
    const catQuery = searchParams.get('cat');
    const wishlistQuery = searchParams.get('wishlist');
    const fromHomeQuery = searchParams.get('fromHome') === 'true';
    const qQuery = searchParams.get('q');
    const collectionQuery = searchParams.get('collection');
    const campaignId = searchParams.get('campaign');
    const promotionId = searchParams.get('promotion');

    if (campaignId || promotionId) {
      setCampaignLoading(true);
      fetch(promotionId ? `/api/promotions/${promotionId}/products` : `/api/promo-campaigns/${campaignId}/products`)
        .then(res => res.json())
        .then(json => {
          if (json.success && Array.isArray(json.data)) {
            setCampaignProducts(json.data);
            setCampaignDetails(json.campaign);
          } else {
            setCampaignProducts([]);
            setCampaignDetails(null);
          }
        })
        .catch(() => {
          setCampaignProducts([]);
          setCampaignDetails(null);
        })
        .finally(() => setCampaignLoading(false));
    } else {
      setCampaignProducts(null);
      setCampaignDetails(null);
    }

    setTimeout(() => {
      if (fromHomeQuery) {
        setIsFromHome(true);
      } else {
        setIsFromHome(false);
      }

      if (qQuery) {
        setSearchQuery(qQuery);
      } else {
        setSearchQuery('');
      }
      setSelectedCollection(collectionQuery || '');

      if (catQuery) {
        const queryLower = catQuery.toLowerCase();
        if (queryLower === 'men') {
          setSelectedGroup('Men');
          setSelectedSubCat('All');
          setSpecialTag('All');
        } else if (queryLower === 'kids') {
          setSelectedGroup('Kids');
          setSelectedSubCat('All');
          setSpecialTag('All');
        } else if (queryLower === 'new-arrival' || queryLower === 'new' || queryLower === 'newarrivals' || queryLower === 'new-arrivals') {
          setSelectedGroup('All');
          setSelectedSubCat('All');
          setSpecialTag('New Arrivals');
        } else if (queryLower === 'sale' || queryLower === 'sales') {
          setSelectedGroup('All');
          setSelectedSubCat('All');
          setSpecialTag('Sale');
        } else if (queryLower === 'best-seller' || queryLower === 'bestseller' || queryLower === 'best-sellers') {
          setSelectedGroup('All');
          setSelectedSubCat('All');
          setSpecialTag('Best Seller');
        } else if (queryLower === 'the-everyday-edit' || queryLower === 'everyday' || queryLower === 'everyday-edit') {
          setSelectedGroup('All');
          setSelectedSubCat('All');
          setSpecialTag('The Everyday Edit');
        } else if (queryLower === 'weekend-vibes' || queryLower === 'weekend') {
          setSelectedGroup('All');
          setSelectedSubCat('All');
          setSpecialTag('Weekend Vibes');
        } else if (queryLower === 'date-night' || queryLower === 'datenight') {
          setSelectedGroup('All');
          setSelectedSubCat('All');
          setSpecialTag('Date Night');
        } else if (queryLower === 'power-look' || queryLower === 'powerlook') {
          setSelectedGroup('All');
          setSelectedSubCat('All');
          setSpecialTag('Power Look');
        } else {
          setSelectedGroup('All');
          setSelectedSubCat(queryLower);
          setSpecialTag('All');
        }
      }

      if (wishlistQuery === 'true') {
        router.push('/wishlist');
      }
    }, 0);
  }, [searchParams, router]);

  // Handle chips
  const quickChips = ['All', 'Men', 'Kids'];

  // Quick Add State
  const [quickAddProduct, setQuickAddProduct] = useState<CatalogProduct | null>(null);
  const [quickSize, setQuickSize] = useState<string>('M');
  const [quickColor, setQuickColor] = useState<string>('');
  const [inventoryVariants, setInventoryVariants] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/commerce/inventory').then(res => res.json()).then(payload => {
      if (payload.success) setInventoryVariants(payload.data);
    }).catch(() => setInventoryVariants([]));
  }, []);

  const quickVariant = quickAddProduct ? inventoryVariants.find(variant => {
    const colorIndex = quickAddProduct.colors.indexOf(quickColor);
    const sizeIndex = quickAddProduct.sizes.indexOf(quickSize);
    return String(variant.productId) === String(quickAddProduct.id)
      && variant.colorId === (quickAddProduct.colorIds?.[colorIndex] || quickColor)
      && variant.sizeId === (quickAddProduct.sizeIds?.[sizeIndex] || quickSize);
  }) : null;

  const dynamicCollections = Array.from(
    new Set(products.flatMap((p) => p.collections || []))
  ).sort();



  // Apply filters
  const productsSource = campaignProducts !== null ? campaignProducts : products;
  const filteredProducts = productsSource
    .filter((product) => {
      // 0. Search Query Match
      if (searchQuery) {
        const queryLower = searchQuery.toLowerCase().trim();
        const matchesName = product.name.toLowerCase().includes(queryLower);
        const matchesDesc = product.description.toLowerCase().includes(queryLower);
        const matchesCat = product.cat.toLowerCase().includes(queryLower);
        const matchesCollections = product.collections?.some((col: any) => col.toLowerCase().includes(queryLower)) || false;
        if (!matchesName && !matchesDesc && !matchesCat && !matchesCollections) {
          return false;
        }
      }

      // 1. Group Match (Men / Kids)
      if (selectedGroup === 'Men') {
        if (product.cat === 'Kids' || product.cat === 'kids') return false;
      } else if (selectedGroup === 'Kids') {
        if (product.cat !== 'Kids' && product.cat !== 'kids') return false;
      }

      // 2. Subcategory Match
      if (selectedSubCat !== 'All') {
        const prodCatLower = (product.cat || '').toLowerCase();
        const subCatLower = selectedSubCat.toLowerCase();
        if (subCatLower === 'tops') {
          if (prodCatLower !== 'tops' && prodCatLower !== 'shirts' && prodCatLower !== 't-shirts') return false;
        } else {
          if (prodCatLower !== subCatLower) return false;
        }
      }

      // 3. Special Tag Match (New Arrival, Sale, Best Seller, Everyday Edit, Weekend Vibes, Date Night, Power Look)
      if (specialTag === 'New Arrivals') {
        if (product.id < 11) return false; // Show ids 11-19 as New Arrivals
      } else if (specialTag === 'Sale') {
        if (product.price >= 35) return false; // Show items < $35 on sale
      } else if (specialTag === 'Best Seller') {
        const isBest = product.isBestseller || product.rating === '4.9' || (product.sold && Number(product.sold.replace(/\D/g, '')) > 1500);
        if (!isBest) return false;
      } else if (specialTag !== 'All') {
        if (!product.collections?.includes(specialTag)) return false;
      }

      if (selectedCollection && !(product.collectionIds || product.collections || []).includes(selectedCollection)) {
        return false;
      }

      // Size Match
      if (selectedSize && !product.sizes.includes(selectedSize)) {
        return false;
      }
      // Color Match
      if (selectedColor && !product.colors.includes(selectedColor)) {
        return false;
      }
      // Price Match
      if (product.price > priceRange) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      // Sort Match
      if (sortBy === 'Price: Low to High') return a.price - b.price;
      if (sortBy === 'Price: High to Low') return b.price - a.price;
      if (sortBy === 'Newest') return b.id - a.id; // simulate newest by higher ID
      return 0; // Featured / Default
    });

  const handleQuickAdd = (product: CatalogProduct) => {
    setQuickAddProduct(product);
    setQuickSize(product.sizes[0] || 'M');
    setQuickColor(product.colors[0] || 'Default');
  };

  const handleClearFilters = () => {
    setSelectedGroup('All');
    setSelectedSubCat('All');
    setSpecialTag('All');
    setSelectedSize(null);
    setSelectedColor(null);
    setPriceRange(200);
    setSortBy('Featured');
    setIsFromHome(false);
    setSearchQuery('');
    setSelectedCollection('');
    setCampaignProducts(null);
    setCampaignDetails(null);
    router.push('/shop');
  };

  const loadMore = () => {
    setVisibleCount((prev) => Math.min(prev + 6, filteredProducts.length));
  };

  const visibleProducts = filteredProducts.slice(0, visibleCount);

  return (
    <div className="max-w-7xl mx-auto px-4 pb-16">
      {/* PAGE HEADER BANNER */}
      <section className="relative h-48 sm:h-64 md:h-72 lg:h-80 overflow-hidden -mx-4 mb-4">
        <Image
          src="/colossal-rigout-logo.png"
          alt="Men apparel banner"
          fill
          priority
          className="object-cover object-center opacity-40"
        />
        <div className="absolute inset-0 bg-black/60"></div>
        <div className="relative z-10 max-w-7xl mx-auto h-full flex flex-col justify-center px-4">
          <h1 className="font-display text-white text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight uppercase max-w-2xl leading-none">
            {campaignDetails ? campaignDetails.heading : (searchQuery ? `Search: "${searchQuery}"` : (selectedSubCat !== 'All' ? `${selectedGroup !== 'All' ? selectedGroup.toUpperCase() + ' ' : ''}${selectedSubCat.toUpperCase()}` : selectedGroup.toUpperCase()))}
          </h1>
          <p className="text-neutral-200 text-xs sm:text-sm mt-1">
            {campaignDetails 
              ? `Promo Campaign active. ${filteredProducts.length} eligible item${filteredProducts.length !== 1 ? 's' : ''} available.`
              : `${filteredProducts.length} product${filteredProducts.length !== 1 ? 's' : ''} found`
            }
          </p>
        </div>
      </section>

      {/* BREADCRUMB */}
      <div className="py-4 text-xs sm:text-sm text-neutral-500">
        <Link href="/" className="hover:text-black">Home</Link>{' '}
        <span className="mx-1">/</span>{' '}
        <span className="text-neutral-900 font-medium">Shop</span>
        {selectedGroup !== 'All' && (
          <>
            <span className="mx-1">/</span>{' '}
            <span className="text-neutral-900 font-medium">{selectedGroup}</span>
          </>
        )}
        {selectedSubCat !== 'All' && (
          <>
            <span className="mx-1">/</span>{' '}
            <span className="text-neutral-900 font-medium">{selectedSubCat}</span>
          </>
        )}
        {searchQuery && (
          <>
            <span className="mx-1">/</span>{' '}
            <span className="text-neutral-900 font-medium">Search: &quot;{searchQuery}&quot;</span>
          </>
        )}
      </div>

      {/* QUICK CATEGORY CHIPS */}
      <div className="pb-6">
        {searchQuery && (
          <div className="mb-4 flex items-center justify-between bg-[#f4f4f3] border border-neutral-300 px-4 py-2.5 rounded-md text-xs sm:text-sm">
            <span className="font-medium text-neutral-800">
              Showing results for search: <span className="font-bold text-black">&quot;{searchQuery}&quot;</span>
            </span>
            <button
              onClick={() => {
                setSearchQuery('');
                router.push('/shop');
              }}
              className="text-neutral-600 hover:text-black font-semibold flex items-center gap-1 cursor-pointer text-xs"
            >
              <X className="w-3.5 h-3.5" /> CLEAR SEARCH
            </button>
          </div>
        )}
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          {/* Section (Group) Toggles */}
          <div className="flex gap-1.5 items-center bg-neutral-200/55 p-1 rounded-full self-start">
            {quickChips.map((chip, idx) => {
              const isSelected = selectedGroup === chip && selectedSubCat === 'All';
              return (
                <button
                  key={idx}
                  onClick={() => {
                    setSelectedGroup(chip as 'All' | 'Men' | 'Kids');
                    setSelectedSubCat('All');
                    setSpecialTag('All');
                    setIsFromHome(false);
                    setVisibleCount(6);
                  }}
                  className={`rounded-full px-4 py-1.5 text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                    isSelected
                      ? 'bg-black text-white shadow-sm'
                      : 'text-neutral-600 hover:text-black'
                  }`}
                >
                  {chip}
                </button>
              );
            })}
          </div>

          <span className="text-neutral-300 hidden sm:inline">|</span>

          {/* Quick Special Collections Filters */}
          <div className="flex gap-2 overflow-x-auto cat-scroll pb-1 sm:pb-0">
            {[
              { label: '★ New Arrivals', value: 'New Arrivals' as const, bg: 'hover:border-blue-500 hover:text-blue-600', active: 'bg-blue-50 border-blue-500 text-blue-600 font-bold' },
              { label: '🏷️ Sales', value: 'Sale' as const, bg: 'hover:border-emerald-500 hover:text-emerald-600', active: 'bg-emerald-50 border-emerald-500 text-emerald-600 font-bold' },
              { label: '🔥 Best Sellers', value: 'Best Seller' as const, bg: 'hover:border-amber-500 hover:text-amber-600', active: 'bg-amber-50 border-amber-500 text-amber-600 font-bold' },
            ].map((col) => {
              const isSelected = specialTag === col.value;
              return (
                <button
                  key={col.value}
                  onClick={() => {
                    setSpecialTag(isSelected ? 'All' : col.value);
                    setIsFromHome(false);
                    setVisibleCount(6);
                  }}
                  className={`flex-none border rounded-full px-4 py-1.5 text-xs font-medium whitespace-nowrap transition cursor-pointer ${
                    isSelected
                      ? col.active
                      : `border-neutral-300 text-neutral-600 bg-white ${col.bg}`
                  }`}
                >
                  {col.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* MAIN CONTAINER */}
      <div className="flex flex-col lg:flex-row gap-8">
        {/* SIDEBAR FILTERS (desktop) */}
        <aside className="hidden lg:block w-56 flex-none">
          <div className="sticky top-24 space-y-8">
            <div>
              <p className="font-bold text-xs tracking-widest text-neutral-400 uppercase mb-4">CATEGORIES</p>
              <div className="space-y-6">
                <ul className="space-y-2.5 text-xs text-neutral-600 pl-1 font-medium mb-6">
                  <li>
                    <button
                      onClick={() => {
                        setSelectedSubCat('All');
                        setSelectedGroup('All');
                        setIsFromHome(false);
                        setVisibleCount(6);
                        router.push('/shop');
                      }}
                      className={`hover:text-black transition uppercase tracking-wider text-[11px] font-bold cursor-pointer ${
                        selectedSubCat === 'All' ? 'text-black border-b-2 border-black pb-0.5' : 'text-neutral-500'
                      }`}
                    >
                      All Categories
                    </button>
                  </li>
                  {categories.map((c) => {
                    const isSelected = selectedSubCat === c.slug;
                    return (
                      <li key={c.id}>
                        <button
                          onClick={() => {
                            setSelectedSubCat(c.slug);
                            setSelectedGroup('All');
                            setIsFromHome(false);
                            setVisibleCount(6);
                            router.push(`/shop?cat=${c.slug}`);
                          }}
                          className={`hover:text-black transition uppercase tracking-wider text-[11px] font-bold cursor-pointer ${
                            isSelected ? 'text-black border-b-2 border-black pb-0.5' : 'text-neutral-500'
                          }`}
                        >
                          {c.name}
                        </button>
                      </li>
                    );
                  })}
                </ul>

                {/* Explore Collections Section (Dynamic) */}
                <div className="space-y-2.5 pt-2">
                  <button
                    onClick={() => {
                      setSpecialTag('All');
                      setSelectedSubCat('All');
                      setIsFromHome(false);
                      setVisibleCount(6);
                    }}
                    className="flex items-center gap-2 pb-1.5 border-b border-neutral-100 w-full hover:opacity-85 transition text-left cursor-pointer"
                  >
                    <span className="w-1.5 h-3.5 bg-neutral-400 rounded-sm shrink-0"></span>
                    <span className="font-display font-extrabold text-[11px] sm:text-xs tracking-widest text-neutral-900 uppercase">
                      EXPLORE COLLECTIONS
                    </span>
                  </button>
                  <ul className="space-y-2.5 text-xs text-neutral-600 pl-3.5 font-medium">
                    {dynamicCollections.map((colName, idx) => {
                      const isSelected = specialTag === colName;
                      return (
                        <li key={idx}>
                          <button
                            onClick={() => {
                              setSpecialTag(isSelected ? 'All' : colName);
                              setSelectedSubCat('All');
                              setIsFromHome(false);
                              setVisibleCount(6);
                            }}
                            className={`flex items-center gap-2 hover:text-black transition text-left w-full ${
                              isSelected ? 'text-black font-extrabold' : ''
                            }`}
                          >
                            <span className={isSelected ? 'border-b-2 border-black pb-0.5' : ''}>
                              {colName}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            </div>

            {/* Size filters */}
            <div>
              <p className="font-semibold text-sm mb-3 tracking-wider text-neutral-900">SIZE</p>
              <div className="flex flex-wrap gap-2">
                {['S', 'M', 'L', 'XL'].map((size) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(selectedSize === size ? null : size)}
                    className={`w-9 h-9 border rounded-md text-xs font-medium transition ${
                      selectedSize === size
                        ? 'border-black bg-black text-white'
                        : 'border-neutral-300 hover:border-black bg-white text-neutral-800'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Color filters */}
            <div>
              <p className="font-semibold text-sm mb-3 tracking-wider text-neutral-900">COLOR</p>
              <div className="flex flex-wrap gap-2">
                {Object.keys(colorClasses).map((col) => (
                  <button
                    key={col}
                    onClick={() => setSelectedColor(selectedColor === col ? null : col)}
                    className={`w-7 h-7 rounded-full ${colorClasses[col]} ring-2 ring-offset-2 transition ${
                      selectedColor === col ? 'ring-black scale-110' : 'ring-transparent hover:ring-neutral-300'
                    }`}
                    title={col}
                  />
                ))}
              </div>
            </div>

            {/* Price Filter */}
            <div>
              <p className="font-semibold text-sm mb-3 tracking-wider text-neutral-900">PRICE</p>
              <input
                type="range"
                min="10"
                max="200"
                value={priceRange}
                onChange={(e) => setPriceRange(Number(e.target.value))}
                className="w-full accent-black cursor-pointer"
              />
              <div className="flex justify-between text-xs text-neutral-500 mt-1 font-medium">
                <span>$10</span>
                <span className="text-black font-bold">${priceRange}</span>
                <span>$200+</span>
              </div>
            </div>

            <button
              onClick={handleClearFilters}
              className="w-full border border-black text-black text-xs font-semibold py-2.5 rounded-md hover:bg-black hover:text-white transition active:scale-95"
            >
              CLEAR ALL FILTERS
            </button>
          </div>
        </aside>

        {/* PRODUCTS AREA */}
        <div className="flex-1">
          {/* Mobile filter bar */}
          <div className="flex lg:hidden items-center justify-between mb-4">
            <button
              onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
              className="flex items-center gap-2 border border-neutral-300 rounded-md px-4 py-2 text-sm font-medium bg-white"
            >
              <SlidersHorizontal className="w-4 h-4 text-neutral-700" />
              Filters {mobileFiltersOpen ? '(Close)' : ''}
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={() => setMobileSortOpen(!mobileSortOpen)}
                className="border border-neutral-300 rounded-md px-3 py-2 text-xs sm:text-sm bg-white text-neutral-800 focus:border-black outline-none transition flex items-center justify-between gap-1.5 min-w-[130px] sm:min-w-[150px] text-left cursor-pointer hover:bg-neutral-50"
              >
                <span>{sortBy}</span>
                <ChevronDown className="w-4 h-4 text-neutral-500 transition-transform duration-200" style={{ transform: mobileSortOpen ? 'rotate(180deg)' : 'none' }} />
              </button>

              {mobileSortOpen && (
                <>
                  <div
                    className="fixed inset-0 z-20 cursor-default"
                    onClick={() => setMobileSortOpen(false)}
                  />
                  <div className="absolute right-0 mt-1 w-full min-w-[150px] bg-white border border-neutral-200 rounded-md shadow-lg py-1 z-30 animate-fade-in-down">
                    {sortOptions.map((opt) => {
                      const isSelected = sortBy === opt;
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => {
                            setSortBy(opt);
                            setMobileSortOpen(false);
                          }}
                          className={`w-full text-left px-3.5 py-2.5 text-xs font-semibold transition cursor-pointer ${
                            isSelected
                              ? 'bg-black text-white'
                              : 'text-neutral-700 hover:bg-neutral-100 hover:text-black'
                          }`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Mobile filter sheet */}
          {mobileFiltersOpen && (
            <div className="lg:hidden mb-6 border border-neutral-200 rounded-md p-4 bg-white space-y-5 animate-fade-up">
              {/* Section (Group) */}
              <div>
                <p className="font-bold text-xs mb-2">SECTION</p>
                <div className="flex flex-wrap gap-2">
                  {['All', 'Men', 'Kids'].map((grp) => (
                    <button
                      key={grp}
                      onClick={() => {
                        setSelectedGroup(grp as 'All' | 'Men' | 'Kids');
                        setSelectedSubCat('All');
                        setIsFromHome(false);
                      }}
                      className={`text-xs px-3 py-1 border rounded-full transition ${
                        selectedGroup === grp ? 'bg-black text-white' : 'border-neutral-300 text-neutral-600 bg-neutral-50'
                      }`}
                    >
                      {grp}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category (SubCat) */}
              <div>
                <p className="font-bold text-xs mb-2">CATEGORY</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      setSelectedSubCat('All');
                      setSelectedGroup('All');
                      setIsFromHome(false);
                      router.push('/shop');
                    }}
                    className={`text-xs px-3 py-1.5 border rounded-full transition cursor-pointer ${
                      selectedSubCat === 'All' ? 'bg-black text-white' : 'border-neutral-300 text-neutral-600 bg-neutral-50 hover:bg-neutral-100'
                    }`}
                  >
                    All Categories
                  </button>
                  {categories.map((c) => {
                    const isSelected = selectedSubCat === c.slug;
                    return (
                      <button
                        key={c.id}
                        onClick={() => {
                          setSelectedSubCat(c.slug);
                          setSelectedGroup('All');
                          setIsFromHome(false);
                          router.push(`/shop?cat=${c.slug}`);
                        }}
                        className={`text-xs px-3 py-1.5 border rounded-full transition cursor-pointer capitalize ${
                          isSelected ? 'bg-black text-white' : 'border-neutral-300 text-neutral-600 bg-neutral-50 hover:bg-neutral-100'
                        }`}
                      >
                        {c.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Explore Collections (Mobile) */}
              <div>
                <button
                  onClick={() => {
                    setSpecialTag('All');
                    setSelectedSubCat('All');
                    setIsFromHome(false);
                  }}
                  className="font-bold text-xs mb-2 text-neutral-900 tracking-wider hover:underline text-left cursor-pointer uppercase"
                >
                  EXPLORE COLLECTIONS
                </button>
                <div className="flex flex-wrap gap-2">
                  {dynamicCollections.map((colName) => {
                    const isSelected = specialTag === colName;
                    return (
                      <button
                        key={colName}
                        onClick={() => {
                          setSpecialTag(isSelected ? 'All' : colName);
                          setSelectedSubCat('All');
                          setIsFromHome(false);
                        }}
                        className={`text-xs px-3 py-1.5 border rounded-full transition flex items-center gap-1.5 cursor-pointer ${
                          isSelected
                            ? 'bg-black border-black text-white font-bold'
                            : 'border-neutral-300 text-neutral-600 bg-neutral-50 hover:bg-neutral-100'
                        }`}
                      >
                        <span>{colName}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sizes */}
              <div>
                <p className="font-bold text-xs mb-2">SIZE</p>
                <div className="flex gap-2">
                  {['S', 'M', 'L', 'XL'].map((size) => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(selectedSize === size ? null : size)}
                      className={`w-8 h-8 border rounded-md text-xs font-semibold ${
                        selectedSize === size ? 'bg-black text-white' : 'border-neutral-300'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Colors */}
              <div>
                <p className="font-bold text-xs mb-2">COLOR</p>
                <div className="flex gap-2">
                  {Object.keys(colorClasses).map((col) => (
                    <button
                      key={col}
                      onClick={() => setSelectedColor(selectedColor === col ? null : col)}
                      className={`w-6 h-6 rounded-full ${colorClasses[col]} ring-2 ring-offset-1 ${
                        selectedColor === col ? 'ring-black' : 'ring-transparent'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleClearFilters}
                  className="flex-1 border border-neutral-300 py-2 text-xs font-semibold rounded-md hover:bg-neutral-50"
                >
                  Reset
                </button>
                <button
                  onClick={() => setMobileFiltersOpen(false)}
                  className="flex-1 bg-black text-white py-2 text-xs font-semibold rounded-md hover:bg-neutral-800"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          )}

          {/* Sort bar (desktop) */}
          <div className="hidden lg:flex items-center justify-between mb-6">
            <p className="text-sm text-neutral-500 font-medium">
              Showing <span className="font-bold text-black">{visibleProducts.length}</span> of{' '}
              <span className="font-bold text-black">{filteredProducts.length}</span> product
              {filteredProducts.length !== 1 ? 's' : ''}
            </p>
            <div className="flex items-center gap-3">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setDesktopSortOpen(!desktopSortOpen)}
                  className="border border-neutral-300 rounded-md px-3 py-2 text-sm bg-white text-neutral-800 focus:border-black outline-none transition flex items-center justify-between gap-2 min-w-[170px] text-left cursor-pointer hover:bg-neutral-50"
                >
                  <span>{sortBy}</span>
                  <ChevronDown className="w-4 h-4 text-neutral-500 transition-transform duration-200" style={{ transform: desktopSortOpen ? 'rotate(180deg)' : 'none' }} />
                </button>

                {desktopSortOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-20 cursor-default"
                      onClick={() => setDesktopSortOpen(false)}
                    />
                    <div className="absolute right-0 mt-1 w-full min-w-[170px] bg-white border border-neutral-200 rounded-md shadow-lg py-1 z-30 animate-fade-in-down">
                      {sortOptions.map((opt) => {
                        const isSelected = sortBy === opt;
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => {
                              setSortBy(opt);
                              setDesktopSortOpen(false);
                            }}
                            className={`w-full text-left px-4 py-2.5 text-xs font-semibold transition cursor-pointer ${
                              isSelected
                                ? 'bg-black text-white'
                                : 'text-neutral-700 hover:bg-neutral-100 hover:text-black'
                            }`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Products Grid */}
          {filteredProducts.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-md border border-neutral-200">
              <p className="text-neutral-500 font-medium">No products match your active filters.</p>
              <button
                onClick={handleClearFilters}
                className="mt-4 inline-block bg-black text-white text-xs font-semibold px-6 py-2.5 rounded-md hover:bg-neutral-800 transition"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5">
              {visibleProducts.map((p) => (
                <div key={p.id} className="prod-card group flex flex-col animate-fade-up">
                  <div className="relative overflow-hidden rounded-md bg-neutral-200 aspect-[3/4]">
                    {p.isBestseller && (
                      <span className="absolute top-2 left-2 bg-black text-white text-[9px] font-semibold px-2 py-0.5 rounded tracking-wide z-10">
                        BESTSELLER
                      </span>
                    )}
                    <Link href={`/product?id=${p.id}`} className="absolute inset-0 block cursor-pointer z-0">
                      <Image
                        src={p.img}
                        alt={p.name}
                        fill
                        sizes="(max-width: 768px) 50vw, 33vw"
                        className="object-cover transition duration-500 group-hover:scale-105"
                      />
                    </Link>
                    <button
                      onClick={() => toggleWishlist(p.id)}
                      className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/95 flex items-center justify-center text-sm shadow hover:bg-neutral-100 active:scale-90 transition z-10"
                    >
                      <Heart
                        className={`w-4 h-4 ${
                          wishlist.includes(p.id) ? 'fill-red-500 text-red-500' : 'text-neutral-600'
                        }`}
                      />
                    </button>
                    <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition duration-300 z-10">
                      <button
                        onClick={() => handleQuickAdd(p)}
                        className="w-full bg-black/90 text-white text-[10px] font-semibold py-2 rounded hover:bg-black transition text-center"
                      >
                        QUICK ADD +
                      </button>
                    </div>
                  </div>
                  <Link href={`/product?id=${p.id}`} className="mt-2 text-sm font-semibold text-neutral-900 hover:underline">
                    {p.name}
                  </Link>
                  <div className="flex items-center gap-2 mt-1">
                    {(p as any).campaignDiscountApplied ? (
                      <>
                        <span className="text-sm font-extrabold text-red-600">${p.price.toFixed(2)}</span>
                        <span className="text-xs text-neutral-400 line-through font-medium">
                          ${((p as any).manualPrice || (p as any).retailPrice).toFixed(2)}
                        </span>
                        <span className="text-[10px] font-bold text-amber-500">
                          ({Math.round((1 - p.price / ((p as any).manualPrice || (p as any).retailPrice)) * 100)}% OFF)
                        </span>
                      </>
                    ) : (p as any).discountPrice && (p as any).discountPrice < (p as any).retailPrice ? (
                      <>
                        <span className="text-sm font-extrabold text-red-600">${(p as any).discountPrice.toFixed(2)}</span>
                        <span className="text-xs text-neutral-400 line-through font-medium">${((p as any).retailPrice).toFixed(2)}</span>
                      </>
                    ) : (
                      <span className="text-sm text-neutral-800 font-semibold">${p.price.toFixed(2)}</span>
                    )}
                  </div>
                  <div className="flex gap-1 mt-1">
                    {p.colors.map((c: any, i: any) => (
                      <span key={i} className={`w-3 h-3 rounded-full ${colorClasses[c]} inline-block`}></span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* LOAD MORE button */}
          {visibleCount < filteredProducts.length && (
            <div className="flex justify-center mt-12">
              <button
                onClick={loadMore}
                className="border border-black text-black text-sm font-semibold px-8 py-3 rounded-md hover:bg-black hover:text-white transition active:scale-95"
              >
                LOAD MORE
              </button>
            </div>
          )}
        </div>
      </div>

      {/* QUICK ADD MODAL */}
      {quickAddProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-2xl relative border border-neutral-100">
            <button
              onClick={() => setQuickAddProduct(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-500 hover:text-black hover:bg-neutral-200 transition"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
            
            <div className="flex gap-4 mb-5">
              <div className="relative w-16 h-20 rounded-md overflow-hidden bg-neutral-100 shrink-0 border border-neutral-200">
                <Image
                  src={quickAddProduct.img}
                  alt={quickAddProduct.name}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="flex flex-col justify-center">
                <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">{quickAddProduct.cat}</span>
                <h4 className="font-display font-extrabold text-sm text-neutral-900 leading-snug mt-0.5">{quickAddProduct.name}</h4>
                <p className="text-sm font-bold text-neutral-800 mt-1">${quickAddProduct.price.toFixed(2)}</p>
              </div>
            </div>
            
            {/* Size Selector */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold tracking-wider text-neutral-400 uppercase">Select Size</span>
                <span className="text-xs font-bold text-black">{quickSize}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {quickAddProduct.sizes.map((size) => (
                  <button
                    key={size}
                    onClick={() => setQuickSize(size)}
                    className={`w-9 h-9 border rounded-md text-xs font-semibold transition ${
                      quickSize === size
                        ? 'border-black bg-black text-white'
                        : 'border-neutral-200 hover:border-black bg-white text-neutral-800'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Color Selector */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold tracking-wider text-neutral-400 uppercase">Select Color</span>
                <span className="text-xs font-bold text-black">{quickColor}</span>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {quickAddProduct.colors.map((col) => (
                  <button
                    key={col}
                    onClick={() => setQuickColor(col)}
                    className={`w-8 h-8 rounded-full ${colorClasses[col] || 'bg-stone-300'} ring-2 ring-offset-2 transition ${
                      quickColor === col ? 'ring-black scale-105 shadow-sm' : 'ring-transparent hover:ring-neutral-300'
                    }`}
                    title={col}
                  />
                ))}
              </div>
            </div>
            
            <button
              onClick={() => {
                const stock = Number(quickVariant?.availableStock ?? quickVariant?.stock ?? quickVariant?.stockOnHand ?? 0);
                if (!quickVariant || stock < 1) return;
                addToCart({
                  id: quickAddProduct.id,
                  name: quickAddProduct.name,
                  price: quickAddProduct.price,
                  size: quickSize,
                  color: quickColor,
                  img: quickAddProduct.img,
                  variantId: quickVariant.id,
                });
                setQuickAddProduct(null);
                alert(`Added ${quickAddProduct.name} (${quickSize}, ${quickColor}) to your Cart!`);
              }}
              disabled={!quickVariant || Number(quickVariant.availableStock ?? quickVariant.stock ?? quickVariant.stockOnHand ?? 0) < 1}
              className="w-full bg-black disabled:bg-neutral-300 disabled:cursor-not-allowed text-white text-xs font-bold py-3.5 rounded-lg hover:bg-neutral-800 transition tracking-wider uppercase active:scale-[0.98] cursor-pointer"
            >
              {quickVariant && Number(quickVariant.availableStock ?? quickVariant.stock ?? quickVariant.stockOnHand ?? 0) > 0 ? `Add To Cart (${quickVariant.availableStock ?? quickVariant.stock ?? quickVariant.stockOnHand} available)` : 'Out of Stock'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Shop() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-neutral-500">Loading catalog...</div>}>
      <ShopContent />
    </Suspense>
  );
}
