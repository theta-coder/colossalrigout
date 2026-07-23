'use client';

import React, { useState, useEffect } from 'react';
import { ColorDocument } from '@/types/commerce';
import { ManagedColorImage } from './ProductColorGalleryManager';
import { Plus, Trash2, Check, Upload, Image as ImageIcon, Boxes, RefreshCw } from 'lucide-react';
import ColorSwatch from '@/components/ui/ColorSwatch';

interface SizeItem {
  id: string;
  code: string;
  name?: string;
}

interface ConfiguredSizeGroup {
  sizeId: string;
  sizeCode: string;
  colorVariants: Array<{
    colorId: string;
    colorName: string;
    hex: string;
    secondaryHex?: string | null;
    stock: number;
    images: ManagedColorImage[];
  }>;
}

interface GuidedSizeColorBuilderProps {
  availableSizes: SizeItem[];
  availableColors: ColorDocument[];
  selectedSizes: string[];
  selectedColors: string[];
  adminColorGalleries: Record<string, ManagedColorImage[]>;
  variantStocks: Record<string, number>;
  onUpdateProductVariants: (data: {
    sizes: string[];
    colors: string[];
    colorGalleries: Record<string, ManagedColorImage[]>;
    variantStocks: Record<string, number>;
  }) => void;
}

async function optimizeProductGalleryImage(file: File): Promise<string> {
  const source = await createImageBitmap(file);
  const maxWidth = 1400;
  const maxHeight = 1400;
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
    throw new Error('Image file is too large. Please select a smaller file.');
  }
  return dataUrl;
}

export default function GuidedSizeColorBuilder({
  availableSizes,
  availableColors,
  selectedSizes,
  selectedColors,
  adminColorGalleries,
  variantStocks,
  onUpdateProductVariants,
}: GuidedSizeColorBuilderProps) {
  // Configured Groups List
  const [sizeGroups, setSizeGroups] = useState<ConfiguredSizeGroup[]>([]);
  
  // Current Builder State
  const [activeSizeId, setActiveSizeId] = useState<string>('');
  const [activeColorIds, setActiveColorIds] = useState<string[]>([]);
  const [activeStocks, setActiveStocks] = useState<Record<string, number>>({});
  const [activeGalleries, setActiveGalleries] = useState<Record<string, ManagedColorImage[]>>({});
  const [uploadingColorId, setUploadingColorId] = useState<string | null>(null);

  // Sync existing product props on edit mode
  useEffect(() => {
    if (selectedSizes.length > 0 && sizeGroups.length === 0) {
      const groups: ConfiguredSizeGroup[] = selectedSizes.map((sId) => {
        const sizeObj = availableSizes.find((s) => s.id === sId);
        const colorsForSize = selectedColors.map((cId) => {
          const colorObj = availableColors.find((c) => c.id === cId);
          const key = `${cId}_${sId}`;
          const stock = variantStocks[key] ?? 10;
          const images = adminColorGalleries[cId] || [];
          return {
            colorId: cId,
            colorName: colorObj?.name || cId,
            hex: colorObj?.hex || '#000000',
            secondaryHex: colorObj?.secondaryHex,
            stock,
            images,
          };
        });
        return {
          sizeId: sId,
          sizeCode: sizeObj?.code || sId,
          colorVariants: colorsForSize,
        };
      });
      setSizeGroups(groups);
    }
  }, [selectedSizes, selectedColors, availableSizes, availableColors, variantStocks, adminColorGalleries]);

  const colorMap = new Map<string, ColorDocument>();
  availableColors.forEach((c) => colorMap.set(c.id, c));

  const usedSizeIds = new Set(sizeGroups.map((g) => g.sizeId));

  // Toggle Color selection for active size
  const toggleActiveColor = (colorId: string) => {
    setActiveColorIds((prev) => {
      const exists = prev.includes(colorId);
      if (exists) {
        return prev.filter((id) => id !== colorId);
      } else {
        // Default stock 10
        setActiveStocks((s) => ({ ...s, [colorId]: s[colorId] ?? 10 }));
        return [...prev, colorId];
      }
    });
  };

  // Upload Photo for active size color
  const handleImageUpload = async (colorId: string, files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadingColorId(colorId);
    try {
      const fileArray = Array.from(files);
      const newImages: ManagedColorImage[] = [];
      const colorObj = colorMap.get(colorId);
      const existing = activeGalleries[colorId] || adminColorGalleries[colorId] || [];

      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) continue;
        const dataUrl = await optimizeProductGalleryImage(file);
        const safeName = (file.name || 'img').replace(/[^a-z0-9]/gi, '_').toLowerCase();
        newImages.push({
          id: `img_${colorId}_${i}_${safeName}_${file.size || 0}`,
          colorId,
          dataUrl,
          url: dataUrl,
          altText: `${colorObj?.name || 'Product'} image ${existing.length + i + 1}`,
          role: existing.length === 0 && i === 0 ? 'primary' : 'gallery',
          order: existing.length + i + 1,
        });
      }

      const updated = {
        ...activeGalleries,
        [colorId]: [...existing, ...newImages],
      };
      setActiveGalleries(updated);
    } catch (err: any) {
      alert(err.message || 'Image upload failed.');
    } finally {
      setUploadingColorId(null);
    }
  };

  // Save current size configuration into sizeGroups list
  const handleAddCurrentSizeGroup = () => {
    if (!activeSizeId) {
      alert('Please select a size first.');
      return;
    }
    if (activeColorIds.length === 0) {
      alert('Please select at least one color for this size.');
      return;
    }

    const sizeObj = availableSizes.find((s) => s.id === activeSizeId);
    const newVariants = activeColorIds.map((cId) => {
      const colorObj = colorMap.get(cId);
      return {
        colorId: cId,
        colorName: colorObj?.name || cId,
        hex: colorObj?.hex || '#000000',
        secondaryHex: colorObj?.secondaryHex,
        stock: activeStocks[cId] ?? 10,
        images: activeGalleries[cId] || adminColorGalleries[cId] || [],
      };
    });

    const newGroup: ConfiguredSizeGroup = {
      sizeId: activeSizeId,
      sizeCode: sizeObj?.code || activeSizeId,
      colorVariants: newVariants,
    };

    const updatedGroups = [...sizeGroups, newGroup];
    setSizeGroups(updatedGroups);

    // Propagate changes up to parent Product Form
    syncWithParent(updatedGroups);

    // Reset current active builder for NEXT SIZE
    setActiveSizeId('');
    setActiveColorIds([]);
    setActiveStocks({});
    setActiveGalleries({});
  };

  // Remove a configured size group
  const handleRemoveSizeGroup = (sizeId: string) => {
    const filtered = sizeGroups.filter((g) => g.sizeId !== sizeId);
    setSizeGroups(filtered);
    syncWithParent(filtered);
  };

  // Sync state to parent form
  const syncWithParent = (groups: ConfiguredSizeGroup[]) => {
    const allSizes = Array.from(new Set(groups.map((g) => g.sizeId)));
    const allColorsSet = new Set<string>();
    const mergedGalleries: Record<string, ManagedColorImage[]> = { ...adminColorGalleries, ...activeGalleries };
    const mergedStocks: Record<string, number> = { ...variantStocks };

    groups.forEach((g) => {
      g.colorVariants.forEach((v) => {
        allColorsSet.add(v.colorId);
        const key = `${v.colorId}_${g.sizeId}`;
        mergedStocks[key] = v.stock;
        if (v.images.length > 0) {
          mergedGalleries[v.colorId] = v.images;
        }
      });
    });

    onUpdateProductVariants({
      sizes: allSizes,
      colors: Array.from(allColorsSet),
      colorGalleries: mergedGalleries,
      variantStocks: mergedStocks,
    });
  };

  return (
    <div className="space-y-6">
      {/* 1. LIST OF CONFIGURED SIZE GROUPS */}
      {sizeGroups.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
            <h4 className="text-xs font-black uppercase text-neutral-900 tracking-wider flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" /> Configured Size Variants ({sizeGroups.length})
            </h4>
            <span className="text-[10px] text-neutral-500 font-bold">Size &rarr; Color &rarr; Images & Stock logged</span>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {sizeGroups.map((group) => (
              <div
                key={group.sizeId}
                className="bg-white border border-neutral-200 rounded-xl p-4 shadow-2xs space-y-3"
              >
                <div className="flex items-center justify-between border-b border-neutral-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="bg-black text-white px-3 py-1 rounded-md text-xs font-black tracking-wide">
                      SIZE: {group.sizeCode}
                    </span>
                    <span className="text-xs font-bold text-neutral-600">
                      ({group.colorVariants.length} Color Options)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveSizeGroup(group.sizeId)}
                    className="text-red-500 hover:text-red-700 text-xs font-bold flex items-center gap-1 hover:bg-red-50 px-2 py-1 rounded transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remove Size {group.sizeCode}
                  </button>
                </div>

                {/* Color Variants inside this Size */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {group.colorVariants.map((v) => (
                    <div
                      key={v.colorId}
                      className="p-2.5 bg-neutral-50 rounded-lg border border-neutral-200 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-black/10 shrink-0"
                          style={{
                            background: v.secondaryHex
                              ? `linear-gradient(135deg, ${v.hex} 50%, ${v.secondaryHex} 50%)`
                              : v.hex,
                          }}
                        />
                        <span className="text-xs font-bold text-neutral-800">{v.colorName}</span>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-black text-neutral-900 block">Stock: {v.stock}</span>
                        <span className="text-[10px] text-neutral-500 font-medium">
                          {v.images.length} photos
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. GUIDED BUILDER FOR ADDING NEXT SIZE */}
      <div className="bg-neutral-50/90 border border-neutral-300 rounded-xl p-5 space-y-5 shadow-xs">
        <div className="border-b border-neutral-200 pb-3">
          <h4 className="text-xs font-black text-neutral-900 uppercase tracking-wider flex items-center gap-2">
            <Boxes className="w-4 h-4 text-purple-700" />
            {sizeGroups.length === 0 ? 'STEP 1: Select Size & Configure Colors/Stock' : '+ ADD NEXT SIZE VARIANT'}
          </h4>
          <p className="text-[11px] text-neutral-500 mt-0.5">
            Select a Size first (e.g. S). Once added, it cannot be picked again. Then choose its colors, upload photos & set stock!
          </p>
        </div>

        {/* STEP A: PICK SIZE */}
        <div>
          <label className="block text-xs font-bold text-neutral-800 uppercase tracking-wider mb-2">
            1. Select Size *
          </label>
          <div className="flex flex-wrap gap-2">
            {availableSizes.map((sz) => {
              const isAlreadyConfigured = usedSizeIds.has(sz.id);
              const isCurrent = activeSizeId === sz.id;

              return (
                <button
                  key={sz.id}
                  type="button"
                  disabled={isAlreadyConfigured}
                  onClick={() => setActiveSizeId(sz.id)}
                  className={`min-w-[48px] h-11 px-3.5 text-xs font-black rounded-lg border transition uppercase flex items-center justify-center gap-1.5 ${
                    isAlreadyConfigured
                      ? 'bg-neutral-200 text-neutral-400 border-neutral-300 cursor-not-allowed line-through opacity-60'
                      : isCurrent
                      ? 'bg-black text-white border-black shadow-md scale-105'
                      : 'bg-white text-neutral-800 border-neutral-300 hover:border-black cursor-pointer'
                  }`}
                >
                  {sz.code}
                  {isAlreadyConfigured && <Check className="w-3.5 h-3.5 text-neutral-500" />}
                </button>
              );
            })}
          </div>
          {activeSizeId && (
            <p className="text-[11px] font-bold text-emerald-700 mt-2 flex items-center gap-1">
              <Check className="w-3.5 h-3.5" /> Selected Size: {availableSizes.find(s => s.id === activeSizeId)?.code}
            </p>
          )}
        </div>

        {/* STEP B: PICK COLORS FOR THIS SIZE */}
        {activeSizeId && (
          <div className="space-y-4 pt-2 border-t border-neutral-200 animate-fade-in">
            <div>
              <label className="block text-xs font-bold text-neutral-800 uppercase tracking-wider mb-2">
                2. Select Available Colors for Size {availableSizes.find(s => s.id === activeSizeId)?.code} *
              </label>
              <div className="flex flex-wrap gap-2.5">
                {availableColors.map((col) => {
                  const isSelected = activeColorIds.includes(col.id);
                  return (
                    <button
                      key={col.id}
                      type="button"
                      onClick={() => toggleActiveColor(col.id)}
                      className={`px-3.5 py-2 text-xs font-bold rounded-lg border transition flex items-center gap-2 cursor-pointer ${
                        isSelected
                          ? 'bg-black text-white border-black shadow-md'
                          : 'bg-white text-neutral-700 border-neutral-300 hover:border-black'
                      }`}
                    >
                      <span
                        className="w-3.5 h-3.5 rounded-full inline-block border border-black/10 shrink-0"
                        style={{
                          background: col.secondaryHex
                            ? `linear-gradient(135deg, ${col.hex} 50%, ${col.secondaryHex} 50%)`
                            : col.hex,
                        }}
                      />
                      {col.name}
                      {isSelected && <Check className="w-3.5 h-3.5 ml-0.5" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* STEP C: PHOTOS & STOCK PER COLOR IN THIS SIZE */}
            {activeColorIds.length > 0 && (
              <div className="space-y-3 pt-2">
                <label className="block text-xs font-bold text-neutral-800 uppercase tracking-wider">
                  3. Configure Photos & Stock for Size {availableSizes.find(s => s.id === activeSizeId)?.code}
                </label>

                <div className="grid grid-cols-1 gap-3">
                  {activeColorIds.map((cId) => {
                    const colorObj = colorMap.get(cId);
                    const images = activeGalleries[cId] || adminColorGalleries[cId] || [];

                    return (
                      <div
                        key={cId}
                        className="p-3.5 bg-white rounded-xl border border-neutral-200 space-y-3 shadow-2xs"
                      >
                        <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
                          <div className="flex items-center gap-2">
                            {colorObj && <ColorSwatch color={colorObj} size="sm" />}
                            <span className="font-bold text-xs text-neutral-900 uppercase">
                              {colorObj?.name || cId} ({images.length} photos)
                            </span>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-bold text-neutral-500 uppercase">Stock Qty:</span>
                              <input
                                type="number"
                                min="0"
                                value={activeStocks[cId] ?? 10}
                                onChange={(e) =>
                                  setActiveStocks({
                                    ...activeStocks,
                                    [cId]: Math.max(0, Number(e.target.value)),
                                  })
                                }
                                className="w-16 px-2 py-1 text-xs font-bold border border-neutral-300 rounded text-center outline-none focus:border-black"
                              />
                            </div>

                            <label className="flex items-center gap-1.5 px-2.5 py-1 border border-neutral-300 rounded text-[11px] font-bold bg-neutral-50 hover:bg-neutral-100 transition cursor-pointer">
                              <Upload className="w-3.5 h-3.5 text-neutral-600" />
                              {uploadingColorId === cId ? 'Uploading...' : 'Add Photos'}
                              <input
                                type="file"
                                multiple
                                accept="image/jpeg,image/png,image/webp"
                                onChange={(e) => handleImageUpload(cId, e.target.files)}
                                className="hidden"
                              />
                            </label>
                          </div>
                        </div>

                        {/* Image Previews */}
                        {images.length > 0 && (
                          <div className="flex gap-2 overflow-x-auto pb-1">
                            {images.map((img) => (
                              <div
                                key={img.id}
                                className="relative w-12 h-16 rounded border border-neutral-200 overflow-hidden shrink-0 bg-neutral-100"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={img.url || img.dataUrl} alt={img.altText} className="w-full h-full object-cover" />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* STEP D: CONFIRM & ADD NEXT SIZE BUTTON */}
            {activeColorIds.length > 0 && (
              <div className="pt-3">
                <button
                  type="button"
                  onClick={handleAddCurrentSizeGroup}
                  className="w-full bg-black text-white hover:bg-neutral-800 text-xs font-black uppercase tracking-widest py-3.5 px-4 rounded-xl transition flex items-center justify-center gap-2 shadow-md cursor-pointer active:scale-98"
                >
                  <Plus className="w-4 h-4" /> Save Size {availableSizes.find(s => s.id === activeSizeId)?.code} & Add Next Size Variant
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
