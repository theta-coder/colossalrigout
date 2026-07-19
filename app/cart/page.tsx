'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCart, CartItem } from '../../context/CartContext';
import { Trash2, Heart, ArrowLeft, ArrowRight, Tag, HelpCircle, AlertCircle } from 'lucide-react';

interface RelatedProduct {
  name: string;
  price: string;
  img: string;
  colors: string[];
}

export default function Cart() {
  const { cart, changeQty, removeFromCart, promoDiscount, promoCodeApplied, applyPromo } = useCart();
  const [promoInput, setPromoInput] = useState('');
  const [promoMsg, setPromoMsg] = useState('');
  const [promoMsgClass, setPromoMsgClass] = useState('text-neutral-500');

  const SHIPPING_FLAT = 5.00;
  const FREE_SHIP_THRESHOLD = 75;

  const totalQty = cart.reduce((acc, item) => acc + item.qty, 0);
  const subtotal = cart.reduce((acc, item) => acc + item.price * item.qty, 0);
  const shipping = subtotal >= FREE_SHIP_THRESHOLD || subtotal === 0 ? 0 : SHIPPING_FLAT;
  const discount = subtotal * promoDiscount;
  const total = Math.max(subtotal + shipping - discount, 0);

  const handleApplyPromo = async () => {
    const result = await applyPromo(promoInput);
    setPromoMsg(result.message);
    if (result.success) {
      setPromoMsgClass('text-green-700 font-semibold');
    } else {
      setPromoMsgClass('text-red-600 font-medium');
    }
  };

  const relatedSuggestions: RelatedProduct[] = [
    { name: 'Ribbed Knit Top', price: '$29.90', img: 'https://images.unsplash.com/photo-1552374196-c4e7ffc6e126?auto=format&fit=crop&w=400&q=80', colors: ['bg-stone-300', 'bg-black', 'bg-rose-200'] },
    { name: 'Linen Blend Shirt', price: '$34.90', img: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=400&q=80', colors: ['bg-black', 'bg-stone-300'] },
    { name: 'Oversized Sweater', price: '$39.90', img: 'https://images.unsplash.com/photo-1560243563-062bfc001d68?auto=format&fit=crop&w=400&q=80', colors: ['bg-blue-900', 'bg-black', 'bg-stone-200'] },
    { name: 'Shoulder Bag', price: '$24.90', img: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=400&q=80', colors: ['bg-amber-800', 'bg-black', 'bg-stone-300'] },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 pb-16">
      {/* BREADCRUMB */}
      <div className="py-4 text-xs sm:text-sm text-neutral-500">
        <Link href="/" className="hover:text-black">Home</Link> <span className="mx-1">/</span>{' '}
        <span className="text-neutral-900 font-medium">Shopping Cart</span>
      </div>

      {/* PAGE TITLE */}
      <div className="pb-4">
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900">YOUR CART</h1>
        <p className="text-neutral-500 text-xs sm:text-sm mt-1">
          <span className="font-bold text-black">{totalQty}</span> item{totalQty !== 1 ? 's' : ''} in your bag
        </p>
      </div>

      {/* CART LAYOUT */}
      <div className="flex flex-col lg:flex-row gap-8 items-start w-full">
        {/* LEFT LIST CARD */}
        <div className="flex-1 w-full bg-white rounded-md border border-neutral-200 divide-y divide-neutral-200 shadow-sm">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center text-center py-20 px-6">
              <Trash2 className="w-12 h-12 text-neutral-300 mb-4" />
              <h2 className="font-display text-xl font-bold text-neutral-900">Your cart is empty</h2>
              <p className="text-neutral-500 text-sm mt-2 max-w-xs font-light">
                Looks like you haven&apos;t added anything yet. Wear your confidence with something new!
              </p>
              <Link
                href="/shop"
                className="mt-6 bg-black text-white text-xs font-bold px-6 py-3 rounded-md hover:bg-neutral-800 transition shadow active:scale-95"
              >
                CONTINUE SHOPPING
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-neutral-100">
              {cart.map((item, idx) => (
                <div key={`${item.id}-${item.size}-${item.color}`} className="flex gap-4 p-4 sm:p-5 animate-fade-up">
                  {/* Image */}
                  <div className="relative w-20 h-24 sm:w-24 sm:h-28 flex-none rounded-md overflow-hidden bg-neutral-100 shadow-sm border border-neutral-100">
                    <Image
                      src={item.img}
                      alt={item.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  
                  {/* Details */}
                  <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 justify-between">
                    <div className="flex-grow">
                      <p className="font-semibold text-sm sm:text-base text-neutral-900">{item.name}</p>
                      <p className="text-xs text-neutral-500 mt-1 font-medium">
                        Size: {item.size} &middot; Color: {item.color}
                      </p>
                      <p className="text-sm font-bold text-neutral-900 mt-2 sm:hidden">
                        ${item.price.toFixed(2)}
                      </p>
                      
                      {/* Mobile selectors */}
                      <div className="flex items-center gap-4 mt-3.5 sm:hidden">
                        <div className="flex items-center border border-neutral-300 rounded bg-white">
                          <button
                            onClick={() => changeQty(item.id, item.size, item.color, -1)}
                            className="w-7 h-7 flex items-center justify-center font-bold text-neutral-600 active:bg-neutral-50"
                          >
                            -
                          </button>
                          <span className="w-6 text-center text-xs font-bold text-neutral-800">{item.qty}</span>
                          <button
                            onClick={() => changeQty(item.id, item.size, item.color, 1)}
                            className="w-7 h-7 flex items-center justify-center font-bold text-neutral-600 active:bg-neutral-50"
                          >
                            +
                          </button>
                        </div>
                        <button
                          onClick={() => removeFromCart(item.id, item.size, item.color)}
                          className="text-neutral-400 hover:text-red-600 text-xs underline font-medium"
                        >
                          Remove
                        </button>
                      </div>
                    </div>

                    {/* Desktop adjustments */}
                    <div className="hidden sm:flex items-center border border-neutral-300 rounded bg-white flex-none">
                      <button
                        onClick={() => changeQty(item.id, item.size, item.color, -1)}
                        className="w-8 h-8 flex items-center justify-center hover:bg-neutral-50 text-neutral-600 transition"
                      >
                        -
                      </button>
                      <span className="w-8 text-center text-xs font-bold text-neutral-800">{item.qty}</span>
                      <button
                        onClick={() => changeQty(item.id, item.size, item.color, 1)}
                        className="w-8 h-8 flex items-center justify-center hover:bg-neutral-50 text-neutral-600 transition"
                      >
                        +
                      </button>
                    </div>

                    <p className="hidden sm:block w-20 text-right font-bold text-sm flex-none text-neutral-900">
                      ${(item.price * item.qty).toFixed(2)}
                    </p>

                    <button
                      onClick={() => removeFromCart(item.id, item.size, item.color)}
                      className="hidden sm:flex w-8 h-8 flex-none items-center justify-center rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-red-600 transition"
                      title="Remove item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT SUMMARY CARD */}
        {cart.length > 0 && (
          <div className="w-full lg:w-80 flex-none bg-white rounded-md border border-neutral-200 p-5 sm:p-6 lg:sticky lg:top-24 shadow-sm">
            <h2 className="font-display text-lg font-bold mb-4 text-neutral-900 tracking-wide">ORDER SUMMARY</h2>

            <div className="space-y-2.5 text-sm pb-4 border-b border-neutral-100">
              <div className="flex justify-between font-light">
                <span className="text-neutral-500">Subtotal</span>
                <span className="font-semibold text-neutral-800">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-light">
                <span className="text-neutral-500">Shipping estimate</span>
                <span className="font-semibold text-neutral-800">
                  {shipping === 0 ? 'FREE' : `$${shipping.toFixed(2)}`}
                </span>
              </div>
              
              {/* Promo Row if applied */}
              {promoDiscount > 0 && (
                <div className="flex justify-between text-green-700 font-semibold animate-pulse text-xs bg-green-50 px-2 py-1 rounded">
                  <span className="flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5" /> Promo ({promoCodeApplied})
                  </span>
                  <span>&minus;${discount.toFixed(2)}</span>
                </div>
              )}
            </div>

            {/* Coupon Code Entry */}
            <div className="mt-4 pb-4 border-b border-neutral-100">
              <label className="text-[10px] font-bold text-neutral-500 tracking-wider block">PROMO CODE</label>
              <div className="mt-1.5 flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. WELCOME10"
                  value={promoInput}
                  onChange={(e) => setPromoInput(e.target.value)}
                  className="flex-1 border border-neutral-300 rounded px-3 py-1.5 text-xs outline-none bg-[#f4f4f3] focus:border-black text-neutral-800"
                />
                <button
                  onClick={handleApplyPromo}
                  className="border border-black text-xs font-bold px-4 rounded hover:bg-black hover:text-white transition active:scale-95 bg-white"
                >
                  APPLY
                </button>
              </div>
              {promoMsg && <p className={`text-[10px] mt-1.5 ${promoMsgClass}`}>{promoMsg}</p>}
            </div>

            {/* Grand Total */}
            <div className="py-4 flex justify-between items-baseline">
              <span className="font-bold text-neutral-900">Total</span>
              <span className="font-display text-xl sm:text-2xl font-extrabold text-neutral-900">
                ${total.toFixed(2)}
              </span>
            </div>

            <Link
              href="/checkout"
              className="mt-2 block w-full text-center bg-black text-white text-xs font-bold py-3.5 rounded-md hover:bg-neutral-800 transition active:scale-95 shadow"
            >
              PROCEED TO CHECKOUT
            </Link>
            
            <Link
              href="/shop"
              className="block text-center text-xs mt-3.5 text-neutral-500 hover:text-black font-semibold"
            >
              &larr; Continue Shopping
            </Link>
          </div>
        )}
      </div>

      {/* YOU MAY ALSO LIKE */}
      <section className="mt-16 w-full">
        <h2 className="font-display text-xl sm:text-2xl font-bold tracking-wide text-neutral-900 mb-6">
          YOU MAY ALSO LIKE
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-5 w-full">
          {relatedSuggestions.map((p, idx) => (
            <div key={idx} className="prod-card group flex flex-col">
              <div className="relative overflow-hidden rounded-md bg-neutral-200 aspect-[3/4] w-full">
                <Image
                  src={p.img}
                  alt={p.name}
                  fill
                  sizes="(max-width: 768px) 50vw, 25vw"
                  className="object-cover transition duration-500 group-hover:scale-105"
                />
              </div>
              <p className="mt-2 text-sm font-semibold text-neutral-900">{p.name}</p>
              <p className="text-sm text-neutral-800">{p.price}</p>
              <div className="flex gap-1 mt-1">
                {p.colors.map((c, i) => (
                  <span key={i} className={`w-3 h-3 rounded-full ${c} inline-block`}></span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
