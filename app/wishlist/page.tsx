'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '../../context/CartContext';
import { useProducts } from '../../context/ProductsContext';
import { Product as CatalogProduct } from '../../lib/products';
import { Heart, ShoppingBag, ArrowRight, Trash2, HelpCircle } from 'lucide-react';
import { formatPkr } from '../../lib/utils';

const colorClasses: Record<string, string> = {
  Black: 'bg-black',
  Stone: 'bg-stone-300',
  Navy: 'bg-blue-900',
  Blue: 'bg-blue-600',
  White: 'bg-white border border-neutral-300',
  Grey: 'bg-neutral-500',
  Amber: 'bg-amber-800',
};

export default function WishlistPage() {
  const { wishlist, toggleWishlist, addToCart } = useCart();
  const { products } = useProducts();
  const [addingId, setAddingId] = useState<number | null>(null);

  // Get the product details from the catalog for all items in the wishlist
  const wishlistProducts = products.filter((product) => wishlist.includes(product.id));

  const handleAddToCart = (product: CatalogProduct) => {
    setAddingId(product.id);
    window.location.href = `/product?id=${product.id}`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 pb-20 pt-6" id="wishlist-page-container">
      {/* HERO / BANNER SECTION */}
      <section className="relative h-44 sm:h-52 md:h-60 overflow-hidden -mx-4 mb-8 rounded-b-xl shadow-sm">
        <Image
          src="https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1920&q=80"
          alt="Wishlist Cover Banner"
          fill
          priority
          referrerPolicy="no-referrer"
          className="object-cover object-center scale-105 filter brightness-90 animate-pulse duration-[8000ms]"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-black/30"></div>
        <div className="relative z-10 max-w-7xl mx-auto h-full flex flex-col justify-center px-6 sm:px-10">
          <h1 className="font-display text-white text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight drop-shadow-sm">
            MY WISHLIST
          </h1>
          <p className="text-neutral-200 text-xs sm:text-sm mt-2 font-light max-w-md">
            Keep track of your favorite Colossal Rigout pieces. Grab them before they are sold out!
          </p>
        </div>
      </section>

      {/* BREADCRUMB */}
      <div className="py-2 text-xs sm:text-sm text-neutral-500 mb-6 flex items-center gap-1.5 font-medium">
        <Link href="/" className="hover:text-black transition">Home</Link>
        <span>/</span>
        <Link href="/shop" className="hover:text-black transition">Shop</Link>
        <span>/</span>
        <span className="text-neutral-900 font-semibold">Wishlist</span>
      </div>

      {/* WISHLIST ITEMS COUNTER */}
      <div className="flex items-baseline justify-between border-b border-neutral-200 pb-4 mb-8">
        <h2 className="text-lg sm:text-xl font-bold text-neutral-900 tracking-wide">
          FAVORITES ({wishlistProducts.length})
        </h2>
        <span className="text-xs sm:text-sm text-neutral-500 font-medium">
          {wishlistProducts.length === 0 ? 'No items saved' : `${wishlistProducts.length} item(s) ready to checkout`}
        </span>
      </div>

      {/* WISHLIST CONTENT */}
      {wishlistProducts.length === 0 ? (
        <div className="text-center py-20 px-4 bg-white rounded-xl border border-neutral-200/60 shadow-sm max-w-2xl mx-auto animate-fade-up" id="empty-wishlist-view">
          <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Heart className="w-8 h-8 text-neutral-400 stroke-[1.5]" />
          </div>
          <h3 className="font-display text-xl font-bold text-neutral-900">Your Wishlist is Empty</h3>
          <p className="text-neutral-500 text-xs sm:text-sm max-w-sm mx-auto mt-2 leading-relaxed font-light">
            Tap the heart icon on any product in our store to save it here. Start exploring our latest trends!
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/shop"
              className="bg-black text-white text-xs sm:text-sm font-bold px-8 py-3.5 rounded hover:bg-neutral-800 transition active:scale-95 shadow flex items-center justify-center gap-2"
            >
              EXPLORE THE CATALOG <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6" id="wishlist-items-grid">
          {wishlistProducts.map((p) => (
            <div key={p.id} className="prod-card group flex flex-col bg-white border border-neutral-200/50 rounded-lg p-3 hover:shadow-md transition duration-300 relative animate-fade-up" id={`wishlist-card-${p.id}`}>
              {/* Image Container */}
              <div className="relative overflow-hidden rounded-md bg-neutral-100 aspect-[3/4] w-full">
                {p.isBestseller && (
                  <span className="absolute top-2 left-2 bg-black text-white text-[9px] font-semibold px-2 py-0.5 rounded tracking-wide z-10">
                    BESTSELLER
                  </span>
                )}
                
                {/* Product Link Image */}
                <Link href={`/product?id=${p.id}`} className="absolute inset-0 block cursor-pointer z-0">
                  <Image
                    src={p.img}
                    alt={p.name}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    referrerPolicy="no-referrer"
                    className="object-cover transition duration-500 group-hover:scale-105"
                  />
                </Link>

                {/* Remove from Wishlist Toggle Button */}
                <button
                  onClick={() => toggleWishlist(p.id)}
                  title="Remove from Wishlist"
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/95 flex items-center justify-center text-sm shadow hover:bg-neutral-100 hover:text-red-500 active:scale-90 transition z-10"
                >
                  <Trash2 className="w-4 h-4 text-neutral-600 hover:text-red-500" />
                </button>
              </div>

              {/* Product Metadata info */}
              <div className="mt-3 flex-1 flex flex-col justify-between">
                <div>
                  <Link href={`/product?id=${p.id}`} className="block text-xs sm:text-sm font-semibold text-neutral-900 hover:underline line-clamp-1 leading-snug">
                    {p.name}
                  </Link>
                  
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs sm:text-sm text-neutral-800 font-bold">{formatPkr(p.price)}</p>
                    <span className="text-[10px] text-neutral-400 capitalize bg-neutral-100 px-2 py-0.5 rounded font-medium">
                      {p.cat}
                    </span>
                  </div>

                  {/* Colors available */}
                  <div className="flex gap-1 mt-2">
                    {p.colors.map((c, i) => (
                      <span key={i} className={`w-2.5 h-2.5 rounded-full ${colorClasses[c]} inline-block border border-black/10`} title={c}></span>
                    ))}
                  </div>
                </div>

                {/* Quick Add to Cart button */}
                <button
                  onClick={() => handleAddToCart(p)}
                  disabled={addingId === p.id}
                  className={`mt-4 w-full text-[11px] sm:text-xs font-bold py-2.5 rounded transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer shadow-sm ${
                    addingId === p.id
                      ? 'bg-neutral-200 text-neutral-500 cursor-not-allowed'
                      : 'bg-black text-white hover:bg-neutral-800'
                  }`}
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  {addingId === p.id ? 'ADDING...' : 'ADD TO BAG'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* WISHLIST FAQ/INFO SECTION */}
      <section className="mt-16 bg-white border border-neutral-200/60 rounded-xl p-6 sm:p-8 shadow-sm">
        <div className="flex gap-3 items-start">
          <HelpCircle className="w-6 h-6 text-neutral-500 flex-none mt-0.5" />
          <div>
            <h4 className="font-display text-sm sm:text-base font-bold text-neutral-900">Wishlist FAQ & Policies</h4>
            <p className="text-neutral-500 text-xs mt-1.5 leading-relaxed font-light">
              Items added to your wishlist are saved on your current browser device using local storage. They will remain saved unless you clear your cache. Please note that saving an item in your wishlist does not reserve stock. Be sure to purchase your favorites before they run out!
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
