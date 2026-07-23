import React, { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { X } from 'lucide-react';
import { Product } from '../lib/products';
import { formatPkr } from '../lib/utils';

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
  const [quickQty, setQuickQty] = useState<number>(1);
  const [variants, setVariants] = useState<any[]>([]);

  useEffect(() => {
    setQuickQty(1);
  }, [quickSize, quickColor, product.id]);

  useEffect(() => {
    // Fetch variants specific to this product using the dedicated inventory API
    fetch(`/api/inventory?productId=${encodeURIComponent(String(product.id))}`)
      .then((res) => res.json())
      .then((payload) => {
        // /api/inventory returns { variants: [...] }
        if (Array.isArray(payload.variants)) {
          setVariants(payload.variants);
          return;
        }
        // Fallback: /api/commerce/inventory returns { success: true, data: [...] }
        if (payload.success && Array.isArray(payload.data)) {
          setVariants(payload.data.filter((variant: any) => String(variant.productId) === String(product.id)));
        }
      })
      .catch(() => setVariants([]));
  }, [product.id]);

  const selectedVariant = useMemo(() => {
    if (variants.length === 0) return null;
    const colorIndex = product.colors.findIndex(
      (c) => String(c).trim().toLowerCase() === String(quickColor).trim().toLowerCase()
    );
    const sizeIndex = product.sizes.findIndex(
      (s) => String(s).trim().toLowerCase() === String(quickSize).trim().toLowerCase()
    );
    const colorId = colorIndex >= 0 ? product.colorIds?.[colorIndex] || quickColor : quickColor;
    const sizeId = sizeIndex >= 0 ? product.sizeIds?.[sizeIndex] || quickSize : quickSize;

    return variants.find(
      (variant) =>
        (variant.colorId === colorId ||
          variant.colorName === quickColor ||
          String(variant.colorName || '').trim().toLowerCase() === String(quickColor || '').trim().toLowerCase() ||
          String(variant.colorId || '').trim().toLowerCase() === String(colorId || '').trim().toLowerCase() ||
          String(variant.colorId || '').trim().toLowerCase() === String(quickColor || '').trim().toLowerCase()) &&
        (variant.sizeId === sizeId ||
          variant.sizeName === quickSize ||
          String(variant.sizeName || '').trim().toLowerCase() === String(quickSize || '').trim().toLowerCase() ||
          String(variant.sizeId || '').trim().toLowerCase() === String(sizeId || '').trim().toLowerCase() ||
          String(variant.sizeId || '').trim().toLowerCase() === String(quickSize || '').trim().toLowerCase())
    );
  }, [product, quickColor, quickSize, variants]);

  const isAvailable = useMemo(() => {
    if (variants.length > 0) {
      if (!selectedVariant) {
        // No matching variant found — fall back to product-level stock
        const totalStock = (product as any).totalStock;
        if (typeof totalStock === 'number') return totalStock > 0;
        return true; // assume in stock if no variant info
      }
      const stock = Number(selectedVariant.availableStock ?? selectedVariant.stockOnHand ?? selectedVariant.stock ?? 0);
      return stock > 0;
    }

    // No variants loaded at all — use product-level fields
    if ((product as any).inStock === false) return false;
    if (typeof (product as any).totalStock === 'number' && (product as any).totalStock <= 0) return false;
    if (typeof (product as any).stock === 'number' && (product as any).stock <= 0) return false;

    return true; // Default to available when no stock data
  }, [variants, selectedVariant, product]);

  const stockCount = selectedVariant
    ? Number(selectedVariant.availableStock ?? selectedVariant.stockOnHand ?? selectedVariant.stock ?? 0)
    : (product as any).totalStock || (product as any).stock || null;

  const maxStock = stockCount !== null && stockCount > 0 ? stockCount : 99;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in font-sans">
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
            <Image src={product.img} alt={product.name} fill className="object-cover" />
          </div>
          <div className="flex flex-col justify-center">
            <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">{product.cat}</span>
            <h4 className="font-display font-extrabold text-sm text-neutral-900 leading-snug mt-0.5">
              {product.name}
            </h4>
            <p className="text-sm font-bold text-neutral-800 mt-1">{formatPkr(product.price)}</p>
          </div>
        </div>

        {/* Size Selector */}
        {product.sizes.length > 0 && (
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
                  className={`w-9 h-9 border rounded-md text-xs font-semibold transition cursor-pointer ${
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
        )}

        {/* Color Selector */}
        {product.colors.length > 0 && (
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold tracking-wider text-neutral-400 uppercase">Select Color</span>
              <span className="text-xs font-bold text-black">{quickColor}</span>
            </div>
            <div className="flex flex-wrap gap-2.5">
              {product.colors.map((col) => (
                <button
                  key={col}
                  onClick={() => setQuickColor(col)}
                  className={`w-8 h-8 rounded-full ${colorClasses[col] || 'bg-stone-300'} ring-2 ring-offset-2 transition cursor-pointer ${
                    quickColor === col ? 'ring-black scale-105 shadow-sm' : 'ring-transparent hover:ring-neutral-300'
                  }`}
                  title={col}
                />
              ))}
            </div>
          </div>
        )}

        {/* Quantity Selector */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold tracking-wider text-neutral-400 uppercase">Quantity</span>
            <span className="text-xs font-bold text-black">{quickQty}</span>
          </div>
          <div className="inline-flex items-center border border-neutral-300 rounded-lg bg-neutral-50/80 p-1">
            <button
              type="button"
              onClick={() => setQuickQty((prev) => Math.max(1, prev - 1))}
              disabled={quickQty <= 1}
              className="w-8 h-8 rounded-md bg-white border border-neutral-200 shadow-2xs flex items-center justify-center font-bold text-neutral-800 hover:bg-neutral-100 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
              aria-label="Decrease quantity"
            >
              -
            </button>
            <span className="w-10 text-center text-xs font-extrabold text-neutral-900">{quickQty}</span>
            <button
              type="button"
              onClick={() => setQuickQty((prev) => Math.min(maxStock, prev + 1))}
              disabled={quickQty >= maxStock}
              className="w-8 h-8 rounded-md bg-white border border-neutral-200 shadow-2xs flex items-center justify-center font-bold text-neutral-800 hover:bg-neutral-100 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>
        </div>

        <button
          onClick={() => {
            if (!isAvailable) return;
            onAddToCart({
              id: typeof product.id === 'number' ? product.id : Number(product.id || 0),
              name: product.name,
              price: product.price,
              size: quickSize,
              color: quickColor,
              img: product.img,
              qty: quickQty,
              variantId: selectedVariant?.id || `var_${product.id}_${quickSize}_${quickColor}`,
            });
            onClose();
          }}
          disabled={!isAvailable}
          className="w-full bg-black disabled:bg-neutral-300 disabled:cursor-not-allowed text-white text-xs font-bold py-3.5 rounded-lg hover:bg-neutral-800 transition tracking-wider uppercase active:scale-[0.98] cursor-pointer"
        >
          {isAvailable
            ? stockCount !== null && stockCount > 0
              ? `Add To Cart (${stockCount} available)`
              : 'Add To Cart'
            : 'Out of Stock'}
        </button>
      </div>
    </div>
  );
}
