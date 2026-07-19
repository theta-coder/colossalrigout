'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { X } from 'lucide-react';
import { Product } from '../lib/products';

const colorClasses: Record<string, string> = {
  Black: 'bg-black border border-neutral-800',
  Stone: 'bg-stone-300 border border-neutral-400',
  Navy: 'bg-blue-900 border border-blue-950',
  Blue: 'bg-blue-600 border border-blue-700',
  White: 'bg-white border border-neutral-300',
  Grey: 'bg-neutral-500 border border-neutral-600',
  Amber: 'bg-amber-800 border border-amber-900',
};

interface QuickAddModalProps {
  product: Product;
  onClose: () => void;
  onAddToCart: (item: {
    id: number;
    name: string;
    price: number;
    size: string;
    color: string;
    img: string;
    qty: number;
    variantId: string;
  }) => void;
}

export default function QuickAddModal({ product, onClose, onAddToCart }: QuickAddModalProps) {
  const [quickSize, setQuickSize] = useState<string>(product.sizes[0] || 'M');
  const [quickColor, setQuickColor] = useState<string>(product.colors[0] || 'Default');
  const [variants, setVariants] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/commerce/inventory').then(res => res.json()).then(payload => {
      if (payload.success) setVariants(payload.data.filter((variant: any) => String(variant.productId) === String(product.id)));
    }).catch(() => setVariants([]));
  }, [product.id]);

  const selectedVariant = useMemo(() => {
    const colorIndex = product.colors.indexOf(quickColor);
    const sizeIndex = product.sizes.indexOf(quickSize);
    const colorId = product.colorIds?.[colorIndex] || quickColor;
    const sizeId = product.sizeIds?.[sizeIndex] || quickSize;
    return variants.find(variant => variant.colorId === colorId && variant.sizeId === sizeId);
  }, [product, quickColor, quickSize, variants]);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-2xl relative border border-neutral-100 text-left">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-500 hover:text-black hover:bg-neutral-200 transition cursor-pointer"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
        
        <div className="flex gap-4 mb-5">
          <div className="relative w-16 h-20 rounded-md overflow-hidden bg-neutral-100 shrink-0 border border-neutral-200">
            <Image
              src={product.img}
              alt={product.name}
              fill
              className="object-cover"
            />
          </div>
          <div className="flex flex-col justify-center">
            <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">{product.cat}</span>
            <h4 className="font-display font-extrabold text-sm text-neutral-900 leading-snug mt-0.5">{product.name}</h4>
            <p className="text-sm font-bold text-neutral-800 mt-1">${product.price.toFixed(2)}</p>
          </div>
        </div>
        
        {/* Size Selector */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold tracking-wider text-neutral-400 uppercase">Select Size</span>
            <span className="text-xs font-bold text-black">{quickSize}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {product.sizes.map((size) => (
              <button
                key={size}
                onClick={() => setQuickSize(size)}
                className={`w-9 h-9 border rounded-md text-xs font-semibold transition ${
                  quickSize === size
                    ? 'border-black bg-black text-white'
                    : 'border-neutral-200 hover:border-black bg-white text-neutral-800'
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
        
        {/* Color Selector */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold tracking-wider text-neutral-400 uppercase">Select Color</span>
            <span className="text-xs font-bold text-black">{quickColor}</span>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {product.colors.map((col) => (
              <button
                key={col}
                onClick={() => setQuickColor(col)}
                className={`w-8 h-8 rounded-full ${colorClasses[col] || 'bg-stone-300'} ring-2 ring-offset-2 transition ${
                  quickColor === col ? 'ring-black scale-105 shadow-sm' : 'ring-transparent hover:ring-neutral-300'
                }`}
                title={col}
              />
            ))}
          </div>
        </div>
        
        <button
          onClick={() => {
            const stock = Number(selectedVariant?.availableStock ?? selectedVariant?.stock ?? selectedVariant?.stockOnHand ?? 0);
            if (!selectedVariant || stock < 1) return;
            onAddToCart({
              id: product.id,
              name: product.name,
              price: product.price,
              size: quickSize,
              color: quickColor,
              img: product.img,
              qty: 1,
              variantId: selectedVariant.id
            });
            onClose();
          }}
          disabled={!selectedVariant || Number(selectedVariant.availableStock ?? selectedVariant.stock ?? selectedVariant.stockOnHand ?? 0) < 1}
          className="w-full bg-black disabled:bg-neutral-300 disabled:cursor-not-allowed text-white text-xs font-bold py-3.5 rounded-lg hover:bg-neutral-800 transition tracking-wider uppercase active:scale-[0.98] cursor-pointer"
        >
          {selectedVariant && Number(selectedVariant.availableStock ?? selectedVariant.stock ?? selectedVariant.stockOnHand ?? 0) > 0 ? `Add To Cart (${selectedVariant.availableStock ?? selectedVariant.stock ?? selectedVariant.stockOnHand} available)` : 'Out of Stock'}
        </button>
      </div>
    </div>
  );
}
