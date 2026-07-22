'use client';

import React from 'react';
import { ColorDocument } from '../../types/commerce';

export interface ColorSwatchProps {
  color: ColorDocument | { id: string; name: string; hex: string; secondaryHex?: string | null; swatchType?: 'solid' | 'dual' };
  selected?: boolean;
  disabled?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showName?: boolean;
  onClick?: () => void;
  className?: string;
}

export default function ColorSwatch({
  color,
  selected = false,
  disabled = false,
  size = 'md',
  showName = false,
  onClick,
  className = '',
}: ColorSwatchProps) {
  const sizeClasses = {
    xs: 'w-4 h-4',
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
  };

  const isDual = color.swatchType === 'dual' || Boolean(color.secondaryHex);
  const backgroundStyle = isDual && color.secondaryHex
    ? { background: `linear-gradient(135deg, ${color.hex} 50%, ${color.secondaryHex} 50%)` }
    : { backgroundColor: color.hex };

  // Neutral border helper so white/light swatches remain visible against white backgrounds
  const borderClasses = 'border border-neutral-300/80 shadow-xs';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={color.name}
      aria-label={`Select color ${color.name}`}
      className={`relative rounded-full transition-all duration-200 flex items-center justify-center shrink-0 ${sizeClasses[size]} ${borderClasses} ${
        selected ? 'ring-2 ring-black ring-offset-2 scale-105' : onClick ? 'hover:scale-105 cursor-pointer hover:ring-2 hover:ring-neutral-300' : ''
      } ${disabled ? 'opacity-40 cursor-not-allowed' : ''} ${className}`}
      style={backgroundStyle}
    >
      {disabled && (
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="w-full h-0.5 bg-neutral-500 rotate-45 rounded-full" />
        </span>
      )}
      {showName && (
        <span className="sr-only">{color.name}</span>
      )}
    </button>
  );
}
