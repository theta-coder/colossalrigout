import React, { useState, useEffect } from 'react';
import { adminApiFetch } from '../../lib/admin-api';
import { Trash2, Edit2, Plus, X, Search, Tag, CheckCircle, AlertCircle, Eye, Users, Gift, Ticket, RefreshCw } from 'lucide-react';

interface Promotion {
  id: string;
  name: string;
  publicMessage: string;
  discountType: 'percentage' | 'fixed' | 'free-shipping';
  discountValue: number;
  maximumDiscount?: number;
  minimumOrder: number;
  applicationMode: 'automatic' | 'coupon';
  couponCode?: string;
  stackable: boolean;
  targetType: 'all-products' | 'selected-products' | 'selected-categories' | 'selected-collections';
  productIds: string[];
  categoryIds: string[];
  collectionIds: string[];
  loginRequired: boolean;
  maxUsesPerUser: number;
  globalUsageLimit?: number;
  usedCount: number;
  channel: 'online' | 'in-store' | 'both';
  storeIds: string[];
  startsAt: string;
  endsAt: string;
  status: 'draft' | 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

interface Redemption {
  id: string;
  promotionId: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  orderId?: string;
  storeId?: string;
  storeName?: string;
  channel: 'online' | 'in-store';
  discountAmount: number;
  redeemedAt: string;
}

export default function PromotionsModule() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [subTab, setSubTab] = useState<'list' | 'redemptions'>('list');
  const [loading, setLoading] = useState(true);
  const [redemptionsLoading, setRedemptionsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Resources for selectors
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [collections, setCollections] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingPromo, setEditingPromo] = useState<Promotion | null>(null);
  const [form, setForm] = useState({
    name: '',
    publicMessage: '',
    discountType: 'percentage' as 'percentage' | 'fixed' | 'free-shipping',
    discountValue: 0,
    maximumDiscount: '',
    minimumOrder: 0,
    applicationMode: 'coupon' as 'automatic' | 'coupon',
    couponCode: '',
    stackable: false,
    targetType: 'all-products' as 'all-products' | 'selected-products' | 'selected-categories' | 'selected-collections',
    productIds: [] as string[],
    categoryIds: [] as string[],
    collectionIds: [] as string[],
    loginRequired: true,
    maxUsesPerUser: 1,
    globalUsageLimit: '',
    channel: 'online' as 'online' | 'in-store' | 'both',
    storeIds: [] as string[],
    startsAt: '',
    endsAt: '',
    status: 'draft' as 'draft' | 'active' | 'inactive',
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadResources = async () => {
    try {
      const [prodRes, catRes, colRes, storeRes] = await Promise.all([
        fetch('/api/products').then(r => r.json()),
        fetch('/api/categories').then(r => r.json()),
        fetch('/api/collections').then(r => r.json()).catch(() => ({ success: true, data: [] })),
        adminApiFetch('/api/stores').then(r => r.json()).catch(() => ({ success: true, data: [] }))
      ]);

      if (prodRes.success) setProducts(prodRes.products || []);
      if (catRes.success) setCategories(catRes.data || catRes.categories || []);
      if (colRes.success) setCollections(colRes.data || []);
      if (storeRes.success) setStores(storeRes.data || []);
    } catch (err) {
      console.error('Error loading resources for selectors:', err);
    }
  };

  const fetchPromotions = async () => {
    try {
      setLoading(true);
      const res = await adminApiFetch('/api/promotions?admin=true');
      const json = await res.json();
      if (json.success) {
        setPromotions(json.data || []);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPromotions();
    loadResources();
  }, []);

  const fetchRedemptions = async () => {
    try {
      setRedemptionsLoading(true);
      const res = await adminApiFetch('/api/promotions/redemptions');
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Unable to load redemption report');
      setRedemptions(json.data || []);
    } catch (err) {
      console.error('Error fetching redemptions:', err);
    } finally {
      setRedemptionsLoading(false);
    }
  };

  useEffect(() => {
    if (subTab === 'redemptions') {
      fetchRedemptions();
    }
  }, [subTab, stores]);

  const handleEdit = (p: Promotion) => {
    setEditingPromo(p);
    setForm({
      name: p.name,
      publicMessage: p.publicMessage,
      discountType: p.discountType,
      discountValue: p.discountValue,
      maximumDiscount: p.maximumDiscount !== undefined && p.maximumDiscount !== null ? String(p.maximumDiscount) : '',
      minimumOrder: p.minimumOrder || 0,
      applicationMode: p.applicationMode || 'coupon',
      couponCode: p.couponCode || '',
      stackable: !!p.stackable,
      targetType: p.targetType || 'all-products',
      productIds: p.productIds || [],
      categoryIds: p.categoryIds || [],
      collectionIds: p.collectionIds || [],
      loginRequired: p.loginRequired !== undefined ? !!p.loginRequired : true,
      maxUsesPerUser: p.maxUsesPerUser || 1,
      globalUsageLimit: p.globalUsageLimit !== undefined && p.globalUsageLimit !== null ? String(p.globalUsageLimit) : '',
      channel: p.channel || 'online',
      storeIds: p.storeIds || [],
      startsAt: p.startsAt ? p.startsAt.substring(0, 16) : '',
      endsAt: p.endsAt ? p.endsAt.substring(0, 16) : '',
      status: p.status || 'draft',
    });
    setShowForm(true);
    setError('');
    setSuccess('');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this promotion?')) return;
    try {
      const res = await adminApiFetch(`/api/promotions?id=${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        setSuccess('Promotion deleted successfully!');
        fetchPromotions();
      } else {
        setError(json.message || 'Failed to delete promotion.');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!form.name || !form.publicMessage || !form.startsAt || !form.endsAt) {
      setError('Please fill in all required fields.');
      return;
    }

    if (new Date(form.endsAt) <= new Date(form.startsAt)) {
      setError('End date must be after start date.');
      return;
    }

    if (form.applicationMode === 'coupon' && !form.couponCode) {
      setError('Coupon code is required for coupon mode.');
      return;
    }

    setSubmitting(true);
    try {
      const method = editingPromo ? 'PUT' : 'POST';
      const payload = {
        promotion: {
          ...form,
          id: editingPromo ? editingPromo.id : undefined,
          maximumDiscount: form.maximumDiscount === '' ? null : Number(form.maximumDiscount),
          globalUsageLimit: form.globalUsageLimit === '' ? null : Number(form.globalUsageLimit),
          startsAt: new Date(form.startsAt).toISOString(),
          endsAt: new Date(form.endsAt).toISOString(),
        }
      };

      const res = await adminApiFetch('/api/promotions', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (json.success) {
        setSuccess(editingPromo ? 'Promotion updated!' : 'Promotion created!');
        setShowForm(false);
        setEditingPromo(null);
        fetchPromotions();
      } else {
        setError(json.message || 'Error occurred.');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleProductSelect = (id: string) => {
    setForm(prev => ({
      ...prev,
      productIds: prev.productIds.includes(id) 
        ? prev.productIds.filter(pid => pid !== id) 
        : [...prev.productIds, id]
    }));
  };

  const toggleCategorySelect = (id: string) => {
    setForm(prev => ({
      ...prev,
      categoryIds: prev.categoryIds.includes(id) 
        ? prev.categoryIds.filter(cid => cid !== id) 
        : [...prev.categoryIds, id]
    }));
  };

  const toggleCollectionSelect = (id: string) => {
    setForm(prev => ({
      ...prev,
      collectionIds: prev.collectionIds.includes(id) 
        ? prev.collectionIds.filter(cid => cid !== id) 
        : [...prev.collectionIds, id]
    }));
  };

  const toggleStoreSelect = (id: string) => {
    setForm(prev => ({
      ...prev,
      storeIds: prev.storeIds.includes(id) 
        ? prev.storeIds.filter(sid => sid !== id) 
        : [...prev.storeIds, id]
    }));
  };

  const filteredPromos = promotions.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.couponCode?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 text-xs text-neutral-800 animate-fade-up">
      {/* Sub tabs */}
      <div className="flex gap-2 border-b border-neutral-200">
        <button
          onClick={() => setSubTab('list')}
          className={`pb-3 px-4 font-bold uppercase tracking-wider text-xs border-b-2 transition ${
            subTab === 'list' ? 'border-black text-black' : 'border-transparent text-neutral-400 hover:text-black'
          }`}
        >
          Promotions Engine
        </button>
        <button
          onClick={() => setSubTab('redemptions')}
          className={`pb-3 px-4 font-bold uppercase tracking-wider text-xs border-b-2 transition ${
            subTab === 'redemptions' ? 'border-black text-black' : 'border-transparent text-neutral-400 hover:text-black'
          }`}
        >
          Redemption History
        </button>
      </div>

      {subTab === 'list' && (
        <>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 border border-neutral-200/65 rounded-xl shadow-sm">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-900">Advanced Promotion Rules</h2>
              <p className="text-[11px] text-neutral-500 mt-0.5">Define usage-restricted campaigns, coupons, and automatic discounts.</p>
            </div>
            <button
              onClick={() => {
                setShowForm(true);
                setEditingPromo(null);
                setForm({
                  name: '',
                  publicMessage: '',
                  discountType: 'percentage',
                  discountValue: 0,
                  maximumDiscount: '',
                  minimumOrder: 0,
                  applicationMode: 'coupon',
                  couponCode: '',
                  stackable: false,
                  targetType: 'all-products',
                  productIds: [],
                  categoryIds: [],
                  collectionIds: [],
                  loginRequired: true,
                  maxUsesPerUser: 1,
                  globalUsageLimit: '',
                  channel: 'online',
                  storeIds: [],
                  startsAt: '',
                  endsAt: '',
                  status: 'draft',
                });
                setError('');
                setSuccess('');
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-black hover:bg-neutral-800 text-white rounded-lg font-bold uppercase tracking-wider shadow-sm transition"
            >
              <Plus className="w-3.5 h-3.5" /> Create Promotion
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="font-semibold">{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span className="font-semibold">{success}</span>
            </div>
          )}

          {showForm && (
            <div className="bg-white border border-neutral-200/65 rounded-xl shadow-sm p-6 animate-fade-up">
              <div className="flex justify-between items-center pb-4 mb-4 border-b">
                <h3 className="text-xs font-extrabold uppercase tracking-widest text-neutral-900">
                  {editingPromo ? 'Edit Promotion Campaign' : 'Create Promotion Campaign'}
                </h3>
                <button onClick={() => setShowForm(false)} className="text-neutral-400 hover:text-black">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column: General info */}
                  <div className="space-y-4">
                    <div>
                      <label className="block font-bold text-neutral-700 uppercase tracking-wider mb-1.5">Promotion Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Student Offer 2026"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg outline-none focus:border-black transition"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-neutral-700 uppercase tracking-wider mb-1.5">Customer-facing Public Message *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Log in and get 10% OFF your first order!"
                        value={form.publicMessage}
                        onChange={(e) => setForm({ ...form, publicMessage: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg outline-none focus:border-black transition"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block font-bold text-neutral-700 uppercase tracking-wider mb-1.5">Discount Type</label>
                        <select
                          value={form.discountType}
                          onChange={(e) => setForm({ ...form, discountType: e.target.value as any })}
                          className="w-full px-3 py-2 border rounded-lg bg-white outline-none focus:border-black transition cursor-pointer"
                        >
                          <option value="percentage">Percentage (%)</option>
                          <option value="fixed">Fixed Cash ($)</option>
                          <option value="free-shipping">Free Shipping</option>
                        </select>
                      </div>
                      <div>
                        <label className="block font-bold text-neutral-700 uppercase tracking-wider mb-1.5">Discount Value</label>
                        <input
                          type="number"
                          disabled={form.discountType === 'free-shipping'}
                          value={form.discountValue}
                          onChange={(e) => setForm({ ...form, discountValue: Number(e.target.value) })}
                          className="w-full px-3 py-2 border rounded-lg outline-none focus:border-black transition"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block font-bold text-neutral-700 uppercase tracking-wider mb-1.5">Min. Order Subtotal ($)</label>
                        <input
                          type="number"
                          value={form.minimumOrder}
                          onChange={(e) => setForm({ ...form, minimumOrder: Number(e.target.value) })}
                          className="w-full px-3 py-2 border rounded-lg outline-none focus:border-black transition"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-neutral-700 uppercase tracking-wider mb-1.5">Max. Discount Cap ($)</label>
                        <input
                          type="number"
                          placeholder="None"
                          value={form.maximumDiscount}
                          onChange={(e) => setForm({ ...form, maximumDiscount: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg outline-none focus:border-black transition"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block font-bold text-neutral-700 uppercase tracking-wider mb-1.5">Application Mode</label>
                        <select
                          value={form.applicationMode}
                          onChange={(e) => setForm({ ...form, applicationMode: e.target.value as any })}
                          className="w-full px-3 py-2 border rounded-lg bg-white outline-none focus:border-black transition cursor-pointer"
                        >
                          <option value="coupon">Coupon Required</option>
                          <option value="automatic">Automatic Discount</option>
                        </select>
                      </div>
                      <div>
                        <label className="block font-bold text-neutral-700 uppercase tracking-wider mb-1.5">Coupon Code</label>
                        <input
                          type="text"
                          disabled={form.applicationMode === 'automatic'}
                          placeholder="e.g. CAMP10"
                          value={form.couponCode}
                          onChange={(e) => setForm({ ...form, couponCode: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg outline-none focus:border-black transition uppercase font-bold tracking-widest"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block font-bold text-neutral-700 uppercase tracking-wider mb-1.5">Max Uses Per User</label>
                        <input
                          type="number"
                          value={form.maxUsesPerUser}
                          onChange={(e) => setForm({ ...form, maxUsesPerUser: Number(e.target.value) })}
                          className="w-full px-3 py-2 border rounded-lg outline-none focus:border-black transition"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-neutral-700 uppercase tracking-wider mb-1.5">Global Usage Cap</label>
                        <input
                          type="number"
                          placeholder="Unlimited"
                          value={form.globalUsageLimit}
                          onChange={(e) => setForm({ ...form, globalUsageLimit: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg outline-none focus:border-black transition"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Targeting, Schedule, Channels */}
                  <div className="space-y-4">
                    <div>
                      <label className="block font-bold text-neutral-700 uppercase tracking-wider mb-1.5">Target Scope</label>
                      <select
                        value={form.targetType}
                        onChange={(e) => setForm({ ...form, targetType: e.target.value as any })}
                        className="w-full px-3 py-2 border rounded-lg bg-white outline-none focus:border-black transition cursor-pointer"
                      >
                        <option value="all-products">All Catalog Products</option>
                        <option value="selected-products">Specific Selected Products</option>
                        <option value="selected-categories">Specific Categories</option>
                        <option value="selected-collections">Specific Collections</option>
                      </select>
                    </div>

                    {/* Multi selectors depending on scope */}
                    {form.targetType === 'selected-products' && (
                      <div className="border rounded-lg p-3 max-h-36 overflow-y-auto space-y-1 bg-neutral-50/50">
                        {products.map(p => (
                          <label key={p.id} className="flex items-center gap-2 cursor-pointer py-0.5 hover:bg-neutral-100/50 px-1 rounded">
                            <input
                              type="checkbox"
                              checked={form.productIds.includes(p.id)}
                              onChange={() => toggleProductSelect(p.id)}
                              className="rounded text-black border-neutral-300 focus:ring-black"
                            />
                            <span>{p.name}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {form.targetType === 'selected-categories' && (
                      <div className="border rounded-lg p-3 max-h-36 overflow-y-auto space-y-1 bg-neutral-50/50">
                        {categories.map(c => (
                          <label key={c.id || c.slug} className="flex items-center gap-2 cursor-pointer py-0.5 hover:bg-neutral-100/50 px-1 rounded">
                            <input
                              type="checkbox"
                              checked={form.categoryIds.includes(c.id || c.slug)}
                              onChange={() => toggleCategorySelect(c.id || c.slug)}
                              className="rounded text-black border-neutral-300 focus:ring-black"
                            />
                            <span className="capitalize">{c.name}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {form.targetType === 'selected-collections' && (
                      <div className="border rounded-lg p-3 max-h-36 overflow-y-auto space-y-1 bg-neutral-50/50">
                        {collections.map(c => (
                          <label key={c.id} className="flex items-center gap-2 cursor-pointer py-0.5 hover:bg-neutral-100/50 px-1 rounded">
                            <input
                              type="checkbox"
                              checked={form.collectionIds.includes(c.id)}
                              onChange={() => toggleCollectionSelect(c.id)}
                              className="rounded text-black border-neutral-300 focus:ring-black"
                            />
                            <span>{c.name}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block font-bold text-neutral-700 uppercase tracking-wider mb-1.5">Channel</label>
                        <select
                          value={form.channel}
                          onChange={(e) => setForm({ ...form, channel: e.target.value as any })}
                          className="w-full px-3 py-2 border rounded-lg bg-white outline-none focus:border-black transition cursor-pointer"
                        >
                          <option value="online">Online Only</option>
                          <option value="in-store">In-Store Only</option>
                          <option value="both">Both Channels</option>
                        </select>
                      </div>
                      <div>
                        <label className="block font-bold text-neutral-700 uppercase tracking-wider mb-1.5">User Login Required</label>
                        <div className="flex items-center h-9">
                          <input
                            type="checkbox"
                            id="loginReq"
                            checked={form.loginRequired}
                            onChange={(e) => setForm({ ...form, loginRequired: e.target.checked })}
                            className="w-4 h-4 rounded text-black border-neutral-300 focus:ring-black"
                          />
                          <label htmlFor="loginReq" className="ml-2 font-semibold text-neutral-700">Yes, require login</label>
                        </div>
                      </div>
                    </div>

                    {(form.channel === 'in-store' || form.channel === 'both') && (
                      <div>
                        <label className="block font-bold text-neutral-700 uppercase tracking-wider mb-1.5">Link to Outlets</label>
                        <div className="border rounded-lg p-3 max-h-24 overflow-y-auto space-y-1 bg-neutral-50/50">
                          {stores.map(s => (
                            <label key={s.id} className="flex items-center gap-2 cursor-pointer py-0.5 hover:bg-neutral-100/50 px-1 rounded">
                              <input
                                type="checkbox"
                                checked={form.storeIds.includes(s.id)}
                                onChange={() => toggleStoreSelect(s.id)}
                                className="rounded text-black border-neutral-300 focus:ring-black"
                              />
                              <span>{s.name} ({s.city})</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block font-bold text-neutral-700 uppercase tracking-wider mb-1.5">Start Date & Time (Local) *</label>
                        <input
                          type="datetime-local"
                          required
                          value={form.startsAt}
                          onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg outline-none focus:border-black transition"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-neutral-700 uppercase tracking-wider mb-1.5">End Date & Time (Local) *</label>
                        <input
                          type="datetime-local"
                          required
                          value={form.endsAt}
                          onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg outline-none focus:border-black transition"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block font-bold text-neutral-700 uppercase tracking-wider mb-1.5">Status</label>
                        <select
                          value={form.status}
                          onChange={(e) => setForm({ ...form, status: e.target.value as any })}
                          className="w-full px-3 py-2 border rounded-lg bg-white outline-none focus:border-black transition cursor-pointer"
                        >
                          <option value="draft">Draft</option>
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      </div>
                      <div>
                        <label className="block font-bold text-neutral-700 uppercase tracking-wider mb-1.5">Can Stack with other Promos</label>
                        <div className="flex items-center h-9">
                          <input
                            type="checkbox"
                            id="stackableCheck"
                            checked={form.stackable}
                            onChange={(e) => setForm({ ...form, stackable: e.target.checked })}
                            className="w-4 h-4 rounded text-black border-neutral-300 focus:ring-black"
                          />
                          <label htmlFor="stackableCheck" className="ml-2 font-semibold text-neutral-700">Allow stacking</label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-4 py-2 border rounded-lg hover:bg-neutral-50 font-bold uppercase tracking-wider"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 bg-black hover:bg-neutral-800 text-white rounded-lg font-bold uppercase tracking-wider disabled:opacity-50"
                  >
                    {submitting ? 'Saving...' : 'Commit Promotion'}
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="bg-white border border-neutral-200/65 rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b flex items-center gap-2">
              <Search className="w-4 h-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Search promotions by name or coupon code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent outline-none font-medium"
              />
            </div>

            {loading ? (
              <div className="text-center py-12 text-neutral-400">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black mx-auto mb-2"></div>
                <p>Loading promotions...</p>
              </div>
            ) : filteredPromos.length === 0 ? (
              <div className="text-center py-16 text-neutral-500 font-medium">
                No promotions found. Click &apos;Create Promotion&apos; to start.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-neutral-50 border-b border-neutral-200 text-neutral-400 text-[10px] font-extrabold uppercase tracking-widest">
                      <th className="py-3 px-5">Campaign / Name</th>
                      <th className="py-3 px-5">Type / Mode</th>
                      <th className="py-3 px-5">Value</th>
                      <th className="py-3 px-5">Restrictions</th>
                      <th className="py-3 px-5">Channel</th>
                      <th className="py-3 px-5">Redeemed</th>
                      <th className="py-3 px-5">Status</th>
                      <th className="py-3 px-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 font-medium text-neutral-700">
                    {filteredPromos.map((p) => (
                      <tr key={p.id} className="hover:bg-neutral-50/50 transition">
                        <td className="py-4 px-5">
                          <div className="font-bold text-neutral-900">{p.name}</div>
                          {p.applicationMode === 'coupon' && (
                            <span className="font-mono bg-stone-100 px-1.5 py-0.5 border rounded text-[10px] uppercase font-bold text-stone-700 mt-0.5 inline-block">
                              {p.couponCode}
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-5">
                          <span className="capitalize">{p.discountType.replace('-', ' ')}</span>
                          <div className="text-[10px] text-neutral-400 capitalize">{p.applicationMode}</div>
                        </td>
                        <td className="py-4 px-5 font-bold text-neutral-900">
                          {p.discountType === 'percentage'
                            ? `${p.discountValue}%`
                            : p.discountType === 'fixed'
                            ? `$${p.discountValue.toFixed(2)}`
                            : 'Free'}
                        </td>
                        <td className="py-4 px-5">
                          <div>Min: ${p.minimumOrder.toFixed(2)}</div>
                          <div className="text-[10px] text-neutral-400">Target: {p.targetType.replace('-', ' ')}</div>
                        </td>
                        <td className="py-4 px-5 capitalize">{p.channel}</td>
                        <td className="py-4 px-5">
                          <span className="font-bold text-neutral-800">{p.usedCount}</span>
                          {p.globalUsageLimit ? ` / ${p.globalUsageLimit}` : ''}
                        </td>
                        <td className="py-4 px-5">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                              p.status === 'active'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : p.status === 'draft'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-neutral-100 text-neutral-500 border'
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>
                        <td className="py-4 px-5 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleEdit(p)}
                              className="w-7 h-7 rounded-lg border border-neutral-200 flex items-center justify-center hover:bg-neutral-50 transition text-neutral-500"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(p.id)}
                              className="w-7 h-7 rounded-lg border border-red-100 flex items-center justify-center hover:bg-red-50 hover:border-red-200 transition text-red-500"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {subTab === 'redemptions' && (
        <div className="bg-white border border-neutral-200/65 rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b flex justify-between items-center bg-[#fcfcfb]">
            <h3 className="font-display font-extrabold text-xs tracking-wider uppercase text-neutral-900">
              User Redemptions Audit Log
            </h3>
            <button
              onClick={fetchRedemptions}
              className="p-1.5 hover:bg-neutral-100 rounded-lg text-neutral-500 hover:text-black transition"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {redemptionsLoading ? (
            <div className="text-center py-12 text-neutral-400">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black mx-auto mb-2"></div>
              <p>Loading redemptions history...</p>
            </div>
          ) : redemptions.length === 0 ? (
            <div className="text-center py-16 text-neutral-500 font-medium">
              No redemptions logged yet in the database.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-200 text-neutral-400 text-[10px] font-extrabold uppercase tracking-widest">
                    <th className="py-3 px-5">Redemption ID</th>
                    <th className="py-3 px-5">Customer</th>
                    <th className="py-3 px-5">Promotion</th>
                    <th className="py-3 px-5">Channel / Outlet</th>
                    <th className="py-3 px-5">Saved Amount</th>
                    <th className="py-3 px-5">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 font-medium text-neutral-700">
                  {redemptions.map((r) => (
                    <tr key={r.id} className="hover:bg-neutral-50/50 transition">
                      <td className="py-4 px-5 font-mono text-[10px] text-neutral-500">{r.id}</td>
                      <td className="py-4 px-5">
                        <div className="font-bold text-neutral-900">{r.userName}</div>
                        <div className="text-[10px] text-neutral-400">{r.userEmail}</div>
                      </td>
                      <td className="py-4 px-5">
                        <div className="font-bold text-neutral-900">{r.promotionId}</div>
                        {r.orderId && (
                          <div className="text-[10px] text-neutral-400 font-mono">Order: {r.orderId}</div>
                        )}
                      </td>
                      <td className="py-4 px-5 capitalize">
                        {r.channel}
                        {r.channel === 'in-store' && r.storeName && (
                          <div className="text-[10px] text-neutral-400">{r.storeName}</div>
                        )}
                      </td>
                      <td className="py-4 px-5 font-bold text-emerald-600">${r.discountAmount.toFixed(2)}</td>
                      <td className="py-4 px-5 text-neutral-500">
                        {new Date(r.redeemedAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
