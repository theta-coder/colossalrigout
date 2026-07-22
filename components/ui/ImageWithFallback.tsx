'use client';

import React, { useState, useEffect } from 'react';
import Image, { ImageProps } from 'next/image';

const FALLBACK_IMAGE = '/product-placeholder.png';

export interface ImageWithFallbackProps extends Omit<ImageProps, 'src'> {
  src: string | null | undefined;
  fallbackSrc?: string;
}

export default function ImageWithFallback({
  src,
  fallbackSrc = FALLBACK_IMAGE,
  alt,
  onError,
  ...rest
}: ImageWithFallbackProps) {
  const initialSrc = typeof src === 'string' && src.trim() !== '' ? src : fallbackSrc;
  const [imgSrc, setImgSrc] = useState<string>(initialSrc);
  const [hasError, setHasError] = useState<boolean>(!src || (typeof src === 'string' && src.trim() === ''));

  useEffect(() => {
    const validSrc = typeof src === 'string' && src.trim() !== '' ? src : fallbackSrc;
    setImgSrc(validSrc);
    setHasError(!src || (typeof src === 'string' && src.trim() === ''));
  }, [src, fallbackSrc]);

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    if (!hasError && imgSrc !== fallbackSrc) {
      setHasError(true);
      setImgSrc(fallbackSrc);
    }
    if (onError) {
      onError(e);
    }
  };

  return (
    <Image
      {...rest}
      src={imgSrc}
      alt={alt || 'Product image'}
      onError={handleError}
    />
  );
}
