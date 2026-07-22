'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import ProductImageZoom from './ProductImageZoom';
import ProductImageLightbox from './ProductImageLightbox';
import { AlertTriangle, Maximize2 } from 'lucide-react';

export interface GalleryItem {
  id: string;
  url: string;
  altText: string;
}

interface ProductImageGalleryProps {
  items: GalleryItem[];
  productName: string;
  isOutOfStock?: boolean;
  onSelectImage?: (imgUrl: string) => void;
}

export default function ProductImageGallery({
  items,
  productName,
  isOutOfStock = false,
  onSelectImage,
}: ProductImageGalleryProps) {
  const safeItems: GalleryItem[] = Array.isArray(items) && items.length > 0
    ? items
    : [{ id: 'fallback', url: '/colossal-rigout-logo.png', altText: productName }];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Reset to first image when items change (e.g. when color swatch changes)
  useEffect(() => {
    setCurrentIndex(0);
    if (onSelectImage && safeItems[0]) {
      onSelectImage(safeItems[0].url);
    }
  }, [items]);

  const currentItem = safeItems[currentIndex] || safeItems[0];

  const handleSelect = (idx: number) => {
    setCurrentIndex(idx);
    if (onSelectImage && safeItems[idx]) {
      onSelectImage(safeItems[idx].url);
    }
  };

  return (
    <div className="flex flex-col-reverse md:flex-row gap-4">
      {/* Thumbnails */}
      {safeItems.length > 1 && (
        <div className="flex md:flex-col gap-3 overflow-x-auto md:overflow-y-auto max-h-[520px] pb-2 md:pb-0 shrink-0">
          {safeItems.map((item, idx) => (
            <button
              key={`${item.id}_${idx}`}
              onClick={() => handleSelect(idx)}
              className={`relative w-16 h-20 sm:w-20 sm:h-24 rounded-xl overflow-hidden border-2 transition shrink-0 cursor-pointer bg-neutral-900 ${
                currentIndex === idx
                  ? 'border-black shadow-md scale-105 ring-2 ring-black/20'
                  : 'border-neutral-200 hover:border-neutral-400 opacity-80 hover:opacity-100'
              }`}
            >
              <Image
                src={item.url}
                alt={item.altText || `${productName} photo ${idx + 1}`}
                fill
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {/* Main Image Stage */}
      <div className="relative flex-1 aspect-[3/4] rounded-2xl overflow-hidden bg-neutral-100 border border-neutral-200 shadow-xs group">
        {isOutOfStock && (
          <span className="absolute top-3 left-3 bg-neutral-900/90 text-white text-xs font-bold px-3.5 py-1.5 rounded-lg tracking-wider uppercase z-20 shadow-md border border-neutral-700 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> OUT OF STOCK
          </span>
        )}

        <ProductImageZoom
          src={currentItem.url}
          alt={currentItem.altText || productName}
          isOutOfStock={isOutOfStock}
          onClick={() => setLightboxOpen(true)}
          className="w-full h-full"
        />

        {/* Fullscreen Expand Hint */}
        <button
          type="button"
          onClick={() => setLightboxOpen(true)}
          className="absolute bottom-3 right-3 p-2.5 rounded-xl bg-white/90 backdrop-blur-xs text-neutral-800 hover:bg-black hover:text-white transition shadow-md z-20 cursor-pointer"
          title="Open Fullscreen Lightbox"
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        {safeItems.length > 1 && (
          <span className="absolute bottom-3 left-3 text-[10px] font-mono bg-black/60 text-white px-2 py-1 rounded backdrop-blur-xs z-20">
            {currentIndex + 1} / {safeItems.length}
          </span>
        )}
      </div>

      {/* Lightbox Modal */}
      {lightboxOpen && (
        <ProductImageLightbox
          images={safeItems}
          currentIndex={currentIndex}
          onClose={() => setLightboxOpen(false)}
          onSelectIndex={handleSelect}
        />
      )}
    </div>
  );
}
