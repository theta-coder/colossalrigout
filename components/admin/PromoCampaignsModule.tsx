'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import {
  Plus, X, Edit2, Trash2, Eye, EyeOff, Upload, Clock, Tag, Sparkles,
  CheckCircle, AlertCircle, Search, Calendar, Megaphone
} from 'lucide-react';

interface CampaignForm {
  id: string;
  internalName: string;
  badgeText: string;
  heading: string;
  description: string;
  highlightText: string;
  ctaText: string;
  discountMode: 'automatic' | 'coupon';
  discountType: 'percentage' | 'fixed';
  discountValue: string;
  couponCode: string;
  minimumOrder: string;
  targetType: 'all-products' | 'selected-products' | 'selected-categories';
  productIds: string[];
  categoryIds: string[];
  startsAt: string;
  endsAt: string;
  status: 'draft' | 'active' | 'inactive';
  backgroundOverlayOpacity: string;
  textAlignment: 'left' | 'center';
  order: string;
}

interface Campaign extends CampaignForm {
  backgroundImageUrl: string;
  createdAt: string;
  updatedAt: string;
}

interface ProductOption {
  id: string;
  name: string;
  categorySlug: string;
  retailPrice: number;
}

interface CategoryOption {
  id: string;
  name: string;
  slug: string;
}

const emptyCampaignForm = (): CampaignForm => ({
  id: '',
  internalName: '',
  badgeText: 'Limited Time Only',
  heading: '',
  description: '',
  highlightText: '',
  ctaText: 'Shop The Sale',
  discountMode: 'automatic',
  discountType: 'percentage',
  discountValue: '',
  couponCode: '',
  minimumOrder: '0',
  targetType: 'all-products',
  productIds: [],
  categoryIds: [],
  startsAt: '',
  endsAt: '',
  status: 'draft',
  backgroundOverlayOpacity: '0.55',
  textAlignment: 'left',
  order: '0',
});

async function optimizeCampaignImage(file: File): Promise<string> {
  const source = await createImageBitmap(file);
  const maxWidth = 1600;
  const maxHeight = 900;
  const scale = Math.min(1, maxWidth / source.width, maxHeight / source.height);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(source.width * scale));
  canvas.height = Math.max(1, Math.round(source.height * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) { source.close(); throw new Error('Cannot process image.'); }
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  source.close();
  const dataUrl = canvas.toDataURL('image/webp', 0.72);
  if (dataUrl.length > 900_000) throw new Error('Image too large. Try a simpler or smaller image.');
  return dataUrl;
}

function toLocalDatetimeValue(iso: string): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch { return ''; }
}

function fromLocalDatetimeValue(localStr: string): string {
  if (!localStr) return '';
  return new Date(localStr).toISOString();
}

function getCampaignTimeStatus(c: { startsAt: string; endsAt: string; status: string }) {
  const now = Date.now();
  const start = new Date(c.startsAt).getTime();
  const end = new Date(c.endsAt).getTime();
  if (c.status !== 'active') return { label: c.status.toUpperCase(), color: 'bg-neutral-100 text-neutral-500 border' };
  if (now < start) return { label: 'SCHEDULED', color: 'bg-blue-50 text-blue-700 border border-blue-200' };
  if (now >= end) return { label: 'EXPIRED', color: 'bg-red-50 text-red-600 border border-red-200' };
  return { label: 'LIVE NOW', color: 'bg-emerald-50 text-emerald-700 border border-emerald-200' };
}

export default function PromoCampaignsModule() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [form, setForm] = useState<CampaignForm>(emptyCampaignForm());
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Product & Category options for multi-select
  const [productOptions, setProductOptions] = useState<ProductOption[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<CategoryOption[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [categorySearch, setCategorySearch] = useState('');

  const flash = (setter: (v: string) => void, msg: string) => {
    setter(msg);
    setTimeout(() => setter(''), 3500);
  };

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/promo-campaigns');
      const json = await res.json();
      if (json.success) setCampaigns(json.data || []);
    } catch (e: any) {
      flash(setErrorMsg, 'Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchOptions = useCallback(async () => {
    try {
      const [prodRes, catRes] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/categories?all=true'),
      ]);
      const prodJson = await prodRes.json();
      const catJson = await catRes.json();

      const prods = (prodJson.products || prodJson.data || []).map((p: any) => ({
        id: String(p.id),
        name: p.name || '',
        categorySlug: p.categorySlug || '',
        retailPrice: Number(p.retailPrice || 0),
      }));
      setProductOptions(prods);

      const cats = (catJson.data || []).map((c: any) => ({
        id: c.id || c.slug || '',
        name: c.name || '',
        slug: c.slug || '',
      }));
      setCategoryOptions(cats);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchCampaigns(); fetchOptions(); }, [fetchCampaigns, fetchOptions]);

  const startEdit = (c: Campaign) => {
    setEditing(c);
    setForm({
      id: c.id,
      internalName: c.internalName,
      badgeText: c.badgeText,
      heading: c.heading,
      description: c.description,
      highlightText: c.highlightText,
      ctaText: c.ctaText,
      discountMode: c.discountMode,
      discountType: c.discountType,
      discountValue: String(c.discountValue),
      couponCode: c.couponCode,
      minimumOrder: String(c.minimumOrder),
      targetType: c.targetType,
      productIds: c.productIds || [],
      categoryIds: c.categoryIds || [],
      startsAt: toLocalDatetimeValue(c.startsAt),
      endsAt: toLocalDatetimeValue(c.endsAt),
      status: c.status,
      backgroundOverlayOpacity: String(c.backgroundOverlayOpacity),
      textAlignment: c.textAlignment,
      order: String(c.order),
    });
    setImagePreview(c.backgroundImageUrl || '');
    setImageFile(null);
    setShowForm(true);
  };

  const cancelForm = () => {
    setEditing(null);
    setForm(emptyCampaignForm());
    setImageFile(null);
    setImagePreview('');
    setShowForm(false);
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await optimizeCampaignImage(file);
      setImageFile(file);
      setImagePreview(dataUrl);
    } catch (err: any) {
      flash(setErrorMsg, err.message || 'Image processing failed');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setErrorMsg('');

    try {
      const payload: any = {
        ...form,
        discountValue: Number(form.discountValue || 0),
        minimumOrder: Number(form.minimumOrder || 0),
        backgroundOverlayOpacity: Number(form.backgroundOverlayOpacity || 0.55),
        order: Number(form.order || 0),
        startsAt: fromLocalDatetimeValue(form.startsAt),
        endsAt: fromLocalDatetimeValue(form.endsAt),
      };

      // Attach image data if new image selected
      if (imageFile && imagePreview) {
        payload.backgroundImageUrl = imagePreview;
      }

      const method = editing ? 'PUT' : 'POST';
      const res = await fetch('/api/promo-campaigns', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign: payload }),
      });
      const json = await res.json();

      if (!json.success) throw new Error(json.message || 'Failed to save campaign');

      flash(setSuccessMsg, editing ? 'Campaign updated!' : 'Campaign created!');
      cancelForm();
      fetchCampaigns();
    } catch (err: any) {
      flash(setErrorMsg, err.message || 'Failed to save campaign');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete campaign "${name}"? This cannot be undone.`)) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/promo-campaigns?id=${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      flash(setSuccessMsg, 'Campaign deleted');
      fetchCampaigns();
    } catch (err: any) {
      flash(setErrorMsg, err.message || 'Delete failed');
    } finally {
      setActionLoading(false);
    }
  };

  const toggleProductId = (pid: string) => {
    setForm(prev => ({
      ...prev,
      productIds: prev.productIds.includes(pid)
        ? prev.productIds.filter(x => x !== pid)
        : [...prev.productIds, pid],
    }));
  };

  const toggleCategoryId = (cid: string) => {
    setForm(prev => ({
      ...prev,
      categoryIds: prev.categoryIds.includes(cid)
        ? prev.categoryIds.filter(x => x !== cid)
        : [...prev.categoryIds, cid],
    }));
  };

  const filteredProducts = productOptions.filter(p =>
    p.name.toLowerCase().includes(productSearch.toLowerCase())
  );

  const filteredCategories = categoryOptions.filter(c =>
    c.name.toLowerCase().includes(categorySearch.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-up">
      {/* TOAST */}
      {successMsg && (
        <div className="fixed top-4 right-4 z-50 bg-black text-white text-xs font-bold px-4 py-3 rounded-lg shadow-xl flex items-center gap-2 border border-neutral-800">
          <CheckCircle className="w-4 h-4 text-emerald-400" /> {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="fixed top-4 right-4 z-50 bg-red-600 text-white text-xs font-bold px-4 py-3 rounded-lg shadow-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {errorMsg}
        </div>
      )}

      {/* HEADER + ADD BUTTON */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] text-neutral-500">
            Create timed promotional banners with automated discounts, countdowns, and product targeting.
          </p>
        </div>
        <button
          onClick={() => { cancelForm(); setShowForm(true); }}
          className="flex items-center gap-2 bg-black text-white text-[10px] font-bold uppercase tracking-wider px-4 py-2.5 rounded-lg hover:bg-neutral-800 transition shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" /> New Campaign
        </button>
      </div>

      {/* FORM */}
      {showForm && (
        <div className="bg-white border border-neutral-200/65 rounded-xl shadow-sm p-6 lg:p-7">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-display font-extrabold text-xs tracking-wider uppercase">
              {editing ? 'Edit Campaign' : 'Create New Campaign'}
            </h3>
            <button onClick={cancelForm} className="text-neutral-400 hover:text-red-500 transition">
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 text-xs">
            {/* Background Image */}
            <div>
              <label className="block font-bold text-neutral-700 uppercase tracking-wider mb-1.5">Background Image *</label>
              <div className="flex items-start gap-4">
                <label className="flex-1 border-2 border-dashed border-neutral-300 rounded-xl p-4 text-center cursor-pointer hover:border-black transition">
                  <Upload className="w-6 h-6 mx-auto text-neutral-400 mb-1" />
                  <span className="text-neutral-500 text-[11px]">Click to upload JPG/PNG/WebP</span>
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleImageSelect} />
                </label>
                {imagePreview && (
                  <div className="relative w-48 h-28 rounded-lg overflow-hidden border border-neutral-200 shrink-0">
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => { setImageFile(null); setImagePreview(''); }}
                      className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-5 h-5 flex items-center justify-center"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Two column grid for text fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-neutral-700 uppercase tracking-wider mb-1.5">Internal Name *</label>
                <input type="text" required value={form.internalName} onChange={e => setForm({ ...form, internalName: e.target.value })}
                  placeholder="e.g. Summer 2025 Flash Sale" className="w-full px-3 py-2 border rounded-lg outline-none focus:border-black transition text-xs" />
              </div>
              <div>
                <label className="block font-bold text-neutral-700 uppercase tracking-wider mb-1.5">Badge Text</label>
                <input type="text" value={form.badgeText} onChange={e => setForm({ ...form, badgeText: e.target.value })}
                  placeholder="e.g. Limited Time Only" className="w-full px-3 py-2 border rounded-lg outline-none focus:border-black transition text-xs" />
              </div>
              <div className="md:col-span-2">
                <label className="block font-bold text-neutral-700 uppercase tracking-wider mb-1.5">Heading *</label>
                <input type="text" required value={form.heading} onChange={e => setForm({ ...form, heading: e.target.value })}
                  placeholder="e.g. MID-SEASON FLASH SALE" className="w-full px-3 py-2 border rounded-lg outline-none focus:border-black transition text-xs font-bold" />
              </div>
              <div className="md:col-span-2">
                <label className="block font-bold text-neutral-700 uppercase tracking-wider mb-1.5">Description</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="Customer-facing promotional copy..." rows={2}
                  className="w-full px-3 py-2 border rounded-lg outline-none focus:border-black transition text-xs resize-none" />
              </div>
              <div>
                <label className="block font-bold text-neutral-700 uppercase tracking-wider mb-1.5">Highlight Text</label>
                <input type="text" value={form.highlightText} onChange={e => setForm({ ...form, highlightText: e.target.value })}
                  placeholder="e.g. Flat 30% OFF" className="w-full px-3 py-2 border rounded-lg outline-none focus:border-black transition text-xs" />
              </div>
              <div>
                <label className="block font-bold text-neutral-700 uppercase tracking-wider mb-1.5">CTA Button Text *</label>
                <input type="text" required value={form.ctaText} onChange={e => setForm({ ...form, ctaText: e.target.value })}
                  placeholder="e.g. Shop The Sale" className="w-full px-3 py-2 border rounded-lg outline-none focus:border-black transition text-xs" />
              </div>
            </div>

            {/* Discount Settings */}
            <div className="border-t border-neutral-200 pt-4">
              <h4 className="font-bold text-neutral-700 uppercase tracking-wider text-[10px] mb-3 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5" /> Discount Configuration
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-neutral-700 uppercase tracking-wider mb-1.5">Discount Mode</label>
                  <select value={form.discountMode} onChange={e => setForm({ ...form, discountMode: e.target.value as any })}
                    className="w-full px-3 py-2 border rounded-lg bg-white outline-none focus:border-black transition cursor-pointer text-xs font-semibold">
                    <option value="automatic">Automatic (no code needed)</option>
                    <option value="coupon">Coupon Required</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-neutral-700 uppercase tracking-wider mb-1.5">Discount Type</label>
                  <select value={form.discountType} onChange={e => setForm({ ...form, discountType: e.target.value as any })}
                    className="w-full px-3 py-2 border rounded-lg bg-white outline-none focus:border-black transition cursor-pointer text-xs font-semibold">
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount ($)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-neutral-700 uppercase tracking-wider mb-1.5">Discount Value *</label>
                  <input type="number" required min="0.01" step="0.01" value={form.discountValue}
                    onChange={e => setForm({ ...form, discountValue: e.target.value })}
                    placeholder="e.g. 30" className="w-full px-3 py-2 border rounded-lg outline-none focus:border-black transition text-xs font-semibold" />
                </div>
              </div>

              {form.discountMode === 'coupon' && (
                <div className="mt-3">
                  <label className="block font-bold text-neutral-700 uppercase tracking-wider mb-1.5">Coupon Code</label>
                  <input type="text" value={form.couponCode} onChange={e => setForm({ ...form, couponCode: e.target.value.toUpperCase() })}
                    placeholder="e.g. SUMMER30" className="w-full px-3 py-2 border rounded-lg outline-none focus:border-black transition text-xs font-mono font-bold uppercase tracking-wider" />
                </div>
              )}

              <div className="mt-3">
                <label className="block font-bold text-neutral-700 uppercase tracking-wider mb-1.5">Minimum Order ($)</label>
                <input type="number" min="0" step="1" value={form.minimumOrder}
                  onChange={e => setForm({ ...form, minimumOrder: e.target.value })}
                  placeholder="0 for no minimum" className="w-full px-3 py-2 border rounded-lg outline-none focus:border-black transition text-xs" />
              </div>
            </div>

            {/* Product Targeting */}
            <div className="border-t border-neutral-200 pt-4">
              <h4 className="font-bold text-neutral-700 uppercase tracking-wider text-[10px] mb-3 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Product Targeting
              </h4>
              <div>
                <label className="block font-bold text-neutral-700 uppercase tracking-wider mb-1.5">Target Scope</label>
                <select value={form.targetType} onChange={e => setForm({ ...form, targetType: e.target.value as any })}
                  className="w-full px-3 py-2 border rounded-lg bg-white outline-none focus:border-black transition cursor-pointer text-xs font-semibold">
                  <option value="all-products">All Products</option>
                  <option value="selected-products">Selected Products</option>
                  <option value="selected-categories">Selected Categories</option>
                </select>
              </div>

              {form.targetType === 'selected-products' && (
                <div className="mt-3">
                  <div className="relative mb-2">
                    <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-neutral-400" />
                    <input type="text" value={productSearch} onChange={e => setProductSearch(e.target.value)}
                      placeholder="Search products..." className="w-full pl-8 pr-3 py-2 border rounded-lg outline-none focus:border-black transition text-xs" />
                  </div>
                  <div className="max-h-48 overflow-y-auto border rounded-lg divide-y divide-neutral-100">
                    {filteredProducts.map(p => (
                      <label key={p.id} className="flex items-center gap-2.5 px-3 py-2 hover:bg-neutral-50 cursor-pointer text-xs">
                        <input type="checkbox" checked={form.productIds.includes(p.id)} onChange={() => toggleProductId(p.id)}
                          className="accent-black" />
                        <span className="font-medium truncate flex-1">{p.name}</span>
                        <span className="text-neutral-400 text-[10px]">${p.retailPrice}</span>
                      </label>
                    ))}
                    {filteredProducts.length === 0 && <p className="text-center py-4 text-neutral-400 text-[11px]">No products found</p>}
                  </div>
                  {form.productIds.length > 0 && (
                    <p className="text-[10px] text-neutral-500 mt-1.5">{form.productIds.length} product(s) selected</p>
                  )}
                </div>
              )}

              {form.targetType === 'selected-categories' && (
                <div className="mt-3">
                  <div className="relative mb-2">
                    <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-neutral-400" />
                    <input type="text" value={categorySearch} onChange={e => setCategorySearch(e.target.value)}
                      placeholder="Search categories..." className="w-full pl-8 pr-3 py-2 border rounded-lg outline-none focus:border-black transition text-xs" />
                  </div>
                  <div className="max-h-48 overflow-y-auto border rounded-lg divide-y divide-neutral-100">
                    {filteredCategories.map(c => (
                      <label key={c.id} className="flex items-center gap-2.5 px-3 py-2 hover:bg-neutral-50 cursor-pointer text-xs">
                        <input type="checkbox" checked={form.categoryIds.includes(c.slug)} onChange={() => toggleCategoryId(c.slug)}
                          className="accent-black" />
                        <span className="font-medium">{c.name}</span>
                        <span className="text-neutral-400 text-[10px]">/{c.slug}</span>
                      </label>
                    ))}
                    {filteredCategories.length === 0 && <p className="text-center py-4 text-neutral-400 text-[11px]">No categories found</p>}
                  </div>
                  {form.categoryIds.length > 0 && (
                    <p className="text-[10px] text-neutral-500 mt-1.5">{form.categoryIds.length} category(ies) selected</p>
                  )}
                </div>
              )}
            </div>

            {/* Scheduling */}
            <div className="border-t border-neutral-200 pt-4">
              <h4 className="font-bold text-neutral-700 uppercase tracking-wider text-[10px] mb-3 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Schedule & Timing
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-neutral-700 uppercase tracking-wider mb-1.5">Start Date & Time *</label>
                  <input type="datetime-local" required value={form.startsAt}
                    onChange={e => setForm({ ...form, startsAt: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg outline-none focus:border-black transition text-xs" />
                </div>
                <div>
                  <label className="block font-bold text-neutral-700 uppercase tracking-wider mb-1.5">End Date & Time *</label>
                  <input type="datetime-local" required value={form.endsAt}
                    onChange={e => setForm({ ...form, endsAt: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg outline-none focus:border-black transition text-xs" />
                </div>
              </div>
            </div>

            {/* Display Settings */}
            <div className="border-t border-neutral-200 pt-4">
              <h4 className="font-bold text-neutral-700 uppercase tracking-wider text-[10px] mb-3">Display Settings</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-neutral-700 uppercase tracking-wider mb-1.5">Status</label>
                  <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as any })}
                    className="w-full px-3 py-2 border rounded-lg bg-white outline-none focus:border-black transition cursor-pointer text-xs font-semibold">
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-neutral-700 uppercase tracking-wider mb-1.5">Text Alignment</label>
                  <select value={form.textAlignment} onChange={e => setForm({ ...form, textAlignment: e.target.value as any })}
                    className="w-full px-3 py-2 border rounded-lg bg-white outline-none focus:border-black transition cursor-pointer text-xs font-semibold">
                    <option value="left">Left Aligned</option>
                    <option value="center">Center Aligned</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-neutral-700 uppercase tracking-wider mb-1.5">Display Order</label>
                  <input type="number" min="0" value={form.order} onChange={e => setForm({ ...form, order: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg outline-none focus:border-black transition text-xs" />
                </div>
              </div>
              <div className="mt-3">
                <label className="block font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                  Overlay Opacity ({form.backgroundOverlayOpacity})
                </label>
                <input type="range" min="0" max="1" step="0.05" value={form.backgroundOverlayOpacity}
                  onChange={e => setForm({ ...form, backgroundOverlayOpacity: e.target.value })}
                  className="w-full accent-black" />
              </div>
            </div>

            {/* Submit */}
            <button type="submit" disabled={actionLoading}
              className="w-full py-3 bg-black text-white hover:bg-neutral-800 transition rounded-lg font-bold uppercase tracking-wider shadow-sm text-[10px]">
              {actionLoading ? 'SAVING...' : (editing ? 'UPDATE CAMPAIGN' : 'CREATE CAMPAIGN')}
            </button>
          </form>
        </div>
      )}

      {/* CAMPAIGNS LIST */}
      {loading ? (
        <div className="text-center py-12 text-neutral-400">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-black mx-auto mb-2" />
          <p className="text-xs">Loading campaigns...</p>
        </div>
      ) : campaigns.length === 0 && !showForm ? (
        <div className="text-center py-16 bg-white border border-neutral-200/65 rounded-xl">
          <Megaphone className="w-10 h-10 mx-auto text-neutral-300 mb-3" />
          <p className="text-neutral-500 text-sm font-medium">No promotional campaigns yet</p>
          <p className="text-neutral-400 text-xs mt-1">Create your first campaign to display a dynamic sale banner on the homepage.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {campaigns.map(c => {
            const timeStatus = getCampaignTimeStatus(c);
            return (
              <div key={c.id} className="bg-white border border-neutral-200/65 rounded-xl shadow-sm overflow-hidden">
                <div className="flex flex-col lg:flex-row">
                  {/* Preview thumbnail */}
                  {c.backgroundImageUrl && (
                    <div className="relative w-full lg:w-56 h-32 lg:h-auto shrink-0 bg-neutral-100">
                      <img src={c.backgroundImageUrl} alt="" className="w-full h-full object-cover" />
                      <div className="absolute inset-0" style={{ backgroundColor: `rgba(0,0,0,${c.backgroundOverlayOpacity})` }} />
                      <div className="absolute inset-0 flex items-center justify-center p-3">
                        <p className="text-white text-xs font-bold text-center line-clamp-2">{c.heading}</p>
                      </div>
                    </div>
                  )}

                  {/* Campaign info */}
                  <div className="flex-1 p-4 lg:p-5">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-display font-extrabold text-sm uppercase tracking-wide">{c.internalName || c.heading}</h4>
                          <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${timeStatus.color}`}>
                            {timeStatus.label}
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral-500 line-clamp-1">{c.description || c.heading}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button onClick={() => startEdit(c)}
                          className="w-8 h-8 rounded-lg border border-neutral-200 flex items-center justify-center hover:bg-black hover:text-white hover:border-black transition text-neutral-600 cursor-pointer"
                          title="Edit">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(c.id, c.internalName || c.heading)}
                          className="w-8 h-8 rounded-lg border border-red-100 flex items-center justify-center hover:bg-red-50 hover:border-red-200 transition text-red-500 cursor-pointer"
                          title="Delete">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Meta tags */}
                    <div className="flex flex-wrap gap-2 text-[10px]">
                      <span className="bg-neutral-100 text-neutral-600 px-2 py-1 rounded font-semibold">
                        {c.discountType === 'percentage' ? `${c.discountValue}% OFF` : `$${c.discountValue} OFF`}
                      </span>
                      <span className="bg-neutral-100 text-neutral-600 px-2 py-1 rounded font-semibold capitalize">
                        {c.discountMode}
                      </span>
                      <span className="bg-neutral-100 text-neutral-600 px-2 py-1 rounded font-semibold capitalize">
                        {c.targetType.replace(/-/g, ' ')}
                      </span>
                      <span className="bg-neutral-100 text-neutral-600 px-2 py-1 rounded font-semibold flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(c.startsAt).toLocaleDateString()} — {new Date(c.endsAt).toLocaleDateString()}
                      </span>
                      {c.couponCode && (
                        <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2 py-1 rounded font-mono font-bold">
                          {c.couponCode}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
