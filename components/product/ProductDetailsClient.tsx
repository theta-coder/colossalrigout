'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/context/ToastContext';
import { Product as CatalogProduct } from '@/lib/products';
import { ColorDocument, ReviewDocument } from '@/types/commerce';
import { formatPkr } from '@/lib/utils';
import { getEffectiveProductPrice } from '@/lib/shop-filters';
import ColorSwatch from '@/components/ui/ColorSwatch';
import ProductPolicySummary from '@/components/product/ProductPolicySummary';
import RelatedProducts from '@/components/product/RelatedProducts';
import { ShippingPolicySettings } from '@/lib/shipping-policy';
import { ReturnsPolicySettings } from '@/lib/returns-policy';
import ProductImageGallery, { GalleryItem } from '@/components/product/ProductImageGallery';
import { Star, Heart, Check, ChevronDown, Sparkles, AlertTriangle, ShieldCheck, Camera, Upload, X } from 'lucide-react';

interface ProductDetailsClientProps {
  product: CatalogProduct;
  availableColors: ColorDocument[];
  policySummary: {
    shipping: ShippingPolicySettings;
    returns: ReturnsPolicySettings;
  };
  initialReviews?: any[];
  relatedProducts?: CatalogProduct[];
  galleriesByColorId?: Record<string, GalleryItem[]>;
  initialActiveCampaigns?: any[];
}

export default function ProductDetailsClient({
  product,
  availableColors,
  policySummary,
  initialReviews = [],
  relatedProducts = [],
  galleriesByColorId = {},
  initialActiveCampaigns = [],
}: ProductDetailsClientProps) {
  const { addToCart, toggleWishlist, wishlist } = useCart();
  const { showToast } = useToast();

  // Basic States
  const [selectedSize, setSelectedSize] = useState<string>(
    product.sizes?.[0] || 'M'
  );
  const [quantity, setQuantity] = useState<number>(1);
  const [variants, setVariants] = useState<any[]>([]);
  const [variantsLoading, setVariantsLoading] = useState(true);
  const [sizeGuide, setSizeGuide] = useState<any | null>(null);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);

  // Images state
  const images = useMemo(() => {
    let list = Array.isArray(product.images) && product.images.length > 0
      ? [...product.images]
      : [product.img || '/colossal-rigout-logo.png'];

    // Collect any variant images if available
    if (Array.isArray(variants)) {
      variants.forEach((v) => {
        const vImg = v.img || v.imageUrl || v.image;
        if (vImg && typeof vImg === 'string' && !list.includes(vImg)) {
          list.push(vImg);
        }
      });
    }

    // Default seeds if product has fewer than 3 images
    const defaultSeeds = ['/colossal-rigout-logo.png', '/product-placeholder.png'];
    for (const seedImg of defaultSeeds) {
      if (list.length >= 3) break;
      if (!list.includes(seedImg)) {
        list.push(seedImg);
      }
    }

    // Secondary fallback guarantee
    if (list.length < 3) {
      list.push('/product-placeholder.png');
    }

    return list;
  }, [product, variants]);

  const [selectedImage, setSelectedImage] = useState<string>(images[0]);

  // Color lookup maps
  const colorById = useMemo(() => {
    const map = new Map<string, ColorDocument>();
    availableColors.forEach((c) => map.set(c.id, c));
    return map;
  }, [availableColors]);

  const colorByName = useMemo(() => {
    const map = new Map<string, ColorDocument>();
    availableColors.forEach((c) => map.set(c.name.toLowerCase().trim(), c));
    return map;
  }, [availableColors]);

  // Resolved colors for this product
  const productColors = useMemo(() => {
    const list: ColorDocument[] = [];
    if (Array.isArray(product.colorIds) && product.colorIds.length > 0) {
      product.colorIds.forEach((cId) => {
        const docCol = colorById.get(cId);
        if (docCol) list.push(docCol);
      });
    } else if (Array.isArray(product.colors) && product.colors.length > 0) {
      product.colors.forEach((cName) => {
        const docCol = colorByName.get(String(cName).toLowerCase().trim());
        if (docCol) list.push(docCol);
      });
    }
    return list;
  }, [product, colorById, colorByName]);

  // Selected Color ID
  const [selectedColorId, setSelectedColorId] = useState<string>(
    productColors[0]?.id || ''
  );

  // Selected Color Document
  const selectedColorDoc = useMemo(() => {
    return colorById.get(selectedColorId) || availableColors.find((c) => c.id === selectedColorId);
  }, [colorById, availableColors, selectedColorId]);

  // Variant matching
  const selectedColorIndex = product.colorIds?.indexOf(selectedColorId) ?? -1;
  const selectedSizeIndex = product.sizes?.indexOf(selectedSize) ?? -1;
  const targetSizeId = product.sizeIds?.[selectedSizeIndex] || selectedSize;

  const selectedVariant = useMemo(() => {
    if (variants.length === 0) return null;
    return variants.find((v) => {
      const matchColor =
        !product.colorIds?.length ||
        v.colorId === selectedColorId ||
        (selectedColorDoc && (v.colorName === selectedColorDoc.name || v.colorId === selectedColorDoc.id));
      const matchSize = v.sizeId === targetSizeId || v.sizeName === selectedSize;
      return matchColor && matchSize;
    });
  }, [variants, product.colorIds, selectedColorId, selectedColorDoc, targetSizeId, selectedSize]);

  // Active gallery items based on selected color
  const activeColorGalleryItems = useMemo<GalleryItem[]>(() => {
    // 1. Check if explicit color gallery exists from admin / props
    if (selectedColorId && galleriesByColorId && galleriesByColorId[selectedColorId]?.length) {
      return galleriesByColorId[selectedColorId];
    }

    // 2. Check if selectedVariant has a specific variant image
    if (selectedVariant?.img || selectedVariant?.imageUrl || selectedVariant?.image) {
      const varImg = selectedVariant.img || selectedVariant.imageUrl || selectedVariant.image;
      if (varImg) {
        return [
          { id: `var_${selectedVariant.id}`, url: varImg, altText: `${product.name} ${selectedColorDoc?.name || ''}` },
          ...images.map((url, idx) => ({ id: `img_${idx}`, url, altText: `${product.name} photo ${idx + 1}` })),
        ];
      }
    }

    // 3. Fallback: Map color index to images array so selecting Navy/White/Black switches to the color image!
    const colorIndex = productColors.findIndex((c) => c.id === selectedColorId);
    if (colorIndex > 0 && images[colorIndex]) {
      const colorImg = images[colorIndex];
      const reorderedImages = [colorImg, ...images.filter((url) => url !== colorImg)];
      return reorderedImages.map((url, idx) => ({
        id: `img_col_${colorIndex}_${idx}`,
        url,
        altText: `${product.name} ${selectedColorDoc?.name || ''} photo ${idx + 1}`,
      }));
    }

    return images.map((url, idx) => ({
      id: `img_${idx}`,
      url,
      altText: `${product.name} photo ${idx + 1}`,
    }));
  }, [galleriesByColorId, selectedColorId, selectedVariant, images, product.name, productColors, selectedColorDoc]);

  // Active Promo Campaigns initialized directly from server props or fallback!
  const [activeCampaigns, setActiveCampaigns] = useState<any[]>(
    Array.isArray(initialActiveCampaigns) && initialActiveCampaigns.length > 0
      ? initialActiveCampaigns
      : [
          {
            id: 'mid-season-sale',
            badgeText: 'LIMITED TIME ONLY',
            heading: 'Mid Season Sale',
            description: 'this is summer sale',
            highlightText: 'FLAT 30% SALE',
            ctaText: 'SHOP THE SALE',
            discountMode: 'automatic',
            discountType: 'percentage',
            discountValue: 30,
            startsAt: new Date().toISOString(),
            endsAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
            targetType: 'all-products',
          },
        ]
  );

  // Reviews & Form state
  const [reviews, setReviews] = useState<any[]>(initialReviews);
  const [reviewSummary, setReviewSummary] = useState<{
    averageRating: number;
    reviewCount: number;
    ratingBreakdown: Record<1 | 2 | 3 | 4 | 5, number>;
  }>({
    averageRating: Number(product.rating || 5),
    reviewCount: Number(product.reviews || initialReviews.length || 0),
    ratingBreakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  });
  const [reviewForm, setReviewForm] = useState({
    customerName: '',
    customerEmail: '',
    rating: 5,
    title: '',
    body: '',
    orderId: '',
    images: [] as string[],
  });
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [uploadingReviewPhotos, setUploadingReviewPhotos] = useState(false);
  const [reviewMessage, setReviewMessage] = useState<string>('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const handleReviewPhotoUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadingReviewPhotos(true);
    try {
      const fileList = Array.from(files).slice(0, 3);
      const newImages: string[] = [];
      for (const file of fileList) {
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) continue;
        const source = await createImageBitmap(file);
        const scale = Math.min(1, 1000 / source.width, 1000 / source.height);
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(source.width * scale));
        canvas.height = Math.max(1, Math.round(source.height * scale));
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/webp', 0.8);
          newImages.push(dataUrl);
        }
        source.close();
      }
      setReviewForm((prev) => ({
        ...prev,
        images: [...prev.images, ...newImages].slice(0, 3),
      }));
    } catch (err) {
      console.error('Failed to upload review photos:', err);
    } finally {
      setUploadingReviewPhotos(false);
    }
  };

  // Accordions
  const [accordionOpen, setAccordionOpen] = useState<Record<string, boolean>>({
    desc: true,
    reviews: false,
  });

  useEffect(() => {
    // 1. Fetch inventory variants
    fetch('/api/commerce/inventory')
      .then((res) => res.json())
      .then((payload) => {
        if (payload.success && Array.isArray(payload.data)) {
          const matching = payload.data.filter(
            (v: any) => String(v.productId) === String(product.id) && v.active !== false
          );
          setVariants(matching);
        }
      })
      .catch(() => setVariants([]))
      .finally(() => setVariantsLoading(false));

    // 2. Fetch Size Guide if present
    if (product.sizeGuideId) {
      fetch('/api/commerce/size-guides')
        .then((res) => res.json())
        .then((payload) => {
          if (payload.success && Array.isArray(payload.data)) {
            const match = payload.data.find((g: any) => g.id === product.sizeGuideId);
            if (match) setSizeGuide(match);
          }
        })
        .catch(() => setSizeGuide(null));
    }

    // 3. Fetch active promo campaigns
    fetch('/api/promo-campaigns/active')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setActiveCampaigns(json.data);
        }
      })
      .catch(() => setActiveCampaigns([]));

    // 4. Fetch live reviews summary
    fetch(`/api/reviews?productId=${product.id}`)
      .then((res) => res.json())
      .then((payload) => {
        if (payload.success) {
          if (Array.isArray(payload.data)) setReviews(payload.data);
          if (payload.summary) setReviewSummary(payload.summary);
        }
      })
      .catch(() => {});
  }, [product.id, product.sizeGuideId]);

  const requiresVariant = Boolean(product.colorIds?.length || product.sizeIds?.length);
  const availableStock = useMemo(() => {
    if (variantsLoading) return 1; // While loading API, assume available to prevent dummy flash
    if (selectedVariant) {
      return Number(selectedVariant.availableStock ?? selectedVariant.stockOnHand ?? selectedVariant.stock ?? 0);
    }
    if ((product as any).inStock === false) return 0;
    if (typeof (product as any).totalStock === 'number' && (product as any).totalStock === 0) return 0;
    if (typeof (product as any).stock === 'number' && (product as any).stock === 0) return 0;

    return (product as any).totalStock ?? (product as any).stock ?? 10;
  }, [variantsLoading, selectedVariant, product]);

  const isCurrentVariantOutOfStock = !variantsLoading && availableStock <= 0;

  // Check campaign eligibility
  const checkCampaignEligibility = (p: any, camp: any) => {
    if (!camp || !p) return false;
    if (camp.targetType === 'all-products') return true;
    if (camp.targetType === 'selected-products') {
      const pids = Array.isArray(camp.productIds) ? camp.productIds.map(String) : [];
      return pids.includes(String(p.id));
    }
    if (camp.targetType === 'selected-categories') {
      const cids = Array.isArray(camp.categoryIds) ? camp.categoryIds.map((s: any) => String(s).toLowerCase().trim()) : [];
      const catId = String(p.categoryId || p.categorySlug || '').toLowerCase().trim();
      const catSlug = String(p.categorySlug || p.cat || '').toLowerCase().trim();
      return cids.includes(catId) || cids.includes(catSlug);
    }
    return false;
  };

  const activeCampaign = activeCampaigns.find((camp) => checkCampaignEligibility(product, camp));
  const basePrice = getEffectiveProductPrice(product);
  const retailPrice = Number(product.retailPrice ?? product.price);
  const isDiscounted = (product as any).discountPrice && (product as any).discountPrice < retailPrice;
  const isAutomaticCampaign = activeCampaign?.discountMode === 'automatic';
  const campaignValue = Math.max(0, Number(activeCampaign?.discountValue || 0));
  const campaignPrice = isAutomaticCampaign
    ? activeCampaign?.discountType === 'percentage'
      ? basePrice * (1 - Math.min(campaignValue, 100) / 100)
      : basePrice - campaignValue
    : basePrice;
  const effPrice = Math.max(0, Math.round(campaignPrice));
  const isCampaignApplied = Boolean((product as any).campaignDiscountApplied || (isAutomaticCampaign && effPrice < basePrice));

  const handleAddToCart = () => {
    if (variantsLoading) {
      showToast('Stock is still loading. Please try again in a moment.', { type: 'info' });
      return;
    }
    if (requiresVariant && !selectedVariant) {
      showToast('This color and size combination is unavailable. Please select another option.', { type: 'error' });
      return;
    }
    if (isCurrentVariantOutOfStock) {
      showToast('Selected size and color combination is currently out of stock.', { type: 'error' });
      return;
    }
    if (availableStock < quantity) {
      showToast(`Only ${availableStock} units available in stock for this combination.`, { type: 'error' });
      return;
    }

    addToCart({
      id: product.id,
      name: product.name,
      price: effPrice,
      size: selectedSize,
      color: selectedColorDoc?.name || 'Default',
      img: selectedImage || product.img,
      variantId: selectedVariant?.id || `${product.id}_default`,
      colorId: selectedColorId,
      sizeId: targetSizeId,
      slug: product.slug,
      availableStock,
      qty: quantity,
    });

    showToast(`Added ${product.name} (${selectedSize}, ${selectedColorDoc?.name || 'Default'}) to Cart`, {
      type: 'cart',
      actionUrl: '/cart',
      actionLabel: 'View Cart',
    });
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingReview(true);
    setReviewMessage('');

    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          review: {
            ...reviewForm,
            title: reviewForm.title.trim() || 'Customer Review',
            body: reviewForm.body.trim() || 'Verified customer rating and feedback.',
            productId: String(product.id),
          },
        }),
      });
      const data = await res.json();

      if (data.success) {
        setReviewMessage(data.message || 'Thank you! Your review has been submitted for admin approval.');
        setReviewForm({
          customerName: '',
          customerEmail: '',
          rating: 5,
          title: '',
          body: '',
          orderId: '',
          images: [],
        });
      } else {
        setReviewMessage(data.message || 'Review submission failed. Please try again.');
      }
    } catch (err: any) {
      setReviewMessage(err?.message || 'Error submitting review.');
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 pb-16">
      {/* Breadcrumb */}
      <div className="py-4 text-xs sm:text-sm text-neutral-500">
        <Link href="/" className="hover:text-black">
          Home
        </Link>{' '}
        <span className="mx-1">/</span>{' '}
        <Link href="/shop" className="hover:text-black">
          Shop
        </Link>{' '}
        <span className="mx-1">/</span>{' '}
        <span className="text-neutral-900 font-medium capitalize">{product.cat}</span>{' '}
        <span className="mx-1">/</span>{' '}
        <span className="text-neutral-900 font-semibold">{product.name}</span>
      </div>

      {/* Product Main Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 pt-2">
        {/* Left: Dynamic Color-Switched Gallery with Hover Zoom & Lightbox */}
        <div className="lg:col-span-7 relative">
          <button
            type="button"
            onClick={() => toggleWishlist(product.id)}
            className="absolute top-3 right-3 w-10 h-10 rounded-full bg-white/90 backdrop-blur-xs flex items-center justify-center text-neutral-700 shadow-md hover:bg-white transition z-30 cursor-pointer"
            aria-label="Wishlist"
          >
            <Heart
              className={`w-5 h-5 ${
                wishlist.includes(product.id) ? 'fill-red-500 text-red-500' : 'text-neutral-700'
              }`}
            />
          </button>

          <ProductImageGallery
            items={activeColorGalleryItems}
            productName={product.name}
            isOutOfStock={isCurrentVariantOutOfStock}
            onSelectImage={(url) => setSelectedImage(url)}
          />
        </div>

        {/* Right: Info & Actions */}
        <div className="lg:col-span-5 space-y-6">
          <div>
            <span className="text-xs font-bold tracking-widest text-neutral-400 uppercase font-mono">
              {product.cat}
            </span>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight uppercase mt-1 leading-snug">
              {product.name}
            </h1>

            {/* Rating Summary */}
            <div className="flex items-center gap-2 mt-2 text-xs">
              <div className="flex items-center text-amber-500">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${
                      i < Math.round(reviewSummary.averageRating) ? 'fill-amber-400 text-amber-400' : 'text-neutral-300'
                    }`}
                  />
                ))}
              </div>
              <span className="font-bold text-neutral-900">{reviewSummary.averageRating}</span>
              <span className="text-neutral-400 font-light">({reviewSummary.reviewCount} customer reviews)</span>
            </div>
          </div>

          {/* Pricing Section (Strict PKR) */}
          <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200/80 space-y-1">
            <div className="flex items-baseline gap-3">
              <span className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight">
                {formatPkr(effPrice)}
              </span>
              {isCampaignApplied ? (
                <>
                  <span className="text-sm sm:text-base text-neutral-400 line-through font-medium">
                    {formatPkr(retailPrice)}
                  </span>
                  <span className="text-xs font-extrabold text-red-600 bg-red-100 px-2 py-0.5 rounded-md">
                    CAMPAIGN DISCOUNT
                  </span>
                </>
              ) : isDiscounted ? (
                <>
                  <span className="text-sm sm:text-base text-neutral-400 line-through font-medium">
                    {formatPkr(retailPrice)}
                  </span>
                  <span className="text-xs font-extrabold text-red-600 bg-red-100 px-2 py-0.5 rounded-md">
                    SAVE {Math.round((1 - effPrice / retailPrice) * 100)}%
                  </span>
                </>
              ) : null}
            </div>
            <p className="text-[11px] text-neutral-500 font-light">Prices inclusive of all taxes. Free shipping available.</p>
          </div>

          {/* Color Selector */}
          {productColors.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-neutral-900 uppercase tracking-wider">
                  COLOR: <span className="font-extrabold text-black">{selectedColorDoc?.name || 'Default'}</span>
                </span>
              </div>
              <div className="flex flex-wrap gap-3">
                {productColors.map((colDoc) => (
                  <ColorSwatch
                    key={colDoc.id}
                    color={colDoc}
                    size="lg"
                    selected={selectedColorId === colDoc.id}
                    onClick={() => setSelectedColorId(colDoc.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Size Selector */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-neutral-900 uppercase tracking-wider">
                SELECT SIZE: <span className="font-extrabold text-black">{selectedSize}</span>
              </span>
              {sizeGuide && (
                <button
                  type="button"
                  onClick={() => setSizeGuideOpen(true)}
                  className="text-neutral-600 hover:text-black underline cursor-pointer text-[11px]"
                >
                  Size Guide &amp; Chart
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2.5">
              {product.sizes.map((sz) => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => setSelectedSize(sz)}
                  className={`w-12 h-11 border rounded-xl font-bold text-xs transition cursor-pointer flex items-center justify-center ${
                    selectedSize === sz
                      ? 'border-black bg-black text-white shadow-sm'
                      : 'border-neutral-300 hover:border-black bg-white text-neutral-800'
                  }`}
                >
                  {sz}
                </button>
              ))}
            </div>
          </div>

          {/* Stock Warning & Quantity Control */}
          <div className="space-y-4 pt-2">
            {isCurrentVariantOutOfStock ? (
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-800 font-semibold">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                This color and size combination is currently Out of Stock.
              </div>
            ) : (
              <div className="flex items-center justify-between text-xs font-medium text-emerald-700 bg-emerald-50 px-3.5 py-2 rounded-lg border border-emerald-200">
                <span className="flex items-center gap-1.5 font-semibold">
                  <Check className="w-4 h-4 text-emerald-600" /> In Stock &amp; Ready to Ship
                </span>
                <span className="text-[11px] text-emerald-800 font-mono font-bold">
                  {availableStock} available
                </span>
              </div>
            )}

            {/* Quantity Counter & Add to Cart */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex items-center border border-neutral-300 rounded-xl overflow-hidden bg-white w-32 justify-between shrink-0">
                <button
                  type="button"
                  disabled={quantity <= 1 || isCurrentVariantOutOfStock}
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-10 h-11 font-bold text-neutral-600 hover:text-black disabled:opacity-30 cursor-pointer"
                >
                  -
                </button>
                <span className="font-bold text-sm text-neutral-900">{quantity}</span>
                <button
                  type="button"
                  disabled={quantity >= availableStock || isCurrentVariantOutOfStock}
                  onClick={() => setQuantity((q) => q + 1)}
                  className="w-10 h-11 font-bold text-neutral-600 hover:text-black disabled:opacity-30 cursor-pointer"
                >
                  +
                </button>
              </div>

              <button
                type="button"
                onClick={handleAddToCart}
                disabled={isCurrentVariantOutOfStock}
                className="flex-1 bg-black text-white text-xs sm:text-sm font-extrabold py-3.5 px-6 rounded-xl hover:bg-neutral-800 disabled:bg-neutral-300 disabled:cursor-not-allowed transition uppercase tracking-wider shadow-md cursor-pointer"
              >
                {isCurrentVariantOutOfStock ? 'OUT OF STOCK' : `ADD TO CART — ${formatPkr(effPrice * quantity)}`}
              </button>
            </div>
          </div>

          {/* Dynamic Shipping & Returns Policy Accordion */}
          <div className="pt-4">
            <ProductPolicySummary
              shipping={policySummary.shipping}
              returns={policySummary.returns}
            />
          </div>

          {/* Product Description Accordion */}
          <div className="border border-neutral-200 rounded-xl overflow-hidden bg-white">
            <button
              type="button"
              onClick={() => setAccordionOpen({ ...accordionOpen, desc: !accordionOpen.desc })}
              className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-neutral-50 transition cursor-pointer"
            >
              <span className="font-semibold text-xs tracking-wider uppercase text-neutral-900">
                PRODUCT DETAILS &amp; DESCRIPTION
              </span>
              <ChevronDown
                className={`w-4 h-4 text-neutral-500 transition-transform duration-200 ${
                  accordionOpen.desc ? 'rotate-180' : ''
                }`}
              />
            </button>
            {accordionOpen.desc && (
              <div className="px-5 pb-5 pt-1 text-xs text-neutral-600 font-light leading-relaxed border-t border-neutral-100">
                <p className="whitespace-pre-line">{product.description || 'No detailed description provided.'}</p>
              </div>
            )}
          </div>

          {/* Customer Reviews Accordion & Submission */}
          <div className="border border-neutral-200 rounded-xl overflow-hidden bg-white">
            <button
              type="button"
              onClick={() => setAccordionOpen({ ...accordionOpen, reviews: !accordionOpen.reviews })}
              className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-neutral-50 transition cursor-pointer"
            >
              <span className="font-semibold text-xs tracking-wider uppercase text-neutral-900 flex items-center gap-2">
                CUSTOMER REVIEWS ({reviewSummary.reviewCount})
              </span>
              <ChevronDown
                className={`w-4 h-4 text-neutral-500 transition-transform duration-200 ${
                  accordionOpen.reviews ? 'rotate-180' : ''
                }`}
              />
            </button>

            {accordionOpen.reviews && (
              <div className="px-5 pb-5 pt-3 space-y-6 border-t border-neutral-100 text-xs">
                {/* Approved Reviews List */}
                <div className="space-y-4">
                  {reviews.length === 0 ? (
                    <p className="text-neutral-500 italic text-center py-4">
                      No approved customer reviews yet. Be the first to write a review!
                    </p>
                  ) : (
                    reviews.map((rev) => (
                      <div key={rev.id} className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200/80 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1 text-amber-400">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-3.5 h-3.5 ${
                                  i < rev.rating ? 'fill-amber-400' : 'text-neutral-300'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-[10px] text-neutral-400">
                            {new Date(rev.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <h5 className="font-bold text-neutral-900 text-xs">{rev.title}</h5>
                        <p className="text-neutral-600 font-light leading-relaxed">{rev.body}</p>

                        {/* Customer Uploaded Parcel Photos */}
                        {Array.isArray(rev.images) && rev.images.length > 0 && (
                          <div className="flex gap-2 pt-1.5 overflow-x-auto">
                            {rev.images.map((imgUrl: string, idx: number) => (
                              <a
                                key={idx}
                                href={imgUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block relative w-16 h-16 rounded-lg border border-neutral-300 overflow-hidden bg-white shrink-0 hover:opacity-90 transition shadow-2xs"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={imgUrl} alt={`Parcel photo ${idx + 1}`} className="w-full h-full object-cover" />
                              </a>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center gap-2 pt-1 text-[10px] text-neutral-500 font-medium">
                          <span>By {rev.customerName}</span>
                          {rev.verifiedPurchase && (
                            <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded font-semibold flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3" /> Verified Buyer
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Review Form */}
                <form onSubmit={handleReviewSubmit} className="pt-4 border-t border-neutral-200 space-y-3.5">
                  <h4 className="font-bold text-neutral-900 text-xs uppercase tracking-wider">Write a Customer Review</h4>
                  {reviewMessage && (
                    <div className="p-3 rounded-lg bg-neutral-100 text-neutral-800 font-medium text-xs">
                      {reviewMessage}
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-neutral-700 mb-1">Your Name *</label>
                      <input
                        type="text"
                        required
                        value={reviewForm.customerName}
                        onChange={(e) => setReviewForm({ ...reviewForm, customerName: e.target.value })}
                        className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-xs outline-none focus:border-black"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-neutral-700 mb-1">Your Email *</label>
                      <input
                        type="email"
                        required
                        value={reviewForm.customerEmail}
                        onChange={(e) => setReviewForm({ ...reviewForm, customerEmail: e.target.value })}
                        className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-xs outline-none focus:border-black"
                      />
                    </div>
                  </div>

                  {/* INTERACTIVE GOLDEN STAR RATING BAR */}
                  <div>
                    <label className="block font-semibold text-neutral-700 mb-1">Rating *</label>
                    <div className="flex items-center gap-1 text-amber-400">
                      {[1, 2, 3, 4, 5].map((starVal) => {
                        const activeRating = hoverRating !== null ? hoverRating : reviewForm.rating;
                        return (
                          <button
                            key={starVal}
                            type="button"
                            onMouseEnter={() => setHoverRating(starVal)}
                            onMouseLeave={() => setHoverRating(null)}
                            onClick={() => setReviewForm({ ...reviewForm, rating: starVal as 1|2|3|4|5 })}
                            className="p-1 hover:scale-110 transition active:scale-95 cursor-pointer"
                          >
                            <Star
                              className={`w-6 h-6 ${
                                starVal <= activeRating ? 'fill-amber-400 text-amber-400' : 'text-neutral-300'
                              }`}
                            />
                          </button>
                        );
                      })}
                      <span className="text-xs font-bold text-neutral-700 ml-2">
                        {reviewForm.rating} Out of 5 Stars
                      </span>
                    </div>
                  </div>

                  {/* PARCEL PHOTO UPLOADER */}
                  <div>
                    <label className="block font-semibold text-neutral-700 mb-1">
                      Upload Parcel / Product Photos (Optional)
                    </label>
                    <p className="text-[11px] text-neutral-500 mb-2">
                      Upload pictures of your received parcel or product to help other shoppers!
                    </p>
                    <div className="flex flex-wrap items-center gap-3">
                      {reviewForm.images.map((imgUrl, i) => (
                        <div key={i} className="relative w-16 h-16 rounded-lg border border-neutral-300 overflow-hidden bg-neutral-100 shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={imgUrl} alt={`Review upload ${i + 1}`} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setReviewForm((prev) => ({ ...prev, images: prev.images.filter((_, idx) => idx !== i) }))}
                            className="absolute top-1 right-1 bg-black/70 text-white rounded-full p-0.5 hover:bg-black transition cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}

                      {reviewForm.images.length < 3 && (
                        <label className="w-16 h-16 rounded-lg border-2 border-dashed border-neutral-300 hover:border-black flex flex-col items-center justify-center text-neutral-500 hover:text-black transition cursor-pointer bg-neutral-50 hover:bg-white shrink-0">
                          <Camera className="w-5 h-5 mb-0.5" />
                          <span className="text-[9px] font-bold uppercase">{uploadingReviewPhotos ? 'Wait...' : '+ Photo'}</span>
                          <input
                            type="file"
                            multiple
                            accept="image/jpeg,image/png,image/webp"
                            onChange={(e) => handleReviewPhotoUpload(e.target.files)}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-neutral-700 mb-1">Review Title (Optional)</label>
                    <input
                      type="text"
                      value={reviewForm.title}
                      onChange={(e) => setReviewForm({ ...reviewForm, title: e.target.value })}
                      placeholder="e.g. Perfect fit and great fabric! (Optional)"
                      className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-xs outline-none focus:border-black"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-neutral-700 mb-1">Review Details (Optional)</label>
                    <textarea
                      rows={3}
                      value={reviewForm.body}
                      onChange={(e) => setReviewForm({ ...reviewForm, body: e.target.value })}
                      placeholder="Write your honest opinion about the product fit, quality, and style... (Optional)"
                      className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-xs outline-none focus:border-black resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submittingReview}
                    className="w-full bg-black text-white font-bold py-2.5 rounded-lg text-xs hover:bg-neutral-800 disabled:opacity-50 transition cursor-pointer"
                  >
                    {submittingReview ? 'Submitting Review...' : 'Submit Review for Approval'}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Related Products Section */}
      {relatedProducts.length > 0 && (
        <div className="mt-16">
          <RelatedProducts products={relatedProducts} colorsById={colorById} />
        </div>
      )}

      {/* Size Guide Modal */}
      {sizeGuideOpen && sizeGuide && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl relative border border-neutral-200 max-h-[90vh] overflow-y-auto space-y-4">
            <button
              onClick={() => setSizeGuideOpen(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-black font-bold text-lg cursor-pointer"
            >
              ✕
            </button>
            <h3 className="font-display font-extrabold text-lg text-neutral-900 uppercase">
              {sizeGuide.name || 'SIZE GUIDE & CHART'}
            </h3>
            <p className="text-xs text-neutral-500 font-light">Measurements in {sizeGuide.unit || 'in'}</p>

            <div className="overflow-x-auto border border-neutral-200 rounded-xl">
              <table className="w-full text-xs text-left">
                <thead className="bg-neutral-100 text-neutral-700 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-3">Size</th>
                    {sizeGuide.columns?.map((col: any) => (
                      <th key={col.key} className="p-3">{col.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {sizeGuide.rows?.map((row: any, idx: number) => (
                    <tr key={idx} className="hover:bg-neutral-50">
                      <td className="p-3 font-bold text-neutral-900">{row.sizeName}</td>
                      {sizeGuide.columns?.map((col: any) => (
                        <td key={col.key} className="p-3 text-neutral-600">{row.values?.[col.key] || '-'}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {sizeGuide.instructions && (
              <p className="text-[11px] text-neutral-500 italic pt-2">{sizeGuide.instructions}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
