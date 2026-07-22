'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Trash2, Tag, X, Loader2 } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { formatPkr } from '@/lib/utils';
import { Product } from '@/lib/products';
import { ColorDocument } from '@/types/commerce';
import RelatedProducts from '@/components/product/RelatedProducts';
import CartSkeleton from '@/components/cart/CartSkeleton';
import { defaultShippingSettings, ShippingPolicySettings } from '@/lib/shipping-policy';

export default function CartPage() {
  const {
    cart, changeQty, removeFromCart, promoCodeApplied, promoDiscountAmount, quotedSubtotal, quotedItems,
    appliedPromotions, applyPromo, removePromo, isLoaded,
  } = useCart();
  const [mounted, setMounted] = useState(false);
  const [promoInput, setPromoInput] = useState('');
  const [promoMessage, setPromoMessage] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);
  const [applyingPromo, setApplyingPromo] = useState(false);
  const [shippingSettings, setShippingSettings] = useState<ShippingPolicySettings>(defaultShippingSettings);
  const [recommendations, setRecommendations] = useState<Product[]>([]);
  const [colors, setColors] = useState<ColorDocument[]>([]);
  const [recommendationsLoading, setRecommendationsLoading] = useState(true);

  const totalQty = cart.reduce((total, item) => total + item.qty, 0);
  const subtotal = cart.reduce((total, item) => total + item.price * item.qty, 0);
  const freeThreshold = shippingSettings.freeShippingEnabled ? Number(shippingSettings.freeShippingThreshold || 0) : 0;
  const qualifiesForFreeShipping = subtotal === 0 || (freeThreshold > 0 && subtotal >= freeThreshold);
  const shipping = qualifiesForFreeShipping ? 0 : shippingSettings.flatRateEnabled ? Number(shippingSettings.flatRate || 0) : 0;
  const discountedSubtotal = quotedSubtotal === null ? Math.max(0, subtotal - promoDiscountAmount) : quotedSubtotal;
  const total = Math.max(0, discountedSubtotal + shipping);
  const remainingForFreeShipping = Math.max(0, freeThreshold - subtotal);

  const colorsById = useMemo(() => new Map(colors.map((color) => [color.id, color])), [colors]);
  const displayCart = useMemo(() => cart.map((item) => quotedItems.find((quoted) => quoted.variantId && quoted.variantId === item.variantId) || item), [cart, quotedItems]);

  useEffect(() => {
    fetch('/api/shipping-policy')
      .then((response) => response.json())
      .then((payload) => payload.success && payload.data?.settings && setShippingSettings({ ...defaultShippingSettings, ...payload.data.settings }))
      .catch(() => setShippingSettings(defaultShippingSettings));
  }, []);

  useEffect(() => {
    const excluded = cart.map((item) => item.id).join(',');
    setRecommendationsLoading(true);
    Promise.all([
      fetch(`/api/cart/recommendations?exclude=${encodeURIComponent(excluded)}&limit=4`).then((response) => response.json()),
      fetch('/api/colors').then((response) => response.json()),
    ])
      .then(([productsPayload, colorsPayload]) => {
        setRecommendations(Array.isArray(productsPayload.products) ? productsPayload.products.filter((product: Product) => Number(product.totalStock || 0) > 0) : []);
        setColors(Array.isArray(colorsPayload.colors) ? colorsPayload.colors : []);
      })
      .catch(() => { setRecommendations([]); setColors([]); })
      .finally(() => setRecommendationsLoading(false));
  }, [cart.map((item) => item.id).join(',')]);

  const handleApplyPromo = async () => {
    setApplyingPromo(true);
    const result = await applyPromo(promoInput);
    setPromoMessage(result.message);
    if (result.success) setPromoInput('');
    setApplyingPromo(false);
  };

  if (!mounted || !isLoaded) {
    return <CartSkeleton />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 pb-16">
      <div className="py-4 text-xs sm:text-sm text-neutral-500">
        <Link href="/" className="hover:text-black">Home</Link> <span className="mx-1">/</span>
        <span className="text-neutral-900 font-medium">Shopping Cart</span>
      </div>

      <div className="pb-4">
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-neutral-900">YOUR CART</h1>
        <p className="text-neutral-500 text-xs sm:text-sm mt-1"><strong className="text-black">{totalQty}</strong> item{totalQty !== 1 ? 's' : ''} in your bag</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        <div className="flex-1 w-full bg-white rounded-lg border border-neutral-200 divide-y shadow-sm">
          {cart.length === 0 ? (
            <div className="text-center py-20 px-6">
              <Trash2 className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
              <h2 className="font-display text-xl font-bold">Your cart is empty</h2>
              <Link href="/shop" className="inline-block mt-6 bg-black text-white text-xs font-bold px-6 py-3 rounded-md">CONTINUE SHOPPING</Link>
            </div>
          ) : displayCart.map((item) => {
            const stock = Number(item.availableStock ?? Number.MAX_SAFE_INTEGER);
            return (
              <div key={item.variantId || `${item.id}-${item.size}-${item.color}`} className="flex gap-4 p-4 sm:p-5">
                <Link href={item.slug ? `/product/${item.slug}` : `/product?id=${item.id}`} className="relative w-20 h-24 sm:w-24 sm:h-28 flex-none rounded-md overflow-hidden bg-neutral-100 border">
                  <Image src={item.img || '/product-placeholder.png'} alt={`${item.name} in ${item.color}`} fill className="object-cover" sizes="96px" />
                </Link>
                <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                  <div>
                    <Link href={item.slug ? `/product/${item.slug}` : `/product?id=${item.id}`} className="font-semibold text-sm sm:text-base hover:underline">{item.name}</Link>
                    <p className="text-xs text-neutral-500 mt-1">Size: <strong>{item.size}</strong> · Color: <strong>{item.color}</strong></p>
                    <p className="text-sm font-bold mt-2 sm:hidden">{formatPkr(item.price * item.qty)}</p>
                    {stock <= item.qty && stock !== Number.MAX_SAFE_INTEGER && <p className="text-[10px] text-amber-700 mt-1">Maximum available quantity: {stock}</p>}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center border border-neutral-300 rounded bg-white">
                      <button aria-label={`Decrease ${item.name} quantity`} onClick={() => changeQty(item.id, item.size, item.color, -1)} disabled={item.qty <= 1} className="w-8 h-8 disabled:opacity-30">−</button>
                      <span className="w-8 text-center text-xs font-bold">{item.qty}</span>
                      <button aria-label={`Increase ${item.name} quantity`} onClick={() => changeQty(item.id, item.size, item.color, 1)} disabled={item.qty >= stock} className="w-8 h-8 disabled:opacity-30">+</button>
                    </div>
                    <p className="hidden sm:block min-w-24 text-right font-bold text-sm">{formatPkr(item.price * item.qty)}</p>
                    <button aria-label={`Remove ${item.name}`} onClick={() => removeFromCart(item.id, item.size, item.color)} className="p-2 text-neutral-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {cart.length > 0 && (
          <aside className="w-full lg:w-96 bg-white rounded-lg border border-neutral-200 p-5 sm:p-6 lg:sticky lg:top-24 shadow-sm">
            <h2 className="font-display text-lg font-bold mb-4">ORDER SUMMARY</h2>
            <div className="space-y-3 text-sm pb-4 border-b">
              <div className="flex justify-between"><span className="text-neutral-500">Subtotal</span><strong>{formatPkr(subtotal)}</strong></div>
              <div className="flex justify-between"><span className="text-neutral-500">Shipping estimate</span><strong>{shipping === 0 ? 'FREE' : formatPkr(shipping)}</strong></div>
              {freeThreshold > 0 && remainingForFreeShipping > 0 && <p className="text-[10px] text-neutral-500">Add {formatPkr(remainingForFreeShipping)} more for free shipping.</p>}
              {appliedPromotions.map((promotion) => (
                <div key={promotion.id} className="bg-emerald-50 border border-emerald-100 rounded-lg p-2.5 text-emerald-800">
                  <div className="flex justify-between gap-3 font-semibold text-xs"><span className="flex gap-1"><Tag className="w-3.5 h-3.5" />{promotion.name}</span><span>−{formatPkr(promotion.discountAmount)}</span></div>
                  <p className="text-[10px] mt-1">{promotion.mode === 'coupon' ? `Coupon ${promotion.code}` : 'Automatic promotion'} · {promotion.discountType === 'percentage' ? `${promotion.discountValue}% off` : promotion.discountType === 'fixed' ? `${formatPkr(promotion.discountValue)} off` : 'Free shipping'}</p>
                  {promotion.minimumOrder > 0 && <p className="text-[10px]">Minimum order: {formatPkr(promotion.minimumOrder)}</p>}
                </div>
              ))}
              {promoCodeApplied && <button type="button" onClick={removePromo} className="text-[10px] text-red-600 flex items-center gap-1"><X className="w-3 h-3" />Remove coupon {promoCodeApplied}</button>}
            </div>

            <div className="mt-4 pb-4 border-b">
              <label className="text-[10px] font-bold text-neutral-500">PROMO CODE</label>
              <div className="mt-1.5 flex gap-2">
                <input value={promoInput} onChange={(event) => setPromoInput(event.target.value.toUpperCase())} placeholder="e.g. WELCOME10" className="min-w-0 flex-1 border rounded px-3 py-2 text-xs" />
                <button onClick={handleApplyPromo} disabled={applyingPromo || !promoInput.trim()} className="border border-black text-xs font-bold px-4 rounded disabled:opacity-40">{applyingPromo ? <Loader2 className="w-4 h-4 animate-spin" /> : 'APPLY'}</button>
              </div>
              {promoMessage && (
                <p className={`text-[11px] font-semibold mt-2 ${promoMessage.toLowerCase().includes('successfully') ? 'text-emerald-700' : 'text-red-600'}`}>
                  {promoMessage}
                </p>
              )}
            </div>

            <div className="py-4 flex justify-between items-baseline"><strong>Total</strong><strong className="font-display text-2xl">{formatPkr(total)}</strong></div>
            <Link href="/checkout" className="block w-full text-center bg-black text-white text-xs font-bold py-3.5 rounded-md">PROCEED TO CHECKOUT</Link>
            <Link href="/shop" className="block text-center text-xs mt-3.5 text-neutral-500 hover:text-black">← Continue Shopping</Link>
          </aside>
        )}
      </div>

      {recommendationsLoading ? <div className="mt-16 text-center text-xs text-neutral-500">Loading best sellers…</div> : recommendations.length > 0 && (
        <div className="mt-16"><RelatedProducts products={recommendations} colorsById={colorsById} title="BEST SELLERS" /></div>
      )}
    </div>
  );
}
