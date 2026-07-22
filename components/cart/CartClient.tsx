'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import CartLineItem from './CartLineItem';
import CartOrderSummary from './CartOrderSummary';
import CartRecommendations from './CartRecommendations';
import FreeShippingProgress from './FreeShippingProgress';
import CartSkeleton from './CartSkeleton';
import { ShoppingBag, ArrowLeft, RefreshCw, AlertCircle } from 'lucide-react';
import { CartQuoteResult } from '@/lib/server/commerce-pricing';

export default function CartClient() {
  const { cart, changeQty, removeFromCart, isLoaded } = useCart();
  const [mounted, setMounted] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [quote, setQuote] = useState<CartQuoteResult | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchQuote = useCallback(
    async (codeToApply?: string | null) => {
      if (cart.length === 0) {
        setQuote(null);
        return;
      }

      setQuoting(true);
      setErrorMsg(null);

      try {
        const payloadItems = cart.map((item) => ({
          variantId: item.variantId || `${item.id}_${item.color}_${item.size}`,
          productId: String(item.id),
          colorName: item.color,
          sizeName: item.size,
          qty: item.qty,
        }));

        const res = await fetch('/api/cart/quote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: payloadItems,
            couponCode: codeToApply !== undefined ? codeToApply : couponCode,
          }),
        });

        const data = await res.json();
        if (data.success && data.data) {
          setQuote(data.data);
        } else {
          setErrorMsg(data.error || 'Failed to retrieve authoritative cart quote.');
        }
      } catch (err: any) {
        console.error('[CartClient] Quote Error:', err);
        setErrorMsg(err?.message || 'Error connecting to server pricing engine.');
      } finally {
        setQuoting(false);
      }
    },
    [cart, couponCode]
  );

  useEffect(() => {
    fetchQuote();
  }, [cart]);

  const handleChangeQty = (variantId: string, delta: number) => {
    const target = cart.find(
      (item) => (item.variantId || `${item.id}_${item.color}_${item.size}`) === variantId
    );
    if (target) {
      changeQty(target.id, target.size, target.color, delta);
    }
  };

  const handleRemoveItem = (variantId: string) => {
    const target = cart.find(
      (item) => (item.variantId || `${item.id}_${item.color}_${item.size}`) === variantId
    );
    if (target) {
      removeFromCart(target.id, target.size, target.color);
    }
  };

  const handleApplyCoupon = async (code: string) => {
    if (quote && quote.appliedPromotions.length > 0) {
      setQuote((prev) =>
        prev
          ? {
              ...prev,
              couponStatus: {
                code,
                valid: false,
                message: 'An offer has already been applied. Only one promotion can be used at a time.',
              },
            }
          : null
      );
      return;
    }
    setCouponCode(code);
    await fetchQuote(code);
  };

  const handleRemoveCoupon = () => {
    setCouponCode('');
    fetchQuote('');
  };

  const excludeProductIds = useMemo(() => {
    return Array.from(new Set(cart.map((item) => String(item.id))));
  }, [cart]);

  if (!mounted || !isLoaded) {
    return <CartSkeleton />;
  }

  if (cart.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 pb-20 pt-6">
        {/* Breadcrumb */}
        <div className="py-4 text-xs sm:text-sm text-neutral-500">
          <Link href="/" className="hover:text-black">
            Home
          </Link>{' '}
          <span className="mx-1">/</span>{' '}
          <span className="text-neutral-900 font-medium">Shopping Cart</span>
        </div>

        <div className="flex flex-col items-center justify-center text-center py-20 bg-white border border-neutral-200 rounded-3xl p-8 shadow-xs max-w-2xl mx-auto space-y-4">
          <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-400">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <h2 className="font-display text-2xl font-extrabold text-neutral-900 tracking-tight">
            YOUR CART IS EMPTY
          </h2>
          <p className="text-neutral-500 text-xs sm:text-sm max-w-sm">
            Looks like you haven&apos;t added any items to your bag yet. Discover our latest dynamic luxury collections!
          </p>
          <Link
            href="/shop"
            className="mt-4 bg-black text-white text-xs font-extrabold px-8 py-3.5 rounded-xl hover:bg-neutral-800 transition shadow-md uppercase tracking-wider active:scale-95 cursor-pointer"
          >
            CONTINUE SHOPPING
          </Link>
        </div>

        {/* Dynamic Cart Recommendations */}
        <CartRecommendations excludeProductIds={[]} />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 pb-20 pt-6 space-y-8">
      {/* Breadcrumb */}
      <div className="text-xs sm:text-sm text-neutral-500">
        <Link href="/" className="hover:text-black">
          Home
        </Link>{' '}
        <span className="mx-1">/</span>{' '}
        <span className="text-neutral-900 font-medium">Shopping Cart</span>
      </div>

      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-neutral-200 pb-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 uppercase">
            YOUR SHOPPING BAG
          </h1>
          <p className="text-neutral-500 text-xs sm:text-sm mt-1">
            <span className="font-bold text-neutral-900">{cart.length}</span> item{cart.length !== 1 ? 's' : ''} in your cart
          </p>
        </div>
        <Link
          href="/shop"
          className="text-xs text-neutral-500 hover:text-black font-semibold uppercase flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" /> Continue Shopping
        </Link>
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold flex items-center justify-between">
          <span className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> {errorMsg}
          </span>
          <button
            type="button"
            onClick={() => fetchQuote()}
            className="underline font-bold hover:text-red-900 cursor-pointer"
          >
            Retry Quote
          </button>
        </div>
      )}

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Cart Lines & Free Shipping Progress */}
        <div className="lg:col-span-8 space-y-6">
          {quote && (
            <FreeShippingProgress
              subtotal={quote.subtotal}
              freeShippingThreshold={quote.freeShippingThreshold}
              remainingForFreeShipping={quote.remainingForFreeShipping}
            />
          )}

          <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs divide-y divide-neutral-100 overflow-hidden">
            <div className="bg-neutral-50 px-5 py-3 border-b border-neutral-200 flex items-center justify-between">
              <span className="font-extrabold text-xs uppercase tracking-wider text-neutral-800">
                CART ITEMS ({cart.length})
              </span>
              {quoting && (
                <span className="text-xs text-neutral-500 font-semibold flex items-center gap-1.5 animate-pulse">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-black" /> Updating PKR quote...
                </span>
              )}
            </div>

            {quote ? (
              quote.lines.map((line) => (
                <CartLineItem
                  key={line.variantId}
                  line={line}
                  onChangeQty={handleChangeQty}
                  onRemove={handleRemoveItem}
                />
              ))
            ) : (
              <div className="p-8 text-center text-xs text-neutral-400 font-semibold animate-pulse">
                Fetching authoritative pricing quote...
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Order Summary */}
        <div className="lg:col-span-4">
          {quote ? (
            <CartOrderSummary
              quote={quote}
              onApplyCoupon={handleApplyCoupon}
              onRemoveCoupon={handleRemoveCoupon}
              couponCode={couponCode}
              isQuoting={quoting}
            />
          ) : (
            <div className="h-64 bg-neutral-100 rounded-2xl animate-pulse" />
          )}
        </div>
      </div>

      {/* Dynamic Cart Recommendations */}
      <CartRecommendations excludeProductIds={excludeProductIds} />
    </div>
  );
}
