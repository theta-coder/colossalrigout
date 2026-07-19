'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCart } from '../../context/CartContext';
import { useProducts } from '../../context/ProductsContext';
import { Product } from '../../lib/products';
import { Star, Check, HelpCircle, Heart, ChevronDown, Sparkles } from 'lucide-react';

const colorClasses: Record<string, string> = {
  Black: 'bg-black border border-neutral-800',
  Stone: 'bg-stone-300 border border-neutral-400',
  Navy: 'bg-blue-900 border border-blue-950',
  Blue: 'bg-blue-600 border border-blue-700',
  White: 'bg-white border border-neutral-300',
  Grey: 'bg-neutral-500 border border-neutral-600',
  Amber: 'bg-amber-800 border border-amber-900',
};

interface ProductDetailContentProps {
  productId: number;
}

function ProductDetailContent({ productId }: ProductDetailContentProps) {
  const { addToCart, toggleWishlist, wishlist } = useCart();
  const { products } = useProducts();

  // Get active product details
  const product = products.find((p) => p.id === productId) || products[0];

  // Local state initialized with the current product
  const [mainImage, setMainImage] = useState(product?.images[0] || product?.img || '');
  const [selectedColor, setSelectedColor] = useState(product?.colors[0] || 'Default');
  const [selectedSize, setSelectedSize] = useState(product?.sizes[0] || 'M');
  const [quantity, setQuantity] = useState(1);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [variants, setVariants] = useState<any[]>([]);
  const [sizeGuide, setSizeGuide] = useState<any>(null);
  const [reviewForm, setReviewForm] = useState({ customerName: '', customerEmail: '', rating: 5, title: '', body: '' });
  const [reviewMessage, setReviewMessage] = useState('');

  const [activeCampaigns, setActiveCampaigns] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/commerce/reviews').then(response => response.json()).then(data => setReviews((data.data || []).filter((review: any) => review.productId === String(product?.id) && review.status === 'approved')));
    fetch('/api/commerce/inventory').then(response => response.json()).then(data => setVariants((data.data || []).filter((variant: any) => variant.productId === String(product?.id) && variant.active !== false)));
    if (product?.sizeGuideId) fetch('/api/commerce/size-guides').then(response => response.json()).then(data => setSizeGuide((data.data || []).find((guide: any) => guide.id === product.sizeGuideId) || null));

    fetch('/api/promo-campaigns/active')
      .then(res => res.json())
      .then(json => {
        if (json.success && Array.isArray(json.data)) {
          setActiveCampaigns(json.data);
        }
      })
      .catch(() => {});
  }, [product?.id, product?.sizeGuideId]);

  const selectedColorIndex = product?.colors.indexOf(selectedColor) ?? -1;
  const selectedSizeIndex = product?.sizes.indexOf(selectedSize) ?? -1;
  const selectedVariant = variants.find(variant => variant.colorId === product?.colorIds?.[selectedColorIndex] && variant.sizeId === product?.sizeIds?.[selectedSizeIndex]);
  const availableStock = Number(selectedVariant?.availableStock ?? selectedVariant?.stock ?? selectedVariant?.stockOnHand ?? 0);

  // Campaign eligibility check
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

  const productCampaign = activeCampaigns.find(camp => checkCampaignEligibility(product, camp));

  const submitReview = async (event: React.FormEvent) => {
    event.preventDefault();
    const response = await fetch('/api/commerce/reviews', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ record: { ...reviewForm, productId: String(product.id), status: 'pending', verifiedPurchase: false } }) });
    const data = await response.json();
    setReviewMessage(data.success ? 'Thank you. Your review is pending admin approval.' : data.message || 'Review submission failed.');
    if (data.success) setReviewForm({ customerName: '', customerEmail: '', rating: 5, title: '', body: '' });
  };

  // Accordion active tabs
  const [accordionOpen, setAccordionOpen] = useState<Record<string, boolean>>({
    desc: true,
    ship: false,
    rev: false,
  });

  // Compute related products from the same category
  const relatedProducts = products
    .filter((p) => p.cat === product?.cat && p.id !== product?.id)
    .slice(0, 4);
  if (relatedProducts.length < 4 && product) {
    const others = products.filter((p) => p.id !== product.id && !relatedProducts.some((rp) => rp.id === p.id));
    relatedProducts.push(...others.slice(0, 4 - relatedProducts.length));
  }

  const handleAddToCart = () => {
    if (!selectedVariant || availableStock < quantity) {
      alert('This color and size combination does not have enough stock.');
      return;
    }
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      size: selectedSize,
      color: selectedColor,
      qty: quantity,
      img: product.img,
      variantId: selectedVariant.id,
    });
    alert(`Successfully added ${quantity}x ${product.name} (${selectedSize}, ${selectedColor}) to your Cart!`);
  };

  const toggleAccordion = (tab: string) => {
    setAccordionOpen((prev) => ({ ...prev, [tab]: !prev[tab] }));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 pb-16">
      {/* BREADCRUMB */}
      <div className="py-4 text-xs sm:text-sm text-neutral-500">
        <Link href="/" className="hover:text-black">Home</Link> <span className="mx-1">/</span>
        <Link href="/shop" className="hover:text-black">Shop</Link> <span className="mx-1">/</span>
        <Link href={`/shop?cat=${product.cat}`} className="hover:text-black">{product.cat}</Link> <span className="mx-1">/</span>
        <span className="text-neutral-900 font-medium">{product.name}</span>
      </div>

      {/* PRODUCT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start">
        {/* LEFT GALLERY */}
        <div className="flex flex-col gap-3">
          <div className="relative rounded-md overflow-hidden bg-neutral-200 aspect-[4/5] w-full">
            <Image
              src={mainImage}
              alt={`${product.name} main look`}
              fill
              priority
              className="object-cover transition duration-300"
            />
            {product.isBestseller && (
              <span className="absolute top-3 left-3 bg-black text-white text-[10px] font-semibold px-2.5 py-1 rounded-md tracking-wider">
                BESTSELLER
              </span>
            )}
          </div>
          {/* Thumbnails row */}
          {product.images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto cat-scroll pb-1">
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setMainImage(img)}
                  className={`relative w-16 h-20 sm:w-20 sm:h-24 flex-none overflow-hidden rounded-md cursor-pointer transition ${
                    mainImage === img ? 'ring-2 ring-black' : 'ring-2 ring-transparent opacity-70 hover:opacity-100'
                  }`}
                >
                  <Image
                    src={img}
                    alt={`Thumbnail ${idx}`}
                    fill
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT INFO */}
        <div className="flex flex-col gap-1">
          <p className="text-xs text-neutral-500 tracking-wider font-semibold uppercase">{product.cat}</p>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-neutral-900 mt-1">
            {product.name}
          </h1>

          {/* Ratings */}
          <div className="flex items-center gap-2 mt-2">
            <div className="flex gap-0.5 text-amber-500 text-sm">
              <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
              <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
              <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
              <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
              <Star className="w-4 h-4 text-neutral-300" />
            </div>
            <span className="text-xs text-neutral-500 font-medium">
              {product.rating || '4.8'} &middot; {product.sold || '150+ sold'}
            </span>
          </div>

          {/* Price Display with Campaign & Discount Support */}
          <div className="flex items-center gap-3 mt-4">
            {(() => {
              if (!product) return null;
              const retail = Number((product as any).retailPrice || product.price || 0);
              const manualDiscount = (product as any).discountPrice ? Number((product as any).discountPrice) : null;
              const manualPrice = manualDiscount !== null && manualDiscount < retail ? manualDiscount : retail;
              
              let isCampaignPriceApplied = false;
              let campaignPrice = retail;
              
              if (productCampaign && productCampaign.discountMode === 'automatic') {
                if (productCampaign.discountType === 'percentage') {
                  campaignPrice = retail * (1 - Number(productCampaign.discountValue || 0) / 100);
                } else if (productCampaign.discountType === 'fixed') {
                  campaignPrice = Math.max(0.01, retail - Number(productCampaign.discountValue || 0));
                }
                if (campaignPrice < manualPrice) {
                  isCampaignPriceApplied = true;
                }
              }

              const finalDisplayPrice = isCampaignPriceApplied ? campaignPrice : manualPrice;

              if (finalDisplayPrice < retail) {
                return (
                  <>
                    <span className="text-2xl sm:text-3xl font-extrabold text-red-600">
                      ${finalDisplayPrice.toFixed(2)}
                    </span>
                    <span className="text-base sm:text-lg text-neutral-400 line-through font-medium">
                      ${retail.toFixed(2)}
                    </span>
                    <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">
                      -{Math.round((1 - finalDisplayPrice / retail) * 100)}% OFF
                    </span>
                    {isCampaignPriceApplied && (
                      <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        Campaign Applied
                      </span>
                    )}
                  </>
                );
              }

              return (
                <span className="text-xl sm:text-2xl font-bold text-neutral-900">
                  ${retail.toFixed(2)}
                </span>
              );
            })()}
          </div>

          {/* Active Campaign Info and Badge */}
          {productCampaign && (
            <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="bg-amber-500 text-black font-display font-black text-[9px] tracking-widest px-2 py-0.5 rounded uppercase">
                  {productCampaign.badgeText || 'Active Promotion'}
                </span>
                <span className="font-bold text-neutral-800 text-xs">
                  {productCampaign.heading}
                </span>
              </div>
              <p className="text-[11px] text-neutral-600 font-medium">
                {productCampaign.highlightText && (
                  <span className="text-amber-600 font-bold">{productCampaign.highlightText} </span>
                )}
                {productCampaign.description}
              </p>
              
              {productCampaign.discountMode === 'coupon' && productCampaign.couponCode && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-neutral-500 font-semibold uppercase">Use Coupon:</span>
                  <div className="flex items-center border rounded bg-white overflow-hidden">
                    <span className="px-2 py-1 font-mono font-bold text-xs bg-neutral-50 border-r text-neutral-800">
                      {productCampaign.couponCode}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(productCampaign.couponCode);
                        alert('Coupon code copied to clipboard!');
                      }}
                      className="px-2 py-1 text-[10px] font-bold uppercase text-black hover:bg-neutral-100 transition cursor-pointer"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Product Description */}
          <p className="text-sm text-neutral-600 mt-4 leading-relaxed font-light">
            {product.description} Crafted with premium materials and designed for long-lasting comfort and high style. Honest quality from the first stitch to the final details.
          </p>

          {/* Color Selection */}
          {product.colors.length > 0 && (
            <div className="mt-6">
              <p className="text-sm font-semibold text-neutral-900 mb-2">
                Color: <span className="font-normal text-neutral-500">{selectedColor}</span>
              </p>
              <div className="flex gap-2">
                {product.colors.map((c) => (
                  <button
                    key={c}
                    onClick={() => setSelectedColor(c)}
                    className={`w-8 h-8 rounded-full ${colorClasses[c] || 'bg-stone-300'} ring-2 ring-offset-2 transition ${
                      selectedColor === c ? 'ring-black scale-110' : 'ring-transparent hover:ring-neutral-300'
                    }`}
                    aria-label={`Select color ${c}`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Size Selection */}
          {product.sizes.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-neutral-900">
                  Size: <span className="font-normal text-neutral-500">{selectedSize}</span>
                </p>
                <button
                  onClick={() => setSizeGuideOpen(true)}
                  className="text-xs underline hover:text-neutral-600 flex items-center gap-1 font-medium text-neutral-500"
                >
                  <HelpCircle className="w-3 h-3" /> Size Guide
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map((size) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`w-10 h-10 border rounded-md text-xs font-semibold transition ${
                      selectedSize === size
                        ? 'border-black bg-black text-white'
                        : 'border-neutral-300 hover:border-black bg-white text-neutral-800'
                    }`}
                  >
                    {size}
                  </button>
                ))}
                <button
                  disabled
                  className="w-10 h-10 border border-neutral-200 text-neutral-300 rounded-md text-xs font-semibold line-through cursor-not-allowed bg-neutral-100"
                >
                  XXL
                </button>
              </div>
            </div>
          )}

          {/* Quantity Selector */}
          <div className="mt-6">
            <p className="text-sm font-semibold text-neutral-900 mb-2">Quantity</p>
            <div className="flex items-center border border-neutral-300 rounded-md w-max bg-white">
              <button
                onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                className="w-9 h-10 flex items-center justify-center text-lg text-neutral-600 hover:bg-neutral-50 font-medium active:scale-95 transition"
              >
                -
              </button>
              <span className="w-8 text-center text-sm font-bold text-neutral-800">{quantity}</span>
              <button
                onClick={() => setQuantity((prev) => prev + 1)}
                className="w-9 h-10 flex items-center justify-center text-lg text-neutral-600 hover:bg-neutral-50 font-medium active:scale-95 transition"
              >
                +
              </button>
            </div>
          </div>

          {/* Action buttons */}
          <div className="mt-6 flex gap-3">
            <button
              onClick={handleAddToCart}
              className="flex-1 bg-black text-white text-sm font-bold py-3.5 rounded-md hover:bg-neutral-800 transition active:scale-95"
            >
              ADD TO CART
            </button>
            <button
              onClick={() => toggleWishlist(product.id)}
              className="w-14 border border-neutral-300 rounded-md flex items-center justify-center hover:border-black transition active:scale-95 bg-white"
              aria-label="Add to wishlist"
            >
              <Heart
                className={`w-5 h-5 ${wishlist.includes(product.id) ? 'fill-red-500 text-red-500' : 'text-neutral-500'}`}
              />
            </button>
          </div>

          <p className="text-xs text-neutral-500 mt-4 flex items-center gap-1.5 font-medium">
            <Check className={`w-4 h-4 ${availableStock > 0 ? 'text-green-600' : 'text-red-500'}`} /> {availableStock > 0 ? `${availableStock} in stock · Ships within 1–2 business days` : 'Selected variant is out of stock'}
          </p>

          {/* ACCORDION INFORMATION */}
          <div className="mt-8 divide-y divide-neutral-200 border-t border-b border-neutral-200">
            {/* Shipping Policy Tab */}
            <div>
              <button
                onClick={() => toggleAccordion('ship')}
                className="w-full flex items-center justify-between py-4 text-sm font-bold text-neutral-900"
              >
                Shipping &amp; Returns
                <ChevronDown
                  className={`w-4 h-4 text-neutral-500 transition-transform duration-300 ${
                    accordionOpen.ship ? 'rotate-180' : ''
                  }`}
                />
              </button>
              <div
                className={`accordion-content transition-all duration-300 ${
                  accordionOpen.ship ? 'open' : ''
                }`}
              >
                <p className="text-sm text-neutral-600 leading-relaxed pb-4 font-light">
                  Free shipping on orders over $75. Standard delivery in 4&ndash;6 business days for Rs. 500 flat / $5.00 flat. Easy 30-day returns &mdash; item must be unworn with original tags attached.
                </p>
              </div>
            </div>

            {/* Reviews Tab */}
            <div>
              <button
                onClick={() => toggleAccordion('rev')}
                className="w-full flex items-center justify-between py-4 text-sm font-bold text-neutral-900"
              >
                Reviews ({reviews.length})
                <ChevronDown
                  className={`w-4 h-4 text-neutral-500 transition-transform duration-300 ${
                    accordionOpen.rev ? 'rotate-180' : ''
                  }`}
                />
              </button>
              <div
                className={`accordion-content transition-all duration-300 ${
                  accordionOpen.rev ? 'open' : ''
                }`}
              >
                <div className="pb-4 space-y-4 pt-1">
                  {reviews.map(review => <div key={review.id} className="border-b pb-3"><div className="text-amber-500">{'★'.repeat(Number(review.rating))}</div><p className="font-bold text-sm">{review.title}</p><p className="text-sm text-neutral-600">{review.body}</p><p className="text-[10px] text-neutral-400">{review.customerName}{review.verifiedPurchase ? ' · Verified buyer' : ''}</p></div>)}
                  {reviews.length === 0 && <p className="text-xs text-neutral-400">No approved reviews yet.</p>}
                  <form onSubmit={submitReview} className="grid grid-cols-2 gap-2 border-t pt-4">
                    <input required placeholder="Your name" value={reviewForm.customerName} onChange={e=>setReviewForm({...reviewForm,customerName:e.target.value})} className="border rounded px-3 py-2 text-xs" />
                    <input required type="email" placeholder="Email" value={reviewForm.customerEmail} onChange={e=>setReviewForm({...reviewForm,customerEmail:e.target.value})} className="border rounded px-3 py-2 text-xs" />
                    <select value={reviewForm.rating} onChange={e=>setReviewForm({...reviewForm,rating:Number(e.target.value)})} className="border rounded px-3 py-2 text-xs"><option value="5">5 stars</option><option value="4">4 stars</option><option value="3">3 stars</option><option value="2">2 stars</option><option value="1">1 star</option></select>
                    <input required placeholder="Review title" value={reviewForm.title} onChange={e=>setReviewForm({...reviewForm,title:e.target.value})} className="border rounded px-3 py-2 text-xs" />
                    <textarea required placeholder="Write your review" value={reviewForm.body} onChange={e=>setReviewForm({...reviewForm,body:e.target.value})} className="col-span-2 border rounded px-3 py-2 text-xs" />
                    {reviewMessage && <p className="col-span-2 text-xs text-neutral-500">{reviewMessage}</p>}
                    <button className="col-span-2 bg-black text-white rounded py-2 text-xs font-bold">SUBMIT FOR APPROVAL</button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* YOU MAY ALSO LIKE */}
      <section className="mt-14">
        <h2 className="font-display text-xl sm:text-2xl font-bold tracking-wide text-neutral-900 mb-6">
          YOU MAY ALSO LIKE
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-5">
          {relatedProducts.map((p) => (
            <div key={p.id} className="prod-card group flex flex-col">
              <Link href={`/product?id=${p.id}`} className="block relative overflow-hidden rounded-md bg-neutral-200 aspect-[3/4] w-full cursor-pointer">
                <Image
                  src={p.img}
                  alt={p.name}
                  fill
                  className="object-cover transition duration-500 group-hover:scale-105"
                />
              </Link>
              <Link href={`/product?id=${p.id}`} className="mt-2 text-sm font-semibold text-neutral-900 hover:underline">
                {p.name}
              </Link>
              <p className="text-sm text-neutral-800">${p.price.toFixed(2)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* NEWSLETTER */}
      <section className="bg-[#f4efe9] py-12 sm:py-16 -mx-4 mt-16">
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
              alert('Thanks for subscribing!');
              e.currentTarget.reset();
            }}
            className="mt-6 flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto"
          >
            <input
              required
              type="email"
              placeholder="Enter your email"
              className="flex-1 border border-neutral-300 rounded-md px-4 py-3 text-sm outline-none bg-[#f4f4f3] focus:border-black transition text-neutral-800"
            />
            <button className="bg-black text-white text-sm font-semibold px-6 py-3 rounded-md hover:bg-neutral-800 transition whitespace-nowrap active:scale-95">
              SUBSCRIBE
            </button>
          </form>
        </div>
      </section>

      {/* SIZE GUIDE MODAL */}
      {sizeGuideOpen && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 transition-opacity">
          <div className="bg-[#f4f4f3] rounded-t-xl sm:rounded-xl w-full sm:max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl animate-fade-up">
            <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200 sticky top-0 bg-[#f4f4f3]">
              <p className="font-display text-lg font-bold">Size Guide</p>
              <button
                onClick={() => setSizeGuideOpen(false)}
                className="text-2xl leading-none hover:text-neutral-600 transition"
                aria-label="Close modal"
              >
                &times;
              </button>
            </div>
            <div className="p-5">
              {sizeGuide ? <>
                <table className="w-full text-xs sm:text-sm text-left border-collapse"><thead><tr className="border-b"><th className="py-2">Size</th>{(sizeGuide.columns || []).map((column:any)=><th key={column.key}>{column.label}</th>)}</tr></thead><tbody>{(sizeGuide.rows || []).map((row:any)=><tr key={row.sizeId} className="border-b"><td className="py-2 font-bold">{row.sizeName || row.sizeId}</td>{(sizeGuide.columns || []).map((column:any)=><td key={column.key}>{row.values?.[column.key] || '—'}</td>)}</tr>)}</tbody></table>
                <p className="text-xs text-neutral-500 mt-4">{sizeGuide.instructions}</p>
              </> : <p className="text-sm text-neutral-500">No size guide is assigned to this product.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProductDetailWrapper() {
  const searchParams = useSearchParams();
  const productId = Number(searchParams.get('id') || '1');
  return <ProductDetailContent key={productId} productId={productId} />;
}

export default function ProductDetail() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-neutral-500">Loading product details...</div>}>
      <ProductDetailWrapper />
    </Suspense>
  );
}
