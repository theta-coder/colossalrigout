'use client';

import React, { useState } from 'react';
import Image from 'next/image';

interface ProductImageZoomProps {
  src: string;
  alt: string;
  onClick?: () => void;
  className?: string;
  isOutOfStock?: boolean;
}

export default function ProductImageZoom({
  src,
  alt,
  onClick,
  className = '',
  isOutOfStock = false,
}: ProductImageZoomProps) {
  const [zoomStyle, setZoomStyle] = useState<React.CSSProperties>({
    opacity: 0,
    backgroundPosition: '0% 0%',
  });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;

    setZoomStyle({
      opacity: 1,
      backgroundPosition: `${x}% ${y}%`,
      backgroundImage: `url(${src})`,
      backgroundSize: '220%',
    });
  };

  const handleMouseLeave = () => {
    setZoomStyle({ opacity: 0, backgroundPosition: '0% 0%' });
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      className={`relative overflow-hidden cursor-zoom-in group select-none ${className}`}
    >
      <Image
        src={src}
        alt={alt}
        fill
        priority
        sizes="(max-width: 1024px) 100vw, 50vw"
        className={`object-cover transition-opacity duration-300 ${
          isOutOfStock ? 'opacity-80' : 'opacity-100'
        }`}
      />
      {/* Magnified lens overlay on desktop hover */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-150 hidden md:block"
        style={zoomStyle}
      />
    </div>
  );
}
