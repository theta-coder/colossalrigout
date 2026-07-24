'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { formatPkr } from '@/lib/utils';
import { Eye } from 'lucide-react';

interface RecentProduct {
  id: string | number;
  slug: string;
  name: string;
  price: number;
  retailPrice?: number;
  img: string;
  cat?: string;
}

export const recordRecentlyViewed = (product: {
  id: string | number;
  slug?: string;
  name: string;
  price: number;
  retailPrice?: number;
  img?: string;
  images?: string[];
  cat?: string;
}) => {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem('cr_recently_viewed');
    let list: RecentProduct[] = raw ? JSON.parse(raw) : [];
    const itemSlug = product.slug || String(product.id);
    
    // Remove duplicate if already exists
    list = list.filter(item => String(item.id) !== String(product.id) && item.slug !== itemSlug);
    
    const displayImg = (Array.isArray(product.images) && product.images[0]) || product.img || '/product-placeholder.png';

    // Add new item to front
    list.unshift({
      id: product.id,
      slug: itemSlug,
      name: product.name,
      price: Number(product.price || 0),
      retailPrice: product.retailPrice ? Number(product.retailPrice) : undefined,
      img: displayImg,
      cat: product.cat
    });

    // Keep max 10 recent products
    if (list.length > 10) {
      list = list.slice(0, 10);
    }

    localStorage.setItem('cr_recently_viewed', JSON.stringify(list));
  } catch (e) {
    console.error("Error recording recently viewed product:", e);
  }
};

interface RecentlyViewedProductsProps {
  currentProductId?: string | number;
}

export default function RecentlyViewedProducts({ currentProductId }: RecentlyViewedProductsProps) {
  const [recentItems, setRecentItems] = useState<RecentProduct[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const raw = localStorage.getItem('cr_recently_viewed');
      if (raw) {
        let list: RecentProduct[] = JSON.parse(raw);
        if (currentProductId) {
          list = list.filter(item => String(item.id) !== String(currentProductId));
        }
        setRecentItems(list.slice(0, 6));
      }
    } catch (e) {
      console.error("Error reading recently viewed products:", e);
    }
  }, [currentProductId]);

  if (!mounted || recentItems.length === 0) return null;

  return (
    <section className="mt-16 pt-10 border-t border-neutral-200" id="recently-viewed-section">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-neutral-500 uppercase tracking-widest">
            <Eye className="w-4 h-4 text-black" />
            <span>Browsing History</span>
          </div>
          <h2 className="font-display text-xl sm:text-2xl font-extrabold text-neutral-900 tracking-wide mt-1">
            RECENTLY VIEWED PRODUCTS
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-6">
        {recentItems.map((item) => (
          <Link
            key={item.id}
            href={`/product/${item.slug}`}
            className="group bg-white rounded-md border border-neutral-200 overflow-hidden hover:shadow-md transition duration-300 flex flex-col"
          >
            <div className="relative aspect-3/4 bg-neutral-100 overflow-hidden">
              <Image
                src={item.img}
                alt={item.name}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 16vw"
                className="object-cover group-hover:scale-105 transition duration-500"
              />
            </div>
            <div className="p-3 flex-1 flex flex-col justify-between">
              <div>
                <p className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider">{item.cat || 'Collection'}</p>
                <h3 className="font-semibold text-xs text-neutral-900 line-clamp-1 group-hover:text-black transition">
                  {item.name}
                </h3>
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="font-bold text-xs text-neutral-900">{formatPkr(item.price)}</span>
                {item.retailPrice && item.retailPrice > item.price && (
                  <span className="text-[10px] text-neutral-400 line-through">
                    {formatPkr(item.retailPrice)}
                  </span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
