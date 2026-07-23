'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';

interface LightboxItem {
  id: string;
  url: string;
  altText: string;
}

interface ProductImageLightboxProps {
  images: LightboxItem[];
  currentIndex: number;
  onClose: () => void;
  onSelectIndex: (idx: number) => void;
}

export default function ProductImageLightbox({
  images,
  currentIndex,
  onClose,
  onSelectIndex,
}: ProductImageLightboxProps) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragStart = useRef<{ x: number; y: number; offsetX: number; offsetY: number } | null>(null);
  const pinchStart = useRef<{ distance: number; scale: number } | null>(null);

  const handleNext = () => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
    onSelectIndex((currentIndex + 1) % images.length);
  };

  const handlePrev = () => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
    onSelectIndex((currentIndex - 1 + images.length) % images.length);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [currentIndex, images.length, onClose]);

  const currentImg = images[currentIndex] || images[0];
  if (!currentImg) return null;

  return (
    <div role="dialog" aria-modal="true" aria-label="Product image viewer" className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col justify-between p-4 select-none animate-fade-in">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between text-white z-20">
        <span className="text-xs font-mono tracking-widest text-neutral-400">
          IMAGE {currentIndex + 1} OF {images.length}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setScale((s) => Math.min(3, s + 0.5))}
            className="p-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-white transition cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setScale((s) => Math.max(1, s - 0.5))}
            className="p-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-white transition cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          {scale !== 1 && (
            <button
              type="button"
              onClick={() => setScale(1)}
              className="p-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-white transition cursor-pointer"
              title="Reset Zoom"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-2 bg-neutral-800 hover:bg-red-600 rounded-lg text-white transition cursor-pointer ml-2"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Image Stage */}
      <div className="relative flex-1 flex items-center justify-center overflow-hidden my-2">
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/60 hover:bg-black text-white transition z-20 cursor-pointer"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/60 hover:bg-black text-white transition z-20 cursor-pointer"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}

        <div
          className="transition-transform duration-100 max-w-full max-h-full flex items-center justify-center"
          style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`, touchAction: 'none', cursor: scale > 1 ? 'grab' : 'zoom-in' }}
          onWheel={(event) => {
            event.preventDefault();
            const next = Math.max(1, Math.min(4, scale + (event.deltaY < 0 ? 0.25 : -0.25)));
            setScale(next);
            if (next === 1) setOffset({ x: 0, y: 0 });
          }}
          onPointerDown={(event) => {
            if (scale <= 1) return;
            event.currentTarget.setPointerCapture(event.pointerId);
            dragStart.current = { x: event.clientX, y: event.clientY, offsetX: offset.x, offsetY: offset.y };
          }}
          onPointerMove={(event) => {
            if (!dragStart.current || scale <= 1) return;
            setOffset({ x: dragStart.current.offsetX + event.clientX - dragStart.current.x, y: dragStart.current.offsetY + event.clientY - dragStart.current.y });
          }}
          onPointerUp={() => { dragStart.current = null; }}
          onTouchStart={(event) => {
            if (event.touches.length === 2) {
              const [a, b] = Array.from(event.touches);
              pinchStart.current = { distance: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY), scale };
            }
          }}
          onTouchMove={(event) => {
            if (event.touches.length === 2 && pinchStart.current) {
              const [a, b] = Array.from(event.touches);
              const distance = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
              setScale(Math.max(1, Math.min(4, pinchStart.current.scale * distance / pinchStart.current.distance)));
            }
          }}
          onTouchEnd={() => { pinchStart.current = null; }}
          onDoubleClick={() => { setScale(scale > 1 ? 1 : 2); if (scale > 1) setOffset({ x: 0, y: 0 }); }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={currentImg.url}
            alt={currentImg.altText}
            className="max-h-[82vh] max-w-[90vw] object-contain rounded"
          />
        </div>
      </div>

      {/* Bottom Thumbnail Strip */}
      {images.length > 1 && (
        <div className="flex justify-center gap-2 overflow-x-auto py-2 shrink-0 z-20">
          {images.map((img, idx) => (
            <button
              key={img.id}
              onClick={() => {
                setScale(1);
                setOffset({ x: 0, y: 0 });
                onSelectIndex(idx);
              }}
              className={`relative w-12 h-16 rounded overflow-hidden border-2 transition shrink-0 cursor-pointer ${
                currentIndex === idx ? 'border-white scale-105' : 'border-neutral-700 opacity-60 hover:opacity-100'
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt={img.altText} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
