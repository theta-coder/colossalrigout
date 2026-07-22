'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCart, Order } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { Lock, CheckCircle2, User } from 'lucide-react';
import { formatPkr } from '../../lib/utils';
import { defaultShippingSettings, ShippingPolicySettings } from '../../lib/shipping-policy';
import CheckoutSkeleton from '@/components/checkout/CheckoutSkeleton';

export default function Checkout() {
  const { cart, promoDiscount, placeOrder, isLoaded } = useCart();
  const { currentUser } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Form Fields State
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [shippingSettings, setShippingSettings] = useState<ShippingPolicySettings>(defaultShippingSettings);

  // Completed Placed Order Details
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);

  // Auto-fill account details (name, email) & saved device shipping info
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedInfo = localStorage.getItem('cr_saved_checkout_info');
        if (savedInfo) {
          const parsed = JSON.parse(savedInfo);
          if (parsed.name) setName(parsed.name);
          if (parsed.email) setEmail(parsed.email);
          if (parsed.address) setAddress(parsed.address);
          if (parsed.city) setCity(parsed.city);
          if (parsed.phone) setPhone(parsed.phone);
        }
      } catch (e) {
        console.error("Error reading saved checkout info:", e);
      }
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      if (currentUser.name) setName((prev) => prev || currentUser.name);
      if (currentUser.email) setEmail((prev) => prev || currentUser.email);
    }
  }, [currentUser]);

  useEffect(() => {
    fetch('/api/shipping-policy')
      .then((res) => res.json())
      .then((payload) => {
        if (payload.success && payload.data) {
          setShippingSettings(payload.data);
        }
      })
      .catch(() => setShippingSettings(defaultShippingSettings));
  }, []);

  useEffect(() => {
    // Scroll to top on order placement
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [placedOrder]);

  // Computations
  const subtotal = cart.reduce((acc, item) => acc + item.price * item.qty, 0);
  const freeThreshold = shippingSettings.freeShippingEnabled ? Number(shippingSettings.freeShippingThreshold || 0) : 0;
  const qualifiesForFreeShipping = subtotal === 0 || (freeThreshold > 0 && subtotal >= freeThreshold);
  const finalShipCost = qualifiesForFreeShipping ? 0 : shippingSettings.flatRateEnabled ? Number(shippingSettings.flatRate || 0) : 0;
  const discount = subtotal * promoDiscount;
  const total = Math.max(subtotal + finalShipCost - discount, 0);

  const handlePlaceOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(
          'cr_saved_checkout_info',
          JSON.stringify({ name, email, address, city, phone })
        );
      }
      const order = await placeOrder({ name, address, city, phone, email }, finalShipCost, 'Cash on Delivery');
      setPlacedOrder(order);
    } catch (error: any) {
      alert(error.message || 'Checkout failed because inventory changed.');
    }
  };

  // If already confirmed order, display CONFIRMATION VIEW
  if (placedOrder) {
    return (
      <section className="max-w-2xl mx-auto px-4 py-16 sm:py-24 text-center animate-fade-up" id="order-confirmed-section">
        <div className="w-16 h-16 rounded-full bg-black text-white flex items-center justify-center mx-auto shadow-lg">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold mt-6 text-neutral-900 tracking-wide">
          ORDER CONFIRMED
        </h1>
        <p className="text-neutral-500 text-sm mt-2 font-light">
          Thank you! Your order has been placed successfully.
        </p>

        <div className="mt-8 bg-white border border-neutral-200 rounded-md p-6 text-left shadow-sm">
          <div className="flex justify-between border-b border-neutral-100 pb-4 mb-4">
            <div>
              <p className="text-xs text-neutral-400 font-semibold tracking-wider">ORDER NUMBER</p>
              <p className="font-display text-lg font-bold mt-1 text-neutral-900">{placedOrder.orderId}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-neutral-400 font-semibold tracking-wider">ESTIMATED DELIVERY</p>
              <p className="font-bold mt-1 text-neutral-900">{placedOrder.delivery}</p>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-neutral-500">Total Paid</span>
              <span className="font-bold text-neutral-900">{formatPkr(placedOrder.total)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Payment Method</span>
              <span className="font-semibold text-neutral-900">{placedOrder.payMethod}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Customer Name</span>
              <span className="font-semibold text-neutral-900">{placedOrder.customer.name}</span>
            </div>
          </div>
        </div>

        <p className="text-neutral-400 text-[11px] mt-6 leading-relaxed font-light">
          Your confirmation notification has been queued for {placedOrder.customer.email}. You can track your order status anytime using the button below.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            id="track-order-btn"
            href={`/track-order?order=${placedOrder.publicTrackingId || placedOrder.orderId}`}
            className="bg-black text-white text-sm font-bold px-6 py-3 rounded-md hover:bg-neutral-800 transition active:scale-95 shadow"
          >
            TRACK MY ORDER
          </Link>
          <Link
            id="continue-shopping-btn"
            href="/shop"
            className="border border-black text-sm font-bold px-6 py-3 rounded-md hover:bg-black hover:text-white transition active:scale-95 bg-white"
          >
            CONTINUE SHOPPING
          </Link>
        </div>
      </section>
    );
  }

  if (!mounted || !isLoaded) {
    return <CheckoutSkeleton />;
  }

  // If no items in cart on checkout mount, redirect to cart page
  if (cart.length === 0) {
    return (
      <div className="max-w-md mx-auto text-center py-20 px-4" id="empty-checkout-fallback">
        <p className="text-neutral-500 font-medium">Your cart is empty. Please add items before checking out.</p>
        <Link href="/shop" className="mt-4 inline-block bg-black text-white text-xs font-semibold px-6 py-2.5 rounded hover:bg-neutral-800">
          SHOP THE CATALOG
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 pb-16" id="checkout-container">
      {/* HEADER SECTION FOR SECURE */}
      <div className="pt-6 pb-2 flex items-center justify-between border-b border-neutral-200/50 mb-8" id="checkout-header">
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-wide">CHECKOUT</h1>
        <div className="flex items-center gap-2 text-xs sm:text-sm text-neutral-500 font-semibold bg-white border border-neutral-200 rounded-full px-3.5 py-1.5 shadow-sm">
          <Lock className="w-4 h-4 text-green-600" />
          <span>Secure Connection</span>
        </div>
      </div>

      {/* CHECKOUT SPLIT GRID */}
      <div className="flex flex-col lg:flex-row gap-8 items-start w-full">
        {/* LEFT COLUMN: UNIFIED CHECKOUT FORM */}
        <div className="flex-1 w-full bg-white rounded-md border border-neutral-200 p-5 sm:p-7 shadow-sm" id="checkout-form-container">
          <form id="checkout-form" onSubmit={handlePlaceOrderSubmit} className="space-y-8 animate-fade-up">
            {/* SECTION 1: SHIPPING INFO */}
            <div id="shipping-info-section">
              <h2 className="font-display text-lg font-bold text-neutral-900 mb-1">1. Shipping Information</h2>
              <p className="text-neutral-500 text-xs mb-5 font-light">Where should we deliver your order?</p>

              {!currentUser && (
                <div className="mb-5 p-3.5 bg-neutral-100/90 border border-neutral-200/80 rounded-md text-xs text-neutral-600 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-neutral-500 flex-none" />
                    <span>Want to track your order history and save details?</span>
                  </div>
                  <Link
                    href={`/login?redirect=${encodeURIComponent('/checkout')}`}
                    className="text-black font-bold underline hover:text-neutral-700 text-[11px] uppercase tracking-wider"
                  >
                    Sign In / Register Account
                  </Link>
                </div>
              )}
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-neutral-600">FULL NAME</label>
                  <input
                    id="checkout-name"
                    required
                    type="text"
                    readOnly={Boolean(currentUser)}
                    placeholder="Ali Ahmed"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={`mt-1.5 w-full border rounded-md px-3 py-2.5 text-sm outline-none transition ${
                      currentUser
                        ? 'bg-neutral-100/90 text-neutral-600 font-medium border-neutral-200 cursor-not-allowed'
                        : 'bg-[#f4f4f3] focus:border-black text-neutral-800 border-neutral-300'
                    }`}
                  />
                  {currentUser && (
                    <div className="mt-1 flex items-center justify-between text-[11px] text-neutral-500">
                      <span>Locked to logged-in account name</span>
                      <Link href="/login" className="text-black font-semibold underline hover:text-neutral-700">
                        Switch Account
                      </Link>
                    </div>
                  )}
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-neutral-600">SHIPPING ADDRESS</label>
                  <input
                    id="checkout-address"
                    required
                    type="text"
                    placeholder="House 12, Street 4, Model Town"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="mt-1.5 w-full border border-neutral-300 rounded-md px-3 py-2.5 text-sm outline-none focus:border-black bg-[#f4f4f3] transition text-neutral-800"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-neutral-600 block">CITY</label>
                  <input
                    id="checkout-city"
                    required
                    type="text"
                    placeholder="Lahore"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="mt-1.5 w-full border border-neutral-300 rounded-md px-3 py-2.5 text-sm outline-none focus:border-black bg-[#f4f4f3] transition text-neutral-800"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-neutral-600 block">PHONE</label>
                  <input
                    id="checkout-phone"
                    required
                    type="tel"
                    placeholder="0300-1234567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="mt-1.5 w-full border border-neutral-300 rounded-md px-3 py-2.5 text-sm outline-none focus:border-black bg-[#f4f4f3] transition text-neutral-800"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-neutral-600 block">EMAIL ADDRESS</label>
                  <input
                    id="checkout-email"
                    required
                    type="email"
                    readOnly={Boolean(currentUser)}
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`mt-1.5 w-full border rounded-md px-3 py-2.5 text-sm outline-none transition ${
                      currentUser
                        ? 'bg-neutral-100/90 text-neutral-600 font-medium border-neutral-200 cursor-not-allowed'
                        : 'bg-[#f4f4f3] focus:border-black text-neutral-800 border-neutral-300'
                    }`}
                  />
                  {currentUser && (
                    <div className="mt-1 flex items-center justify-between text-[11px] text-neutral-500">
                      <span>Locked to logged-in account email</span>
                      <Link href="/login" className="text-black font-semibold underline hover:text-neutral-700">
                        Switch Account
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* SECTION 2: PAYMENT TYPE */}
            <div className="border-t border-neutral-100 pt-6" id="payment-method-section">
              <h2 className="font-display text-lg font-bold text-neutral-900 mb-1">2. Payment Method</h2>
              <p className="text-neutral-500 text-xs mb-4 font-light">We currently support Cash on Delivery for maximum convenience.</p>
              
              <div className="border border-neutral-200 bg-[#f4f4f3] rounded-md px-4 py-4 flex items-start gap-3" id="cod-payment-badge">
                <div className="w-5 h-5 mt-0.5 rounded-full bg-black flex items-center justify-center text-white text-[10px] font-bold flex-none">✓</div>
                <div>
                  <span className="text-xs sm:text-sm font-bold text-neutral-900 block">Cash on Delivery (COD)</span>
                  <span className="text-[10px] sm:text-xs text-neutral-500">Pay with cash when your package is delivered to your doorstep. No prepayment required.</span>
                </div>
              </div>
            </div>

            {/* SUBMIT BUTTON AT BOTTOM OF FORM FOR MOBILE */}
            <div className="pt-4 block lg:hidden">
              <button
                id="checkout-submit-mobile"
                type="submit"
                className="w-full bg-black text-white text-sm font-bold py-4 rounded hover:bg-[#1a1a1a] transition active:scale-95 shadow flex items-center justify-center gap-2 cursor-pointer"
              >
                PLACE ORDER ({formatPkr(total)})
              </button>
            </div>
          </form>
        </div>

        {/* RIGHT COLUMN: ORDER SUMMARY SIDEBAR */}
        <div className="w-full lg:w-80 flex-none bg-white rounded-md border border-neutral-200 p-5 sm:p-6 lg:sticky lg:top-24 shadow-sm" id="order-summary-sidebar">
          <h2 className="font-display text-lg font-bold mb-4 text-neutral-900 tracking-wide">ORDER SUMMARY</h2>

          <div className="space-y-4 max-h-64 overflow-y-auto pr-1 border-b border-neutral-100 pb-4">
            {cart.map((item, idx) => (
              <div key={idx} className="flex gap-3 text-xs" id={`summary-item-${item.id}`}>
                <div className="relative w-12 h-14 rounded-md overflow-hidden bg-neutral-100 flex-none border border-neutral-100 shadow-sm">
                  <Image
                    src={item.img}
                    alt={item.name}
                    fill
                    referrerPolicy="no-referrer"
                    className="object-cover"
                  />
                  <span className="absolute -top-1.5 -right-1.5 bg-black text-white text-[9px] w-4.5 h-4.5 rounded-full flex items-center justify-center font-bold">
                    {item.qty}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-neutral-900 leading-tight">{item.name}</p>
                  <p className="text-[10px] text-neutral-500 font-medium mt-0.5">
                    {item.size} &middot; {item.color}
                  </p>
                </div>
                <span className="font-bold text-neutral-800">{formatPkr(item.price * item.qty)}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between font-light">
              <span className="text-neutral-500">Subtotal</span>
              <span className="font-semibold text-neutral-800">{formatPkr(subtotal)}</span>
            </div>
            <div className="flex justify-between font-light">
              <span className="text-neutral-500">Shipping</span>
              <span className="font-semibold text-neutral-800">
                {finalShipCost === 0 ? 'FREE' : formatPkr(finalShipCost)}
              </span>
            </div>
            {promoDiscount > 0 && (
              <div className="flex justify-between text-green-700 font-bold text-xs">
                <span>Discount</span>
                <span>&minus;{formatPkr(discount)}</span>
              </div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-neutral-200 flex justify-between items-baseline">
            <span className="font-bold text-neutral-900">Total</span>
            <span className="font-display text-xl font-extrabold text-neutral-900">{formatPkr(total)}</span>
          </div>

          {/* SIDEBAR PLACE ORDER BUTTON FOR DESKTOP */}
          <div className="mt-6 hidden lg:block">
            <button
              id="checkout-submit-desktop"
              type="submit"
              form="checkout-form"
              className="w-full bg-black text-white text-xs font-bold py-4 rounded hover:bg-[#1a1a1a] transition active:scale-95 shadow flex items-center justify-center gap-2 cursor-pointer"
            >
              PLACE ORDER ({formatPkr(total)})
            </button>
          </div>

          <div className="mt-5 pt-4 border-t border-neutral-200 flex items-center justify-center gap-2 text-neutral-400 font-medium">
            <span className="border border-neutral-200 rounded px-2.5 py-1 text-[11px] bg-[#f4f4f3] font-bold text-neutral-700">Cash on Delivery</span>
          </div>
        </div>
      </div>
    </div>
  );
}
