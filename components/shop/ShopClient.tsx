'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';
import { useProducts } from '../../context/ProductsContext';
import { Product as CatalogProduct } from '../../lib/products';
import { Heart, SlidersHorizontal, Star, X, ChevronDown } from 'lucide-react';
import { ShopCategory } from '../../lib/category';
import { AudienceGroup } from '../../lib/audience-group';
import { ColorDocument } from '../../types/commerce';
import { formatPkr } from '../../lib/utils';
import {
  getEffectiveProductPrice,
  getProductPriceBounds,
  getDynamicPriceStep,
  productMatchesColor,
  productMatchesSize,
} from '../../lib/shop-filters';
import ColorSwatch from '../../components/ui/ColorSwatch';
import ShopBanner from '../../components/shop/ShopBanner';
import { ShopBannerSettings, DEFAULT_SHOP_BANNER_SETTINGS } from '../../lib/shop-page-settings';
import PriceRangeFilter from '../../components/shop/PriceRangeFilter';
import PromoCampaignClient from '../../components/home/PromoCampaignClient';
import ShopSkeleton from '../../components/shop/ShopSkeleton';

function ShopContent() {
  const { toggleWishlist, wishlist, addToCart } = useCart();
  const { showToast } = useToast();
  const { products, loading: productsLoading } = useProducts();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Filters State
  const [selectedGroup, setSelectedGroup] = useState<string>('All');
  const [selectedSubCat, setSelectedSubCat] = useState<string>('All');
  const [specialTag, setSpecialTag] = useState<string>('All');
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColorId, setSelectedColorId] = useState<string | null>(null);
  const [selectedMinPrice, setSelectedMinPrice] = useState<number | null>(null);
  const [selectedMaxPrice, setSelectedMaxPrice] = useState<number | null>(null);
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
  const [audienceGroups, setAudienceGroups] = useState<AudienceGroup[]>([]);

  // Dynamic colors & banner states
  const [availableColors, setAvailableColors] = useState<ColorDocument[]>([]);
  const [bannerSettings, setBannerSettings] = useState<ShopBannerSettings>(DEFAULT_SHOP_BANNER_SETTINGS);

  // Dynamic campaign states
  const [campaignProducts, setCampaignProducts] = useState<any[] | null>(null);
  const [campaignDetails, setCampaignDetails] = useState<any | null>(null);
  const [campaignLoading, setCampaignLoading] = useState(false);
  const [activeSaleCampaign, setActiveSaleCampaign] = useState<any | null>(null);

  useEffect(() => {
    fetch('/api/promo-campaigns/active')
      .then((res) => res.json())
      .then((payload) => {
        const list = Array.isArray(payload) ? payload : Array.isArray(payload.data) ? payload.data : [];
        if (list.length > 0) {
          setActiveSaleCampaign(list[0]);
        } else {
          setActiveSaleCampaign({
            id: 'mid-season-sale',
            badgeText: 'LIMITED TIME ONLY',
            heading: 'Mid Season Sale',
            description: 'this is summer sale',
            highlightText: 'FLAT 30% SALE',
            ctaText: 'SHOP THE SALE',
            endsAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
            backgroundImageUrl: '/colossal-rigout-logo.png',
          });
        }
      })
      .catch(() => {
        setActiveSaleCampaign({
          id: 'mid-season-sale',
          badgeText: 'LIMITED TIME ONLY',
          heading: 'Mid Season Sale',
          description: 'this is summer sale',
          highlightText: 'FLAT 30% SALE',
          ctaText: 'SHOP THE SALE',
          endsAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
          backgroundImageUrl: '/colossal-rigout-logo.png',
        });
      });
  }, []);

  useEffect(() => {
    fetch('/api/categories')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data)) {
          setCategories(data.data);
        }
      })
      .catch((err) => console.error('Error loading categories in Shop:', err))
      .finally(() => setCategoriesLoading(false));

    fetch('/api/audience-groups')
      .then((res) => res.json())
      .then((payload) => {
        if (payload.success && Array.isArray(payload.data)) setAudienceGroups(payload.data);
      })
      .catch(() => setAudienceGroups([]));

    fetch('/api/colors')
      .then((res) => res.json())
      .then((payload) => {
        if (payload.source === 'fallback') {
          setAvailableColors([]);
          return;
        }
        const colorsList = Array.isArray(payload.colors) ? payload.colors : [];
        setAvailableColors(
          colorsList
            .filter((c: ColorDocument) => c.active !== false)
            .sort((a: ColorDocument, b: ColorDocument) => (a.order || 0) - (b.order || 0))
        );
      })
      .catch(() => setAvailableColors([]));

    fetch('/api/shop-page-settings')
      .then((res) => res.json())
      .then((payload) => {
        if (payload.success && payload.data?.banner) {
          setBannerSettings(payload.data.banner);
        }
      })
      .catch(() => setBannerSettings(DEFAULT_SHOP_BANNER_SETTINGS));
  }, []);

  const sortOptions = [
    'Sort: Featured',
    'Price: Low to High',
    'Price: High to Low',
    'Newest',
  ];

  const colorById = useMemo(() => {
    const map = new Map<string, ColorDocument>();
    availableColors.forEach((col) => map.set(col.id, col));
    return map;
  }, [availableColors]);

  const colorByName = useMemo(() => {
    const map = new Map<string, ColorDocument>();
    availableColors.forEach((col) => map.set(col.name.toLowerCase(), col));
    return map;
  }, [availableColors]);

  useEffect(() => {
    const catQuery = searchParams.get('cat');
    const wishlistQuery = searchParams.get('wishlist');
    const fromHomeQuery = searchParams.get('fromHome') === 'true';
    const qQuery = searchParams.get('q');
    const collectionQuery = searchParams.get('collection');
    const campaignId = searchParams.get('campaign');
    const promotionId = searchParams.get('promotion');
    const groupQuery = searchParams.get('group');

    if (campaignId || promotionId) {
      setCampaignLoading(true);
      fetch(promotionId ? `/api/promotions/${promotionId}/products` : `/api/promo-campaigns/${campaignId}/products`)
        .then((res) => res.json())
        .then((json) => {
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

      if (groupQuery) {
        setSelectedGroup(groupQuery.toLowerCase());
        setSelectedSubCat('All');
        setSpecialTag('All');
      } else if (catQuery) {
        const queryLower = catQuery.toLowerCase();
        if (['men', 'boys', 'kids'].includes(queryLower)) {
          setSelectedGroup(queryLower);
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

  const quickChips = [{ slug: 'All', name: 'All' }, ...audienceGroups.map((group) => ({ slug: group.slug, name: group.name }))];
  const selectedGroupName = selectedGroup === 'All' ? 'All' : audienceGroups.find((group) => group.slug === selectedGroup)?.name || selectedGroup;

  const [quickAddProduct, setQuickAddProduct] = useState<CatalogProduct | null>(null);
  const [quickSize, setQuickSize] = useState<string>('M');
  const [quickColorId, setQuickColorId] = useState<string>('');
  const [quickQty, setQuickQty] = useState<number>(1);
  const [inventoryVariants, setInventoryVariants] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/commerce/inventory')
      .then((res) => res.json())
      .then((payload) => {
        if (payload.success) setInventoryVariants(payload.data);
      })
      .catch(() => setInventoryVariants([]));
  }, []);

  const outOfStockProductIds = useMemo(() => {
    if (!inventoryVariants || inventoryVariants.length === 0) return new Set<string>();
    const stockMap = new Map<string, number>();
    inventoryVariants.forEach((variant) => {
      const pId = String(variant.productId);
      const stock = Number(variant.availableStock ?? variant.stockOnHand ?? variant.stock ?? 0);
      stockMap.set(pId, (stockMap.get(pId) || 0) + stock);
    });

    const outSet = new Set<string>();
    stockMap.forEach((totalStock, pId) => {
      if (totalStock <= 0) outSet.add(pId);
    });
    return outSet;
  }, [inventoryVariants]);

  const DEFAULT_EXPLORE_COLLECTIONS = useMemo(
    () => ['The Everyday Edit', 'Power Look', 'Weekend Vibes', 'Date Night'],
    []
  );

  const dynamicCollections = useMemo(() => {
    const productCols = (products || []).flatMap((p) => p.collections || []);
    const merged = Array.from(new Set([...DEFAULT_EXPLORE_COLLECTIONS, ...productCols])).filter(Boolean);
    return merged;
  }, [products, DEFAULT_EXPLORE_COLLECTIONS]);

  const productsSource = campaignProducts !== null ? campaignProducts : products;

  const filterColors = useMemo(() => {
    if (availableColors.length === 0) return [];

    const usedIds = new Set<string>();

    productsSource.forEach((prod) => {
      if (Array.isArray(prod.colorIds)) {
        prod.colorIds.forEach((id: string) => usedIds.add(String(id)));
      }
      if (Array.isArray(prod.colors)) {
        prod.colors.forEach((cName: string) => {
          const match = colorByName.get(String(cName).trim().toLowerCase());
          if (match) usedIds.add(match.id);
        });
      }
    });

    const activeList = availableColors.filter((col) => usedIds.has(col.id));

    const seen = new Set<string>();
    const deduplicated: ColorDocument[] = [];

    activeList.forEach((col) => {
      const key = `${col.name.trim().toLowerCase()}_${(col.hex || (col as any).colorCode || '').trim().toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        deduplicated.push(col);
      }
    });

    return deduplicated;
  }, [availableColors, productsSource, colorByName]);

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    productsSource.forEach((p) => {
      if (selectedGroup !== 'All') {
        const productGroup = String(p.audienceSlug || p.audienceId || '').toLowerCase();
        const legacyGroup = String(p.cat || '').toLowerCase() === 'kids' ? 'kids' : 'men';
        if ((productGroup || legacyGroup) !== selectedGroup.toLowerCase()) return;
      }

      const catSlug = (p.cat || p.categorySlug || '').toLowerCase().trim();
      if (catSlug) {
        counts.set(catSlug, (counts.get(catSlug) || 0) + 1);
        if (catSlug === 'shirts' || catSlug === 't-shirts') {
          counts.set('tops', (counts.get('tops') || 0) + 1);
        }
      }
    });
    return counts;
  }, [productsSource, selectedGroup]);

  const availableSizes = useMemo(() => {
    const sizeSet = new Set<string>();
    productsSource.forEach((p) => {
      if (Array.isArray(p.sizes)) {
        p.sizes.forEach((s: any) => {
          const strVal = typeof s === 'string' ? s : s?.name || s?.id || '';
          if (strVal) sizeSet.add(String(strVal).trim().toUpperCase());
        });
      }
    });
    const defaultOrder = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', 'FREE SIZE'];
    const list = Array.from(sizeSet).sort((a, b) => {
      const idxA = defaultOrder.indexOf(a);
      const idxB = defaultOrder.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });
    return list.length > 0 ? list : ['S', 'M', 'L', 'XL'];
  }, [productsSource]);

  const hasAnyExplicitBestSellers = useMemo(() => {
    return productsSource.some(
      (p) =>
        Boolean(p.isBestseller) ||
        Boolean((p as any).bestsellerOverride) ||
        Boolean(p.featured) ||
        (Array.isArray(p.collections) &&
          p.collections.some((c: string) =>
            ['best seller', 'best sellers', 'bestseller', 'bestsellers'].includes(String(c).toLowerCase().trim())
          ))
    );
  }, [productsSource]);

  const hasAnyExplicitNewArrivals = useMemo(() => {
    return productsSource.some(
      (p) =>
        Boolean((p as any).isNew) ||
        Boolean((p as any).isNewArrival) ||
        (Array.isArray(p.collections) &&
          p.collections.some((c: string) =>
            ['new arrivals', 'new arrival', 'new-arrivals', 'new'].includes(String(c).toLowerCase().trim())
          ))
    );
  }, [productsSource]);

  const storePriceBounds = useMemo(() => {
    return getProductPriceBounds(productsSource);
  }, [productsSource]);

  const priceStep = useMemo(() => {
    return getDynamicPriceStep(storePriceBounds.min, storePriceBounds.max);
  }, [storePriceBounds.min, storePriceBounds.max]);

  const productsBeforePriceFilter = useMemo(() => {
    return productsSource.filter((product) => {
      if (searchQuery) {
        const queryLower = searchQuery.toLowerCase().trim();
        const matchesName = product.name.toLowerCase().includes(queryLower);
        const matchesDesc = (product.description || '').toLowerCase().includes(queryLower);
        const matchesCat = (product.cat || '').toLowerCase().includes(queryLower);
        const matchesCollections =
          product.collections?.some((col: any) => col.toLowerCase().includes(queryLower)) || false;
        if (!matchesName && !matchesDesc && !matchesCat && !matchesCollections) {
          return false;
        }
      }

      if (selectedGroup !== 'All') {
        const productGroup = String(product.audienceSlug || product.audienceId || '').toLowerCase();
        const legacyGroup = String(product.cat || '').toLowerCase() === 'kids' ? 'kids' : 'men';
        if ((productGroup || legacyGroup) !== selectedGroup.toLowerCase()) return false;
      }

      if (selectedSubCat !== 'All') {
        const prodCatLower = (product.cat || '').toLowerCase();
        const subCatLower = selectedSubCat.toLowerCase();
        if (subCatLower === 'tops') {
          if (prodCatLower !== 'tops' && prodCatLower !== 'shirts' && prodCatLower !== 't-shirts') return false;
        } else {
          if (prodCatLower !== subCatLower && (product.categorySlug || '').toLowerCase() !== subCatLower) return false;
        }
      }

      if (specialTag === 'New Arrivals') {
        const isExplicitNew =
          Boolean((product as any).isNew) ||
          Boolean((product as any).isNewArrival) ||
          (Array.isArray(product.collections) &&
            product.collections.some((c: string) =>
              ['new arrivals', 'new arrival', 'new-arrivals', 'new'].includes(String(c).toLowerCase().trim())
            ));
        if (hasAnyExplicitNewArrivals) {
          if (!isExplicitNew) return false;
        }
      } else if (specialTag === 'Sale') {
        const retailPrice = Number(product.retailPrice ?? product.price ?? 0);
        const discountPrice = Number(product.discountPrice ?? 0);
        const hasDiscount =
          (discountPrice > 0 && discountPrice < retailPrice) ||
          Boolean(product.campaignDiscountApplied) ||
          Boolean((product as any).onSale) ||
          Boolean((product as any).isSale) ||
          (Array.isArray(product.collections) &&
            product.collections.some((c: string) =>
              ['sale', 'sales', 'on sale', 'discount'].includes(String(c).toLowerCase().trim())
            ));
        if (!hasDiscount) return false;
      } else if (specialTag === 'Best Seller' || specialTag === 'Best Sellers') {
        const isBest =
          Boolean(product.isBestseller) ||
          Boolean((product as any).bestsellerOverride) ||
          Boolean(product.featured) ||
          (product.rating && Number(product.rating) >= 4.5) ||
          (product.sold && Number(String(product.sold).replace(/\D/g, '')) > 0) ||
          (Array.isArray(product.collections) &&
            product.collections.some((c: string) =>
              ['best seller', 'best sellers', 'bestseller', 'bestsellers'].includes(String(c).toLowerCase().trim())
            ));
        if (hasAnyExplicitBestSellers) {
          if (!isBest) return false;
        }
      } else if (specialTag !== 'All') {
        const normTag = specialTag.trim().toLowerCase();

        const matchesExplicitCollection =
          Array.isArray(product.collections) &&
          product.collections.some(
            (c: string) => String(c).trim().toLowerCase().includes(normTag) || normTag.includes(String(c).trim().toLowerCase())
          );
        const matchesCollectionId =
          Array.isArray(product.collectionIds) &&
          product.collectionIds.some((c: string) => String(c).trim().toLowerCase().includes(normTag));
        const matchesNameOrDesc =
          (product.name || '').toLowerCase().includes(normTag) ||
          (product.description || '').toLowerCase().includes(normTag);

        if (matchesExplicitCollection || matchesCollectionId || matchesNameOrDesc) {
          // Matched
        } else {
          const prodCat = (product.cat || product.categorySlug || '').toLowerCase();
          if (normTag.includes('date night')) {
            const isDateNightStyle =
              ['dresses', 'shirts', 'tops', 'trousers', 'bottoms'].includes(prodCat) ||
              Number(product.retailPrice || product.price || 0) >= 1500;
            if (!isDateNightStyle) return false;
          } else if (normTag.includes('power look')) {
            const isPowerLookStyle = ['shirts', 'trousers', 'bottoms', 'tops'].includes(prodCat);
            if (!isPowerLookStyle) return false;
          } else if (normTag.includes('weekend vibes')) {
            const isWeekendStyle = ['t-shirts', 'tops', 'shoes', 'accessories'].includes(prodCat);
            if (!isWeekendStyle) return false;
          } else if (normTag.includes('everyday edit')) {
            const isEverydayStyle = true;
            if (!isEverydayStyle) return false;
          } else {
            return false;
          }
        }
      }

      if (
        selectedCollection &&
        !(product.collectionIds || product.collections || []).some(
          (c: string) => String(c).toLowerCase() === selectedCollection.toLowerCase()
        )
      ) {
        return false;
      }

      if (selectedSize && !productMatchesSize(product, selectedSize)) {
        return false;
      }

      if (selectedColorId && !productMatchesColor(product, selectedColorId, availableColors)) {
        return false;
      }

      return true;
    });
  }, [
    productsSource,
    searchQuery,
    selectedGroup,
    selectedSubCat,
    specialTag,
    selectedCollection,
    selectedSize,
    selectedColorId,
    availableColors,
    hasAnyExplicitBestSellers,
    hasAnyExplicitNewArrivals,
  ]);

  const filteredProducts = useMemo(() => {
    return productsBeforePriceFilter
      .filter((product) => {
        const effPrice = getEffectiveProductPrice(product);
        if (effPrice <= 0) return false;
        if (selectedMinPrice !== null && effPrice < selectedMinPrice) return false;
        if (selectedMaxPrice !== null && effPrice > selectedMaxPrice) return false;
        return true;
      })
      .sort((a, b) => {
        const priceA = getEffectiveProductPrice(a);
        const priceB = getEffectiveProductPrice(b);
        if (sortBy === 'Price: Low to High') return priceA - priceB;
        if (sortBy === 'Price: High to Low') return priceB - priceA;
        if (sortBy === 'Newest') return Number(b.id || 0) - Number(a.id || 0);
        return 0;
      });
  }, [productsBeforePriceFilter, selectedMinPrice, selectedMaxPrice, sortBy]);

  const activeFilters = useMemo(() => {
    const list: Array<{ id: string; label: string; clear: () => void }> = [];

    if (searchQuery) {
      list.push({ id: 'search', label: `Search: "${searchQuery}"`, clear: () => setSearchQuery('') });
    }
    if (selectedGroup !== 'All') {
      list.push({ id: 'group', label: `Section: ${selectedGroupName}`, clear: () => setSelectedGroup('All') });
    }
    if (selectedSubCat !== 'All') {
      const catName = categories.find((c) => c.slug === selectedSubCat)?.name || selectedSubCat;
      list.push({ id: 'subcat', label: `Category: ${catName}`, clear: () => setSelectedSubCat('All') });
    }
    if (specialTag !== 'All') {
      list.push({ id: 'special', label: `Tag: ${specialTag}`, clear: () => setSpecialTag('All') });
    }
    if (selectedCollection) {
      list.push({ id: 'collection', label: `Collection: ${selectedCollection}`, clear: () => setSelectedCollection('') });
    }
    if (selectedSize) {
      list.push({ id: 'size', label: `Size: ${selectedSize}`, clear: () => setSelectedSize(null) });
    }
    if (selectedColorId) {
      const colDoc = colorById.get(selectedColorId) || availableColors.find((c) => c.id === selectedColorId);
      list.push({ id: 'color', label: `Color: ${colDoc?.name || selectedColorId}`, clear: () => setSelectedColorId(null) });
    }
    if (selectedMinPrice !== null || selectedMaxPrice !== null) {
      const minText = selectedMinPrice !== null ? formatPkr(selectedMinPrice) : formatPkr(storePriceBounds.min);
      const maxText = selectedMaxPrice !== null ? formatPkr(selectedMaxPrice) : formatPkr(storePriceBounds.max);
      list.push({
        id: 'price',
        label: `Price: ${minText} - ${maxText}`,
        clear: () => {
          setSelectedMinPrice(null);
          setSelectedMaxPrice(null);
        },
      });
    }

    return list;
  }, [
    searchQuery,
    selectedGroup,
    selectedGroupName,
    selectedSubCat,
    categories,
    specialTag,
    selectedCollection,
    selectedSize,
    selectedColorId,
    colorById,
    availableColors,
    selectedMinPrice,
    selectedMaxPrice,
    storePriceBounds.min,
    storePriceBounds.max,
  ]);

  const handleQuickAdd = (product: CatalogProduct) => {
    setQuickAddProduct(product);
    setQuickSize(product.sizes[0] || 'M');
    setQuickQty(1);

    let firstColId = product.colorIds?.[0] || '';
    if (!firstColId && product.colors?.[0]) {
      const match = colorByName.get(product.colors[0].toLowerCase());
      if (match) firstColId = match.id;
    }
    setQuickColorId(firstColId);
  };

  const quickSelectedColorDoc = colorById.get(quickColorId) || availableColors.find((c) => c.id === quickColorId);

  const quickVariant = quickAddProduct
    ? inventoryVariants.find((variant) => {
        const sizeIndex = quickAddProduct.sizes.indexOf(quickSize);
        const targetSizeId = quickAddProduct.sizeIds?.[sizeIndex] || quickSize;
        return (
          String(variant.productId) === String(quickAddProduct.id) &&
          (variant.colorId === quickColorId || (quickSelectedColorDoc && variant.colorName === quickSelectedColorDoc.name)) &&
          (variant.sizeId === targetSizeId || variant.sizeName === quickSize)
        );
      })
    : null;

  const handleClearFilters = () => {
    setSelectedGroup('All');
    setSelectedSubCat('All');
    setSpecialTag('All');
    setSelectedSize(null);
    setSelectedColorId(null);
    setSelectedMinPrice(null);
    setSelectedMaxPrice(null);
    setSortBy('Featured');
    setIsFromHome(false);
    setSearchQuery('');
    setSelectedCollection('');
    setCampaignProducts(null);
    setCampaignDetails(null);
  };

  const loadMore = () => {
    setVisibleCount((prev) => Math.min(prev + 6, filteredProducts.length));
  };

  const visibleProducts = filteredProducts.slice(0, visibleCount);

  if (productsLoading || categoriesLoading || campaignLoading) {
    return <ShopSkeleton />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 pb-16">
      {activeSaleCampaign && (
        <div className="my-4 rounded-2xl overflow-hidden shadow-md">
          <PromoCampaignClient campaign={activeSaleCampaign} serverNow={new Date().toISOString()} compact />
        </div>
      )}

      <div className="py-4 text-xs sm:text-sm text-neutral-500">
        <Link href="/" className="hover:text-black">
          Home
        </Link>{' '}
        <span className="mx-1">/</span>{' '}
        <span className="text-neutral-900 font-medium">Shop</span>
        {selectedGroup !== 'All' && (
          <>
            <span className="mx-1">/</span>{' '}
            <span className="text-neutral-900 font-medium">{selectedGroupName}</span>
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

      <div className="pb-6">
        {searchQuery && (
          <div className="mb-4 flex items-center justify-between bg-[#f4f4f3] border border-neutral-300 px-4 py-2.5 rounded-md text-xs sm:text-sm">
            <span className="font-medium text-neutral-800">
              Showing results for search: <span className="font-bold text-black">&quot;{searchQuery}&quot;</span>
            </span>
            <button
              onClick={() => {
                setSearchQuery('');
              }}
              className="text-neutral-600 hover:text-black font-semibold flex items-center gap-1 cursor-pointer text-xs"
            >
              <X className="w-3.5 h-3.5" /> CLEAR SEARCH
            </button>
          </div>
        )}
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <div className="flex gap-1.5 items-center bg-neutral-200/55 p-1 rounded-full self-start">
            {quickChips.map((chip) => {
              const isSelected = selectedGroup === chip.slug;
              return (
                <button
                  key={chip.slug}
                  onClick={() => {
                    setSelectedGroup(chip.slug);
                    setIsFromHome(false);
                    setVisibleCount(6);
                  }}
                  className={`rounded-full px-4 py-1.5 text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                    isSelected ? 'bg-black text-white shadow-sm' : 'text-neutral-600 hover:text-black'
                  }`}
                >
                  {chip.name}
                </button>
              );
            })}
          </div>

          <span className="text-neutral-300 hidden sm:inline">|</span>

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
                    isSelected ? col.active : `border-neutral-300 text-neutral-600 bg-white ${col.bg}`
                  }`}
                >
                  {col.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {activeFilters.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-2 bg-[#f9f8f6] p-3 sm:p-4 rounded-xl border border-neutral-200 shadow-xs animate-fade-in">
          <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 mr-1 flex items-center gap-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5 text-neutral-700" />
            Active Filters ({activeFilters.length}):
          </span>
          {activeFilters.map((filter) => (
            <span
              key={filter.id}
              className="inline-flex items-center gap-1.5 bg-white border border-neutral-300 text-neutral-900 px-3 py-1 rounded-full text-xs font-semibold shadow-2xs transition hover:border-black"
            >
              {filter.label}
              <button
                onClick={filter.clear}
                className="hover:text-red-600 transition p-0.5 rounded-full hover:bg-neutral-100 cursor-pointer"
                title="Remove filter"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          <button
            onClick={handleClearFilters}
            className="text-xs font-bold text-neutral-700 hover:text-black underline ml-auto cursor-pointer transition"
          >
            Clear All
          </button>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-8">
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
                        setIsFromHome(false);
                        setVisibleCount(6);
                      }}
                      className={`flex items-center justify-between w-full hover:text-black transition uppercase tracking-wider text-[11px] font-bold cursor-pointer ${
                        selectedSubCat === 'All' ? 'text-black border-b-2 border-black pb-0.5' : 'text-neutral-500'
                      }`}
                    >
                      <span>All Categories</span>
                      <span className="text-[10px] font-semibold text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded-full">
                        {productsSource.length}
                      </span>
                    </button>
                  </li>
                  {categories.map((c) => {
                    const isSelected = selectedSubCat === c.slug;
                    const count = categoryCounts.get(c.slug.toLowerCase()) || 0;
                    return (
                      <li key={c.id}>
                        <button
                          onClick={() => {
                            setSelectedSubCat(isSelected ? 'All' : c.slug);
                            setIsFromHome(false);
                            setVisibleCount(6);
                          }}
                          className={`flex items-center justify-between w-full hover:text-black transition uppercase tracking-wider text-[11px] font-bold cursor-pointer ${
                            isSelected ? 'text-black font-extrabold border-b-2 border-black pb-0.5' : 'text-neutral-500'
                          }`}
                        >
                          <span>{c.name}</span>
                          <span className="text-[10px] font-semibold text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded-full">
                            {count}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>

                <div className="space-y-2.5 pt-3 border-t border-neutral-200">
                  <div className="flex items-center gap-2 pb-1.5 w-full text-left">
                    <span className="w-1.5 h-3.5 bg-black rounded-sm shrink-0"></span>
                    <span className="font-display font-extrabold text-[11px] sm:text-xs tracking-widest text-neutral-900 uppercase">
                      EXPLORE COLLECTIONS
                    </span>
                  </div>
                  <ul className="space-y-2 text-xs text-neutral-600 pl-2 font-medium">
                    {dynamicCollections.map((colName, idx) => {
                      const isSelected = specialTag === colName;
                      return (
                        <li key={idx}>
                          <button
                            onClick={() => {
                              setSpecialTag(isSelected ? 'All' : colName);
                              setIsFromHome(false);
                              setVisibleCount(6);
                            }}
                            className={`flex items-center gap-2 hover:text-black transition text-left w-full cursor-pointer ${
                              isSelected ? 'text-black font-extrabold' : 'text-neutral-600'
                            }`}
                          >
                            <span className={isSelected ? 'border-b-2 border-black pb-0.5 font-bold text-black' : ''}>
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

            <div>
              <p className="font-semibold text-xs tracking-widest uppercase text-neutral-400 mb-3">SIZE</p>
              <div className="flex flex-wrap gap-2">
                {availableSizes.map((size) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(selectedSize === size ? null : size)}
                    className={`min-w-9 h-9 px-2.5 border rounded-md text-xs font-semibold transition cursor-pointer ${
                      selectedSize === size
                        ? 'border-black bg-black text-white shadow-xs'
                        : 'border-neutral-300 hover:border-black bg-white text-neutral-800'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {filterColors.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="font-semibold text-xs tracking-widest uppercase text-neutral-400">COLOR</p>
                  <span className="text-[10px] text-neutral-400 font-semibold">{filterColors.length} colors</span>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  {filterColors.map((colorDoc) => (
                    <ColorSwatch
                      key={colorDoc.id}
                      color={colorDoc}
                      size="md"
                      selected={selectedColorId === colorDoc.id}
                      onClick={() => setSelectedColorId(selectedColorId === colorDoc.id ? null : colorDoc.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="font-semibold text-xs tracking-widest uppercase text-neutral-400 mb-3">PRICE RANGE</p>
              <PriceRangeFilter
                minBound={storePriceBounds.min}
                maxBound={storePriceBounds.max}
                selectedMinPrice={selectedMinPrice}
                selectedMaxPrice={selectedMaxPrice}
                onChange={(min, max) => {
                  setSelectedMinPrice(min);
                  setSelectedMaxPrice(max);
                }}
              />
            </div>

            <button
              onClick={handleClearFilters}
              className="w-full border border-black text-black text-xs font-semibold py-2.5 rounded-md hover:bg-black hover:text-white transition active:scale-95 cursor-pointer"
            >
              CLEAR ALL FILTERS
            </button>
          </div>
        </aside>

        <div className="flex-1">
          <div className="flex lg:hidden items-center justify-between mb-4">
            <button
              onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
              className="flex items-center gap-2 border border-neutral-300 rounded-md px-4 py-2 text-sm font-medium bg-white cursor-pointer"
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
                <ChevronDown
                  className="w-4 h-4 text-neutral-500 transition-transform duration-200"
                  style={{ transform: mobileSortOpen ? 'rotate(180deg)' : 'none' }}
                />
              </button>

              {mobileSortOpen && (
                <>
                  <div className="fixed inset-0 z-20 cursor-default" onClick={() => setMobileSortOpen(false)} />
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
                            isSelected ? 'bg-black text-white' : 'text-neutral-700 hover:bg-neutral-100 hover:text-black'
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

          {mobileFiltersOpen && (
            <div className="lg:hidden mb-6 border border-neutral-200 rounded-md p-4 bg-white space-y-5 animate-fade-up">
              <div>
                <p className="font-bold text-xs mb-2">SECTION</p>
                <div className="flex flex-wrap gap-2">
                  {quickChips.map((grp) => (
                    <button
                      key={grp.slug}
                      onClick={() => {
                        setSelectedGroup(grp.slug);
                        setIsFromHome(false);
                      }}
                      className={`text-xs px-3 py-1 border rounded-full transition cursor-pointer ${
                        selectedGroup === grp.slug ? 'bg-black text-white font-bold' : 'border-neutral-300 text-neutral-600 bg-neutral-50'
                      }`}
                    >
                      {grp.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="font-bold text-xs mb-2">CATEGORY</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      setSelectedSubCat('All');
                      setIsFromHome(false);
                    }}
                    className={`text-xs px-3 py-1.5 border rounded-full transition cursor-pointer ${
                      selectedSubCat === 'All' ? 'bg-black text-white font-bold' : 'border-neutral-300 text-neutral-600 bg-neutral-50 hover:bg-neutral-100'
                    }`}
                  >
                    All ({productsSource.length})
                  </button>
                  {categories.map((c) => {
                    const isSelected = selectedSubCat === c.slug;
                    const count = categoryCounts.get(c.slug.toLowerCase()) || 0;
                    return (
                      <button
                        key={c.id}
                        onClick={() => {
                          setSelectedSubCat(isSelected ? 'All' : c.slug);
                          setIsFromHome(false);
                        }}
                        className={`text-xs px-3 py-1.5 border rounded-full transition cursor-pointer capitalize ${
                          isSelected ? 'bg-black text-white font-bold' : 'border-neutral-300 text-neutral-600 bg-neutral-50 hover:bg-neutral-100'
                        }`}
                      >
                        {c.name} ({count})
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="font-bold text-xs mb-2">SIZE</p>
                <div className="flex flex-wrap gap-2">
                  {availableSizes.map((size) => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(selectedSize === size ? null : size)}
                      className={`min-w-8 h-8 px-2 border rounded-md text-xs font-semibold ${
                        selectedSize === size ? 'bg-black text-white border-black' : 'border-neutral-300 bg-white text-neutral-800'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {filterColors.length > 0 && (
                <div>
                  <p className="font-bold text-xs mb-2">COLOR</p>
                  <div className="flex flex-wrap gap-2">
                    {filterColors.map((colorDoc) => (
                      <ColorSwatch
                        key={colorDoc.id}
                        color={colorDoc}
                        size="md"
                        selected={selectedColorId === colorDoc.id}
                        onClick={() => setSelectedColorId(selectedColorId === colorDoc.id ? null : colorDoc.id)}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="font-bold text-xs mb-2 tracking-widest uppercase text-neutral-400">PRICE RANGE</p>
                <PriceRangeFilter
                  minBound={storePriceBounds.min}
                  maxBound={storePriceBounds.max}
                  selectedMinPrice={selectedMinPrice}
                  selectedMaxPrice={selectedMaxPrice}
                  onChange={(min, max) => {
                    setSelectedMinPrice(min);
                    setSelectedMaxPrice(max);
                  }}
                />
              </div>

              <div className="flex gap-2 pt-2">
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
                  <ChevronDown
                    className="w-4 h-4 text-neutral-500 transition-transform duration-200"
                    style={{ transform: desktopSortOpen ? 'rotate(180deg)' : 'none' }}
                  />
                </button>

                {desktopSortOpen && (
                  <>
                    <div className="fixed inset-0 z-20 cursor-default" onClick={() => setDesktopSortOpen(false)} />
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
                              isSelected ? 'bg-black text-white' : 'text-neutral-700 hover:bg-neutral-100 hover:text-black'
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

          {filteredProducts.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-md border border-neutral-200">
              <p className="text-neutral-500 font-medium">No products match your active filters.</p>
              <button
                onClick={handleClearFilters}
                className="mt-4 inline-block bg-black text-white text-xs font-semibold px-6 py-2.5 rounded-md hover:bg-neutral-800 transition cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5">
              {visibleProducts.map((p) => {
                const effPrice = getEffectiveProductPrice(p);
                const hasDiscount = (p as any).discountPrice && (p as any).discountPrice < (p as any).retailPrice;
                const isCampaign = Boolean((p as any).campaignDiscountApplied);
                const originalPrice = (p as any).manualPrice || (p as any).retailPrice || p.price;

                const productSwatches: ColorDocument[] = [];
                if (Array.isArray(p.colorIds) && p.colorIds.length > 0) {
                  p.colorIds.forEach((cId: string) => {
                    const colDoc = colorById.get(cId);
                    if (colDoc) productSwatches.push(colDoc);
                  });
                } else if (Array.isArray(p.colors) && p.colors.length > 0) {
                  p.colors.forEach((cName: string) => {
                    const colDoc = colorByName.get(String(cName).trim().toLowerCase());
                    if (colDoc) productSwatches.push(colDoc);
                  });
                }

                const strId = String(p.id);
                const isOutOfStock =
                  outOfStockProductIds.has(strId) ||
                  (p as any).inStock === false ||
                  (typeof (p as any).totalStock === 'number' && (p as any).totalStock <= 0) ||
                  (typeof (p as any).stock === 'number' && (p as any).stock <= 0) ||
                  (p as any).isOutOfStock === true;

                return (
                  <div key={p.id} className="prod-card group flex flex-col animate-fade-up">
                    <div className="relative overflow-hidden rounded-md bg-neutral-200 aspect-[3/4]">
                      {isOutOfStock ? (
                        <span className="absolute top-2 left-2 bg-red-600 text-white text-[9px] font-black px-2 py-0.5 rounded tracking-wider uppercase z-20 shadow-sm">
                          OUT OF STOCK
                        </span>
                      ) : p.isBestseller ? (
                        <span className="absolute top-2 left-2 bg-black text-white text-[9px] font-semibold px-2 py-0.5 rounded tracking-wide z-10">
                          BESTSELLER
                        </span>
                      ) : null}
                      <Link href={`/product?id=${p.id}`} className="absolute inset-0 block cursor-pointer z-0">
                        <Image
                          src={p.img}
                          alt={p.name}
                          fill
                          sizes="(max-width: 768px) 50vw, 33vw"
                          className={`object-cover transition duration-500 group-hover:scale-105 ${isOutOfStock ? 'opacity-70 grayscale-[20%]' : ''}`}
                        />
                      </Link>
                      <button
                        onClick={() => toggleWishlist(p.id)}
                        className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/95 flex items-center justify-center text-sm shadow hover:bg-neutral-100 active:scale-90 transition z-10 cursor-pointer"
                      >
                        <Heart
                          className={`w-4 h-4 ${
                            wishlist.includes(p.id) ? 'fill-red-500 text-red-500' : 'text-neutral-600'
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
                            onClick={() => handleQuickAdd(p)}
                            className="w-full bg-black/90 text-white text-[10px] font-semibold py-2 rounded hover:bg-black transition text-center cursor-pointer"
                          >
                            QUICK ADD +
                          </button>
                        </div>
                      )}
                    </div>

                    <Link href={`/product?id=${p.id}`} className="mt-2 text-sm font-semibold text-neutral-900 hover:underline truncate">
                      {p.name}
                    </Link>

                    <div className="flex items-center gap-2 mt-1">
                      {isCampaign ? (
                        <>
                          <span className="text-sm font-extrabold text-red-600">{formatPkr(effPrice)}</span>
                          <span className="text-xs text-neutral-400 line-through font-medium">
                            {formatPkr(originalPrice)}
                          </span>
                          <span className="text-[10px] font-bold text-amber-500">
                            ({Math.round((1 - effPrice / originalPrice) * 100)}% OFF)
                          </span>
                        </>
                      ) : hasDiscount ? (
                        <>
                          <span className="text-sm font-extrabold text-red-600">{formatPkr(effPrice)}</span>
                          <span className="text-xs text-neutral-400 line-through font-medium">
                            {formatPkr((p as any).retailPrice)}
                          </span>
                        </>
                      ) : (
                        <span className="text-sm text-neutral-800 font-semibold">{formatPkr(effPrice)}</span>
                      )}
                    </div>

                    {productSwatches.length > 0 && (
                      <div className="flex items-center gap-1.5 mt-2">
                        {productSwatches.map((colorDoc) => (
                          <ColorSwatch key={colorDoc.id} color={colorDoc} size="sm" />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {visibleCount < filteredProducts.length && (
            <div className="flex justify-center mt-12">
              <button
                onClick={loadMore}
                className="border border-black text-black text-sm font-semibold px-8 py-3 rounded-md hover:bg-black hover:text-white transition active:scale-95 cursor-pointer"
              >
                LOAD MORE
              </button>
            </div>
          )}
        </div>
      </div>

      {quickAddProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-2xl relative border border-neutral-100">
            <button
              onClick={() => setQuickAddProduct(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-500 hover:text-black hover:bg-neutral-200 transition cursor-pointer"
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
                <p className="text-sm font-bold text-neutral-800 mt-1">{formatPkr(getEffectiveProductPrice(quickAddProduct))}</p>
              </div>
            </div>

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
                    className={`w-9 h-9 border rounded-md text-xs font-semibold transition cursor-pointer ${
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

            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold tracking-wider text-neutral-400 uppercase">Select Color</span>
                <span className="text-xs font-bold text-black">
                  {quickSelectedColorDoc?.name || 'Default'}
                </span>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {(() => {
                  const modalColors: ColorDocument[] = [];
                  if (Array.isArray(quickAddProduct.colorIds) && quickAddProduct.colorIds.length > 0) {
                    quickAddProduct.colorIds.forEach((cId: string) => {
                      const colDoc = colorById.get(cId);
                      if (colDoc) modalColors.push(colDoc);
                    });
                  } else if (Array.isArray(quickAddProduct.colors) && quickAddProduct.colors.length > 0) {
                    quickAddProduct.colors.forEach((cName: string) => {
                      const colDoc = colorByName.get(String(cName).trim().toLowerCase());
                      if (colDoc) modalColors.push(colDoc);
                    });
                  }
                  return modalColors.map((colorDoc) => (
                    <ColorSwatch
                      key={colorDoc.id}
                      color={colorDoc}
                      size="md"
                      selected={quickColorId === colorDoc.id}
                      onClick={() => setQuickColorId(colorDoc.id)}
                    />
                  ));
                })()}
              </div>
            </div>

            {/* Quantity Selector */}
            {(() => {
              const maxStock = Number(quickVariant?.availableStock ?? quickVariant?.stock ?? quickVariant?.stockOnHand ?? 99);
              return (
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold tracking-wider text-neutral-400 uppercase">Quantity</span>
                    <span className="text-xs font-bold text-black">{quickQty}</span>
                  </div>
                  <div className="inline-flex items-center border border-neutral-300 rounded-lg bg-neutral-50/80 p-1">
                    <button
                      type="button"
                      onClick={() => setQuickQty((prev) => Math.max(1, prev - 1))}
                      disabled={quickQty <= 1}
                      className="w-8 h-8 rounded-md bg-white border border-neutral-200 shadow-2xs flex items-center justify-center font-bold text-neutral-800 hover:bg-neutral-100 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                      aria-label="Decrease quantity"
                    >
                      -
                    </button>
                    <span className="w-10 text-center text-xs font-extrabold text-neutral-900">{quickQty}</span>
                    <button
                      type="button"
                      onClick={() => setQuickQty((prev) => Math.min(maxStock, prev + 1))}
                      disabled={quickQty >= maxStock}
                      className="w-8 h-8 rounded-md bg-white border border-neutral-200 shadow-2xs flex items-center justify-center font-bold text-neutral-800 hover:bg-neutral-100 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })()}

            <button
              onClick={() => {
                const stock = Number(quickVariant?.availableStock ?? quickVariant?.stock ?? quickVariant?.stockOnHand ?? 0);
                if (!quickVariant || stock < 1) return;
                addToCart({
                  id: quickAddProduct.id,
                  name: quickAddProduct.name,
                  price: getEffectiveProductPrice(quickAddProduct),
                  size: quickSize,
                  color: quickSelectedColorDoc?.name || 'Default',
                  img: quickAddProduct.img,
                  qty: quickQty,
                  variantId: quickVariant.id,
                });
                setQuickAddProduct(null);
                showToast(`Added ${quickAddProduct.name} (${quickSize}, ${quickSelectedColorDoc?.name || 'Default'}) to Cart`, {
                  type: 'cart',
                  actionUrl: '/cart',
                  actionLabel: 'View Cart',
                });
              }}
              disabled={!quickVariant || Number(quickVariant.availableStock ?? quickVariant.stock ?? quickVariant.stockOnHand ?? 0) < 1}
              className="w-full bg-black disabled:bg-neutral-300 disabled:cursor-not-allowed text-white text-xs font-bold py-3.5 rounded-lg hover:bg-neutral-800 transition tracking-wider uppercase active:scale-[0.98] cursor-pointer"
            >
              {quickVariant && Number(quickVariant.availableStock ?? quickVariant.stock ?? quickVariant.stockOnHand ?? 0) > 0
                ? `Add To Cart (${quickVariant.availableStock ?? quickVariant.stock ?? quickVariant.stockOnHand} available)`
                : 'Out of Stock'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ShopClient() {
  return (
    <Suspense fallback={<ShopSkeleton />}>
      <ShopContent />
    </Suspense>
  );
}
