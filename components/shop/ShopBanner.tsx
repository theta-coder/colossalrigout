'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { ShopBannerSettings, DEFAULT_SHOP_BANNER_SETTINGS } from '@/lib/shop-page-settings';

interface ShopBannerProps {
  title: string;
  subtitle?: string;
  productCount: number;
  settings?: ShopBannerSettings;
}

export default function ShopBanner({
  title,
  subtitle,
  productCount,
  settings = DEFAULT_SHOP_BANNER_SETTINGS,
}: ShopBannerProps) {
  const [imgSrc, setImgSrc] = useState<string>(settings.imageUrl || '/api/shop-banner-image');
  const [hasError, setHasError] = useState(false);

  if (settings?.enabled === false) {
    return null;
  }

  const overlayOpacity = settings.overlayOpacity ?? 0.6;
  const objectPosition = settings.imagePosition || 'center';
  const altText = settings.imageAlt || 'Colossal Rigout shop collection';

  const handleImageError = () => {
    if (!hasError) {
      setHasError(true);
      setImgSrc('/colossal-rigout-logo.png');
    }
  };

  return (
    <div className="relative bg-black text-white py-12 sm:py-16 px-4 text-center overflow-hidden min-h-[180px] sm:min-h-[220px] flex items-center justify-center">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src={imgSrc}
          alt={altText}
          fill
          priority
          sizes="100vw"
          onError={handleImageError}
          style={{ objectFit: hasError ? 'contain' : 'cover', objectPosition }}
          className={`transition-opacity duration-500 ${hasError ? 'opacity-25 p-8' : 'opacity-100'}`}
        />
        {/* Configurable Overlay */}
        <div
          className="absolute inset-0 bg-black"
          style={{ opacity: overlayOpacity }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto space-y-2">
        <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight uppercase text-white drop-shadow-md">
          {title}
        </h1>
        {subtitle && (
          <p className="text-neutral-300 text-xs sm:text-sm max-w-lg mx-auto font-light leading-relaxed">
            {subtitle}
          </p>
        )}
        <p className="text-xs tracking-widest text-neutral-300 uppercase font-semibold pt-1">
          {productCount} {productCount === 1 ? 'PRODUCT' : 'PRODUCTS'} AVAILABLE
        </p>
      </div>
    </div>
  );
}
