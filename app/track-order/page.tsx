'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCart, Order } from '../../context/CartContext';
import { ClipboardList, AlertCircle, ShoppingBag, Truck, Check, HelpCircle, Package, MapPin } from 'lucide-react';

const statuses = ['Placed', 'Packed', 'Shipped', 'Out for Delivery', 'Delivered'];

export default function TrackOrder() {
  const { trackOrder } = useCart();
  const [orderIdInput, setOrderIdInput] = useState('');
  const [contactInput, setContactInput] = useState('');
  const [activeOrder, setActiveOrder] = useState<Order | undefined>(undefined);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchError, setBySearchError] = useState(false);

  const handleTrackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setHasSearched(true);
    setBySearchError(false);

    try {
      const order = await trackOrder(orderIdInput);
      if (order) {
        setActiveOrder(order);
      } else {
        setActiveOrder(undefined);
        setBySearchError(true);
      }
    } catch (err) {
      console.error("Order tracking lookup failed:", err);
      setActiveOrder(undefined);
      setBySearchError(true);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Placed':
        return <ClipboardList className="w-5 h-5" />;
      case 'Packed':
        return <Package className="w-5 h-5" />;
      case 'Shipped':
        return <Truck className="w-5 h-5" />;
      case 'Out for Delivery':
        return <MapPin className="w-5 h-5" />;
      case 'Delivered':
        return <Check className="w-5 h-5" />;
      default:
        return <Package className="w-5 h-5" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 pb-16">
      {/* PAGE HEADER BANNER */}
      <section className="relative h-40 sm:h-56 md:h-64 overflow-hidden -mx-4">
        <Image
          src="https://images.unsplash.com/photo-1595246140625-573b715d11dc?auto=format&fit=crop&w=1920&q=80"
          alt="Track order banner"
          fill
          priority
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-black/50"></div>
        <div className="relative z-10 max-w-7xl mx-auto h-full flex flex-col justify-center px-4">
          <h1 className="font-display text-white text-3xl sm:text-4xl font-extrabold tracking-tight">
            TRACK YOUR ORDER
          </h1>
          <p className="text-neutral-200 text-xs sm:text-sm mt-1 font-light">
            Enter your details below to see the latest status.
          </p>
        </div>
      </section>

      {/* BREADCRUMB */}
      <div className="py-4 text-xs sm:text-sm text-neutral-500">
        <Link href="/" className="hover:text-black">Home</Link> <span className="mx-1">/</span>{' '}
        <span className="text-neutral-900 font-medium">Track Order</span>
      </div>

      {/* LOOKUP FORM */}
      <section className="max-w-2xl mx-auto pb-6 animate-fade-up">
        <div className="bg-white border border-neutral-200 rounded-md p-6 sm:p-8 shadow-sm">
          <form onSubmit={handleTrackSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-1">
              <label className="text-xs font-semibold text-neutral-600 block">ORDER ID</label>
              <input
                required
                type="text"
                placeholder="e.g. CR-482913"
                value={orderIdInput}
                onChange={(e) => setOrderIdInput(e.target.value)}
                className="mt-1.5 w-full border border-neutral-300 rounded-md px-3 py-2.5 text-sm outline-none focus:border-black bg-[#f4f4f3] transition text-neutral-800"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-neutral-600 block">EMAIL OR PHONE</label>
              <input
                required
                type="text"
                placeholder="you@example.com"
                value={contactInput}
                onChange={(e) => setContactInput(e.target.value)}
                className="mt-1.5 w-full border border-neutral-300 rounded-md px-3 py-2.5 text-sm outline-none focus:border-black bg-[#f4f4f3] transition text-neutral-800"
              />
            </div>
            <div className="sm:col-span-2 mt-1">
              <button
                type="submit"
                className="w-full bg-black text-white text-sm font-semibold py-3 rounded-md hover:bg-neutral-800 transition active:scale-95"
              >
                TRACK ORDER
              </button>
            </div>
            {searchError && (
              <p className="sm:col-span-2 text-xs text-red-600 font-medium flex items-center gap-1.5 mt-1 animate-pulse">
                <AlertCircle className="w-4 h-4" /> We couldn&apos;t find an order with those details. Please double-check your Order ID (e.g., try CR-482913) and try again.
              </p>
            )}
          </form>
        </div>
      </section>

      {/* RESULTS DISPLAY */}
      {activeOrder && (
        <section className="max-w-3xl mx-auto pb-16 animate-fade-up">
          <div className="bg-white border border-neutral-200 rounded-md p-6 sm:p-8 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-6 border-b border-neutral-200">
              <div>
                <p className="text-xs text-neutral-400 font-semibold tracking-wider">ORDER</p>
                <p className="font-display text-lg font-bold text-neutral-900">{activeOrder.orderId}</p>
              </div>
              <div className="sm:text-right">
                <p className="text-xs text-neutral-400 font-semibold tracking-wider">CURRENT STATUS</p>
                <p className="font-bold text-sm text-neutral-900 mt-0.5">{statuses[activeOrder.statusIndex]}</p>
              </div>
              <div className="sm:text-right">
                <p className="text-xs text-neutral-400 font-semibold tracking-wider">ESTIMATED DELIVERY</p>
                <p className="font-bold text-sm text-neutral-900 mt-0.5">{activeOrder.delivery}</p>
              </div>
            </div>

            {/* STATUS TIMELINE */}
            <div className="pt-8 pb-4">
              {/* Mobile Timeline: Vertical */}
              <div className="flex flex-col sm:hidden gap-0">
                {statuses.map((s, idx) => {
                  const isDone = idx < activeOrder.statusIndex;
                  const isCurrent = idx === activeOrder.statusIndex;
                  const isLast = idx === statuses.length - 1;

                  return (
                    <div key={idx} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-9 h-9 rounded-full border-2 flex items-center justify-center flex-none transition duration-300 ${
                            isDone || isCurrent
                              ? 'bg-black border-black text-white'
                              : 'border-neutral-300 text-neutral-400 bg-white'
                          } ${isCurrent ? 'ring-4 ring-neutral-200 shadow-sm' : ''}`}
                        >
                          {getStatusIcon(s)}
                        </div>
                        {!isLast && (
                          <div
                            className={`w-0.5 flex-grow my-1 min-h-[32px] ${
                              isDone ? 'bg-black' : 'bg-neutral-200'
                            }`}
                          />
                        )}
                      </div>
                      <div className="pb-8">
                        <p
                          className={`text-sm font-semibold ${
                            isDone || isCurrent ? 'text-neutral-900' : 'text-neutral-400'
                          }`}
                        >
                          {s}
                        </p>
                        <p className="text-xs text-neutral-400 mt-0.5">
                          {isCurrent ? 'Current status' : isDone ? 'Completed' : 'Pending'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Timeline: Horizontal */}
              <div className="hidden sm:flex items-start w-full">
                {statuses.map((s, idx) => {
                  const isDone = idx < activeOrder.statusIndex;
                  const isCurrent = idx === activeOrder.statusIndex;
                  const isLast = idx === statuses.length - 1;

                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center relative">
                      <div className="flex items-center w-full">
                        {/* Line leading into the dot */}
                        <div
                          className={`flex-1 h-0.5 ${
                            idx === 0 ? 'invisible' : idx - 1 < activeOrder.statusIndex ? 'bg-black' : 'bg-neutral-200'
                          }`}
                        />
                        {/* Dot */}
                        <div
                          className={`w-10 h-10 rounded-full border-2 flex items-center justify-center flex-none transition duration-300 ${
                            isDone || isCurrent
                              ? 'bg-black border-black text-white'
                              : 'border-neutral-300 text-neutral-400 bg-white'
                          } ${isCurrent ? 'ring-4 ring-neutral-200 shadow-sm' : ''}`}
                        >
                          {getStatusIcon(s)}
                        </div>
                        {/* Line leading away from the dot */}
                        <div
                          className={`flex-1 h-0.5 ${
                            isLast ? 'invisible' : isDone ? 'bg-black' : 'bg-neutral-200'
                          }`}
                        />
                      </div>
                      <p
                        className={`text-xs font-semibold mt-2.5 text-center ${
                          isDone || isCurrent ? 'text-neutral-900 font-bold' : 'text-neutral-400'
                        }`}
                      >
                        {s}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ORDER ITEMS RECAP */}
            <div className="mt-8 pt-6 border-t border-neutral-200">
              <p className="text-xs font-semibold text-neutral-600 uppercase mb-3 tracking-wider flex items-center gap-1.5">
                <ShoppingBag className="w-4 h-4 text-neutral-800" /> Items in this Order
              </p>
              <div className="space-y-3">
                {activeOrder.items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm py-2">
                    <div className="flex items-center gap-3">
                      <div className="relative w-10 h-12 rounded bg-neutral-100 overflow-hidden flex-none">
                        <Image
                          src={item.img}
                          alt={item.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div>
                        <p className="font-semibold text-neutral-900">{item.name}</p>
                        <p className="text-xs text-neutral-500 font-light">
                          {item.size} &middot; {item.color} &middot; Qty: {item.qty}
                        </p>
                      </div>
                    </div>
                    <span className="font-bold text-neutral-800">${(item.price * item.qty).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-neutral-200 flex flex-col sm:flex-row gap-3">
              <Link
                href="/shop"
                className="flex-1 text-center border border-black text-sm font-semibold px-6 py-3 rounded-md hover:bg-black hover:text-white transition active:scale-95 bg-white"
              >
                CONTINUE SHOPPING
              </Link>
              <Link
                href="/contact"
                className="flex-1 text-center bg-black text-white text-sm font-semibold px-6 py-3 rounded-md hover:bg-neutral-800 transition active:scale-95"
              >
                NEED HELP? CONTACT US
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
