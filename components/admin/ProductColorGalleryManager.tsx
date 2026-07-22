'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { ColorDocument } from '@/types/commerce';
import { Upload, Trash2, Star, ArrowUp, ArrowDown, Image as ImageIcon } from 'lucide-react';
import ColorSwatch from '@/components/ui/ColorSwatch';

export interface ManagedColorImage {
  id: string;
  colorId: string;
  dataUrl?: string;
  url?: string;
  altText: string;
  role: 'primary' | 'gallery';
  order: number;
}

interface ProductColorGalleryManagerProps {
  selectedColorIds: string[];
  availableColors: ColorDocument[];
  colorGalleries: Record<string, ManagedColorImage[]>;
  onChange: (updatedGalleries: Record<string, ManagedColorImage[]>) => void;
}

async function optimizeProductGalleryImage(file: File): Promise<string> {
  const source = await createImageBitmap(file);
  const maxWidth = 1600;
  const maxHeight = 1600;
  const scale = Math.min(1, maxWidth / source.width, maxHeight / source.height);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(source.width * scale));
  canvas.height = Math.max(1, Math.round(source.height * scale));
  const context = canvas.getContext('2d');
  if (!context) {
    source.close();
    throw new Error('Unable to prepare gallery image.');
  }
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  source.close();
  const dataUrl = canvas.toDataURL('image/webp', 0.82);
  if (dataUrl.length > 740_000) {
    throw new Error('Image file is too large. Please select a smaller image file.');
  }
  return dataUrl;
}

export default function ProductColorGalleryManager({
  selectedColorIds,
  availableColors,
  colorGalleries,
  onChange,
}: ProductColorGalleryManagerProps) {
  const [processingColorId, setProcessingColorId] = useState<string | null>(null);

  const colorById = new Map<string, ColorDocument>();
  availableColors.forEach((c) => colorById.set(c.id, c));

  const handleFileUpload = async (colorId: string, files: FileList | null) => {
    if (!files || files.length === 0) return;
    setProcessingColorId(colorId);

    try {
      const fileList = Array.from(files);
      const newImages: ManagedColorImage[] = [];

      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) continue;

        const dataUrl = await optimizeProductGalleryImage(file);
        const colorDoc = colorById.get(colorId);
        const existingList = colorGalleries[colorId] || [];
        const isFirst = existingList.length === 0 && i === 0;

        newImages.push({
          id: `img_${colorId}_${Date.now()}_${i}`,
          colorId,
          dataUrl,
          url: dataUrl,
          altText: `${colorDoc?.name || 'Product'} detail ${existingList.length + i + 1}`,
          role: isFirst ? 'primary' : 'gallery',
          order: existingList.length + i + 1,
        });
      }

      const updated = {
        ...colorGalleries,
        [colorId]: [...(colorGalleries[colorId] || []), ...newImages],
      };
      onChange(updated);
    } catch (err: any) {
      alert(err?.message || 'Error processing gallery images.');
    } finally {
      setProcessingColorId(null);
    }
  };

  const handleSetPrimary = (colorId: string, imageId: string) => {
    const list = colorGalleries[colorId] || [];
    const updated = list.map((img) => ({
      ...img,
      role: (img.id === imageId ? 'primary' : 'gallery') as 'primary' | 'gallery',
    }));
    onChange({ ...colorGalleries, [colorId]: updated });
  };

  const handleDeleteImage = (colorId: string, imageId: string) => {
    if (!confirm('Remove this product image?')) return;
    const list = colorGalleries[colorId] || [];
    const filtered = list.filter((img) => img.id !== imageId);
    if (filtered.length > 0 && !filtered.some((img) => img.role === 'primary')) {
      filtered[0].role = 'primary';
    }
    onChange({ ...colorGalleries, [colorId]: filtered });
  };

  const handleMoveImage = (colorId: string, index: number, direction: 'up' | 'down') => {
    const list = [...(colorGalleries[colorId] || [])];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;
    const temp = list[index];
    list[index] = list[targetIdx];
    list[targetIdx] = temp;
    const reordered = list.map((img, idx) => ({ ...img, order: idx + 1 }));
    onChange({ ...colorGalleries, [colorId]: reordered });
  };

  if (selectedColorIds.length === 0) {
    return (
      <div className="p-6 bg-neutral-50 rounded-xl border border-neutral-200 text-center text-xs text-neutral-500 italic">
        Select available product colors above to configure color-wise image galleries.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-neutral-200 pb-2">
        <h4 className="font-display font-extrabold text-xs tracking-wider uppercase text-neutral-900 flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-neutral-700" /> Color-Wise Product Gallery Manager
        </h4>
        <p className="text-[11px] text-neutral-500 mt-0.5">
          Upload distinct photos for each selected product color. The customer&apos;s product gallery will automatically switch when selecting a color swatch.
        </p>
      </div>

      {selectedColorIds.map((cId) => {
        const colorDoc = colorById.get(cId);
        const images = colorGalleries[cId] || [];

        return (
          <div
            key={cId}
            className="p-4 bg-neutral-50/80 rounded-xl border border-neutral-200 space-y-4 shadow-xs"
          >
            {/* Panel Header */}
            <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
              <div className="flex items-center gap-2.5">
                {colorDoc && <ColorSwatch color={colorDoc} size="sm" />}
                <span className="font-bold text-xs text-neutral-900 uppercase">
                  COLOR GALLERY: {colorDoc?.name || cId} ({images.length} photos)
                </span>
              </div>

              <label className="flex items-center gap-2 px-3 py-1.5 border border-neutral-300 rounded-lg text-xs font-semibold bg-white hover:bg-neutral-100 transition cursor-pointer">
                <Upload className="w-3.5 h-3.5 text-neutral-600" /> Upload Photos
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => handleFileUpload(cId, e.target.files)}
                  className="hidden"
                />
              </label>
            </div>

            {/* Images Grid */}
            {processingColorId === cId && (
              <p className="text-xs text-purple-600 font-semibold animate-pulse">
                Optimizing WebP gallery photos for {colorDoc?.name}...
              </p>
            )}

            {images.length === 0 ? (
              <div className="p-4 bg-white rounded-lg border border-dashed border-neutral-300 text-center text-[11px] text-neutral-400">
                No images uploaded for {colorDoc?.name || cId} yet. Click &quot;Upload Photos&quot; above.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {images.map((img, idx) => (
                  <div
                    key={img.id}
                    className="relative bg-white border border-neutral-200 rounded-lg overflow-hidden p-2 space-y-2 group shadow-2xs"
                  >
                    <div className="relative aspect-[3/4] w-full rounded bg-neutral-100 overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.url || img.dataUrl}
                        alt={img.altText}
                        className="w-full h-full object-cover"
                      />
                      {img.role === 'primary' && (
                        <span className="absolute top-1 left-1 bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 shadow-sm">
                          <Star className="w-2.5 h-2.5 fill-white" /> PRIMARY
                        </span>
                      )}
                    </div>

                    <input
                      type="text"
                      maxLength={180}
                      value={img.altText}
                      onChange={(event) => onChange({
                        ...colorGalleries,
                        [cId]: images.map((entry) => entry.id === img.id ? { ...entry, altText: event.target.value } : entry),
                      })}
                      aria-label={`Alt text for ${colorDoc?.name || cId} image ${idx + 1}`}
                      placeholder="Accessible image description"
                      className="w-full border border-neutral-200 rounded px-2 py-1 text-[10px]"
                    />

                    {/* Image Controls */}
                    <div className="flex items-center justify-between text-[11px] pt-1">
                      <button
                        type="button"
                        onClick={() => handleSetPrimary(cId, img.id)}
                        disabled={img.role === 'primary'}
                        className={`text-[10px] font-bold uppercase transition ${
                          img.role === 'primary'
                            ? 'text-amber-600'
                            : 'text-neutral-500 hover:text-black cursor-pointer'
                        }`}
                      >
                        {img.role === 'primary' ? '★ Primary' : 'Set Primary'}
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMoveImage(cId, idx, 'up')}
                          className="p-1 text-neutral-400 hover:text-black disabled:opacity-20 cursor-pointer"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === images.length - 1}
                          onClick={() => handleMoveImage(cId, idx, 'down')}
                          className="p-1 text-neutral-400 hover:text-black disabled:opacity-20 cursor-pointer"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteImage(cId, img.id)}
                          className="p-1 text-red-500 hover:text-red-700 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
