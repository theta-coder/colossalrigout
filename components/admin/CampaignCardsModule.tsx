import React, { useState, useEffect, useRef } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Trash2, Edit2, Plus, X, Upload, Eye, CheckCircle, AlertCircle, ArrowUp, ArrowDown } from 'lucide-react';
import { adminApiFetch } from '../../lib/admin-api';

interface CampaignCard {
  id: string;
  internalName: string;
  cardType: 'discount' | 'announcement' | 'store' | 'new-arrival' | 'event';
  eyebrowText: string;
  heading: string;
  description: string;
  buttonText: string;
  imageId: string;
  overlayOpacity: number;
  textPosition: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
  actionType: 'campaign-products' | 'collection' | 'product' | 'store-location' | 'custom-page';
  productId?: string;
  collectionId?: string;
  storeId?: string;
  internalPath?: string;
  hasDiscount: boolean;
  promotionId?: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  status: 'draft' | 'active' | 'inactive';
  order: number;
  backgroundImageUrl?: string;
}

export default function CampaignCardsModule() {
  const [cards, setCards] = useState<CampaignCard[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Resources for dropdowns
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [collections, setCollections] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [promotions, setPromotions] = useState<any[]>([]);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingCard, setEditingCard] = useState<CampaignCard | null>(null);
  const [form, setForm] = useState({
    internalName: '',
    cardType: 'discount' as any,
    eyebrowText: '',
    heading: '',
    description: '',
    buttonText: 'Shop Now',
    overlayOpacity: 0.4,
    textPosition: 'bottom-left' as any,
    actionType: 'campaign-products' as any,
    productId: '',
    collectionId: '',
    storeId: '',
    internalPath: '',
    hasDiscount: false,
    promotionId: '',
    startsAt: '',
    endsAt: '',
    status: 'draft' as any,
    order: 0,
    backgroundImageUrl: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchCards();
    loadResources();
  }, []);

  const loadResources = async () => {
    try {
      const [prodRes, catRes, colRes, storeRes, promoRes] = await Promise.all([
        fetch('/api/products').then(r => r.json()),
        fetch('/api/categories').then(r => r.json()),
        fetch('/api/collections').then(r => r.json()).catch(() => ({ success: true, data: [] })),
        adminApiFetch('/api/stores').then(r => r.json()).catch(() => ({ success: true, data: [] })),
        adminApiFetch('/api/promotions?admin=true').then(r => r.json()).catch(() => ({ success: true, data: [] }))
      ]);

      if (prodRes.success) setProducts(prodRes.products || []);
      if (catRes.success) setCategories(catRes.data || catRes.categories || []);
      if (colRes.success) setCollections(colRes.data || []);
      if (storeRes.success) setStores(storeRes.data || []);
      if (promoRes.success) setPromotions(promoRes.data || []);
    } catch (err) {
      console.error('Error loading resources for dropdowns:', err);
    }
  };

  const fetchCards = async () => {
    try {
      setLoading(true);
      const res = await adminApiFetch('/api/campaign-cards');
      const json = await res.json();
      if (json.success) {
        setCards(json.data || []);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be smaller than 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Compress and convert to WebP
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/webp', 0.85);
          setForm((prev) => ({ ...prev, backgroundImageUrl: dataUrl }));
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleEdit = (card: CampaignCard) => {
    setEditingCard(card);
    setForm({
      internalName: card.internalName,
      cardType: card.cardType,
      eyebrowText: card.eyebrowText,
      heading: card.heading,
      description: card.description,
      buttonText: card.buttonText,
      overlayOpacity: card.overlayOpacity,
      textPosition: card.textPosition,
      actionType: card.actionType,
      productId: card.productId || '',
      collectionId: card.collectionId || '',
      storeId: card.storeId || '',
      internalPath: card.internalPath || '',
      hasDiscount: !!card.hasDiscount,
      promotionId: card.promotionId || '',
      startsAt: card.startsAt ? card.startsAt.substring(0, 16) : '',
      endsAt: card.endsAt ? card.endsAt.substring(0, 16) : '',
      status: card.status,
      order: card.order || 0,
      backgroundImageUrl: card.backgroundImageUrl || '',
    });
    setShowForm(true);
    setError('');
    setSuccess('');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this campaign card?')) return;
    try {
      const res = await adminApiFetch(`/api/campaign-cards?id=${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        setSuccess('Campaign card deleted!');
        fetchCards();
      } else {
        setError(json.message || 'Failed to delete card.');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const moveCard = async (id: string, direction: -1 | 1) => {
    const index = cards.findIndex(card => card.id === id);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= cards.length) return;
    const reordered = [...cards];
    [reordered[index], reordered[nextIndex]] = [reordered[nextIndex], reordered[index]];
    setCards(reordered.map((card, order) => ({ ...card, order })));
    try {
      const response = await adminApiFetch('/api/campaign-cards/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: reordered.map(card => card.id) }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.message || 'Unable to reorder cards');
    } catch (reason: any) {
      setError(reason.message);
      fetchCards();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!form.heading || !form.buttonText || !form.startsAt || !form.endsAt) {
      setError('Please fill in all required fields.');
      return;
    }

    if (!form.backgroundImageUrl) {
      setError('Background image is required.');
      return;
    }

    if (new Date(form.endsAt) <= new Date(form.startsAt)) {
      setError('End date must be after start date.');
      return;
    }

    setSubmitting(true);
    try {
      const method = editingCard ? 'PUT' : 'POST';
      const payload = {
        card: {
          ...form,
          id: editingCard ? editingCard.id : undefined,
          startsAt: new Date(form.startsAt).toISOString(),
          endsAt: new Date(form.endsAt).toISOString(),
        }
      };

      const res = await adminApiFetch('/api/campaign-cards', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (json.success) {
        setSuccess(editingCard ? 'Card updated!' : 'Card created!');
        setShowForm(false);
        setEditingCard(null);
        fetchCards();
      } else {
        setError(json.message || 'Something went wrong.');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 text-xs text-neutral-800 animate-fade-up">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 border border-neutral-200/65 rounded-xl shadow-sm">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-900">Campaign Cards Carousel</h2>
          <p className="text-[11px] text-neutral-500 mt-0.5">Manage the interactive promotional card layout rendered on the homepage.</p>
        </div>
        <button
          onClick={() => {
            setShowForm(true);
            setEditingCard(null);
            setForm({
              internalName: '',
              cardType: 'discount',
              eyebrowText: '',
              heading: '',
              description: '',
              buttonText: 'Shop Now',
              overlayOpacity: 0.4,
              textPosition: 'bottom-left',
              actionType: 'campaign-products',
              productId: '',
              collectionId: '',
              storeId: '',
              internalPath: '',
              hasDiscount: false,
              promotionId: '',
              startsAt: '',
              endsAt: '',
              status: 'draft',
              order: cards.length,
              backgroundImageUrl: '',
            });
            setError('');
            setSuccess('');
          }}
          className="flex items-center gap-1.5 px-4 py-2 bg-black hover:bg-neutral-800 text-white rounded-lg font-bold uppercase tracking-wider shadow-sm transition"
        >
          <Plus className="w-3.5 h-3.5" /> Add Campaign Card
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
              {editingCard ? 'Edit Campaign Card' : 'New Campaign Card'}
            </h3>
            <button onClick={() => setShowForm(false)} className="text-neutral-400 hover:text-black">
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Side: Fields */}
              <div className="space-y-4">
                <div>
                  <label className="block font-bold text-neutral-700 uppercase tracking-wider mb-1.5">Internal Reference Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Student 10% Off Card"
                    value={form.internalName}
                    onChange={(e) => setForm({ ...form, internalName: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg outline-none focus:border-black transition"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-neutral-700 uppercase tracking-wider mb-1.5">Card Type</label>
                    <select
                      value={form.cardType}
                      onChange={(e) => setForm({ ...form, cardType: e.target.value as any })}
                      className="w-full px-3 py-2 border rounded-lg bg-white outline-none focus:border-black transition cursor-pointer"
                    >
                      <option value="discount">Discount Offer</option>
                      <option value="announcement">Announcement</option>
                      <option value="store">Store Visit</option>
                      <option value="new-arrival">New Arrival</option>
                      <option value="event">Event / Opening</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-neutral-700 uppercase tracking-wider mb-1.5">Text Alignment / Position</label>
                    <select
                      value={form.textPosition}
                      onChange={(e) => setForm({ ...form, textPosition: e.target.value as any })}
                      className="w-full px-3 py-2 border rounded-lg bg-white outline-none focus:border-black transition cursor-pointer"
                    >
                      <option value="bottom-left">Bottom Left</option>
                      <option value="bottom-right">Bottom Right</option>
                      <option value="top-left">Top Left</option>
                      <option value="top-right">Top Right</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-neutral-700 uppercase tracking-wider mb-1.5">Eyebrow Text</label>
                    <input
                      type="text"
                      placeholder="e.g. STUDENTS GET"
                      value={form.eyebrowText}
                      onChange={(e) => setForm({ ...form, eyebrowText: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg outline-none focus:border-black transition"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-neutral-700 uppercase tracking-wider mb-1.5">Heading *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 10% OFF"
                      value={form.heading}
                      onChange={(e) => setForm({ ...form, heading: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg outline-none focus:border-black transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-neutral-700 uppercase tracking-wider mb-1.5">Description</label>
                  <textarea
                    rows={2}
                    placeholder="Short descriptive caption..."
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg outline-none focus:border-black transition resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-neutral-700 uppercase tracking-wider mb-1.5">Button Text *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. GET DISCOUNT"
                      value={form.buttonText}
                      onChange={(e) => setForm({ ...form, buttonText: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg outline-none focus:border-black transition"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-neutral-700 uppercase tracking-wider mb-1.5">Overlay Opacity (0.0 - 1.0)</label>
                    <input
                      type="number"
                      step="0.05"
                      min="0"
                      max="1"
                      value={form.overlayOpacity}
                      onChange={(e) => setForm({ ...form, overlayOpacity: Number(e.target.value) })}
                      className="w-full px-3 py-2 border rounded-lg outline-none focus:border-black transition"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-neutral-700 uppercase tracking-wider mb-1.5">Click Action Target</label>
                    <select
                      value={form.actionType}
                      onChange={(e) => setForm({ ...form, actionType: e.target.value as any })}
                      className="w-full px-3 py-2 border rounded-lg bg-white outline-none focus:border-black transition cursor-pointer"
                    >
                      <option value="campaign-products">Campaign Eligible Products</option>
                      <option value="collection">Specific Collection</option>
                      <option value="product">Specific Product</option>
                      <option value="store-location">Store Location Map</option>
                      <option value="custom-page">Custom Internal Path</option>
                    </select>
                  </div>

                  <div>
                    {form.actionType === 'product' && (
                      <>
                        <label className="block font-bold text-neutral-700 uppercase tracking-wider mb-1.5">Select Product</label>
                        <select
                          value={form.productId}
                          onChange={(e) => setForm({ ...form, productId: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg bg-white outline-none focus:border-black transition cursor-pointer"
                        >
                          <option value="">-- Choose Product --</option>
                          {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </>
                    )}
                    {form.actionType === 'collection' && (
                      <>
                        <label className="block font-bold text-neutral-700 uppercase tracking-wider mb-1.5">Select Collection</label>
                        <select
                          value={form.collectionId}
                          onChange={(e) => setForm({ ...form, collectionId: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg bg-white outline-none focus:border-black transition cursor-pointer"
                        >
                          <option value="">-- Choose Collection --</option>
                          {collections.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </>
                    )}
                    {form.actionType === 'store-location' && (
                      <>
                        <label className="block font-bold text-neutral-700 uppercase tracking-wider mb-1.5">Select Store Location</label>
                        <select
                          value={form.storeId}
                          onChange={(e) => setForm({ ...form, storeId: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg bg-white outline-none focus:border-black transition cursor-pointer"
                        >
                          <option value="">-- Choose Store --</option>
                          {stores.map(s => <option key={s.id} value={s.id}>{s.name} ({s.city})</option>)}
                        </select>
                      </>
                    )}
                    {form.actionType === 'custom-page' && (
                      <>
                        <label className="block font-bold text-neutral-700 uppercase tracking-wider mb-1.5">Internal Path</label>
                        <input
                          type="text"
                          placeholder="e.g. /about or /faq"
                          value={form.internalPath}
                          onChange={(e) => setForm({ ...form, internalPath: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg outline-none focus:border-black transition"
                        />
                      </>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center h-9">
                    <input
                      type="checkbox"
                      id="hasDiscountCheck"
                      checked={form.hasDiscount}
                      onChange={(e) => setForm({ ...form, hasDiscount: e.target.checked })}
                      className="w-4 h-4 rounded text-black border-neutral-300 focus:ring-black"
                    />
                    <label htmlFor="hasDiscountCheck" className="ml-2 font-bold text-neutral-700 uppercase tracking-wider">
                      Attach Promotion
                    </label>
                  </div>
                  <div>
                    {form.hasDiscount && (
                      <>
                        <label className="block font-bold text-neutral-700 uppercase tracking-wider mb-1.5">Promotion Campaign</label>
                        <select
                          value={form.promotionId}
                          onChange={(e) => setForm({ ...form, promotionId: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg bg-white outline-none focus:border-black transition cursor-pointer"
                        >
                          <option value="">-- Select Promotion --</option>
                          {promotions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Side: Upload Image & Schedule */}
              <div className="space-y-4">
                <div>
                  <label className="block font-bold text-neutral-700 uppercase tracking-wider mb-1.5">Background Image *</label>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-neutral-300 rounded-xl p-8 text-center cursor-pointer hover:border-black transition bg-neutral-50/50"
                  >
                    <Upload className="w-6 h-6 mx-auto mb-2 text-neutral-400" />
                    <span className="font-bold text-[10px] uppercase tracking-wider">Select Card Background Image</span>
                    <p className="text-[9px] text-neutral-400 mt-1">Accepts JPEG, PNG, WebP (Max 5MB)</p>
                  </div>
                </div>

                {/* Image Preview & Design Mockup */}
                {form.backgroundImageUrl && (
                  <div>
                    <label className="block font-bold text-neutral-700 uppercase tracking-wider mb-1.5">Card Live Preview</label>
                    <div className="relative rounded-lg overflow-hidden h-40 group w-full border bg-neutral-900">
                      <img
                        src={form.backgroundImageUrl}
                        alt="Card Preview"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black" style={{ opacity: form.overlayOpacity }}></div>
                      
                      {/* Text position preview */}
                      <div className={`absolute p-4 text-white flex flex-col justify-end pointer-events-none inset-0 ${
                        form.textPosition === 'bottom-left' ? 'items-start justify-end' :
                        form.textPosition === 'bottom-right' ? 'items-end justify-end text-right' :
                        form.textPosition === 'top-left' ? 'items-start justify-start' :
                        'items-end justify-start text-right'
                      }`}>
                        <p className="text-[9px] font-semibold tracking-wide uppercase">{form.eyebrowText || 'EYEBROW TEXT'}</p>
                        <p className="font-display text-lg font-extrabold uppercase mt-0.5">{form.heading || 'MAIN HEADING'}</p>
                        <p className="text-[9px] text-neutral-200 line-clamp-1 max-w-[180px] mt-0.5">{form.description || 'Short descriptive text goes here...'}</p>
                        <span className="mt-2 inline-block bg-white text-black text-[9px] font-bold px-3 py-1 rounded">
                          {form.buttonText || 'BUTTON'}
                        </span>
                      </div>
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
                    <label className="block font-bold text-neutral-700 uppercase tracking-wider mb-1.5">Display Order</label>
                    <input
                      type="number"
                      value={form.order}
                      onChange={(e) => setForm({ ...form, order: Number(e.target.value) })}
                      className="w-full px-3 py-2 border rounded-lg outline-none focus:border-black transition"
                    />
                  </div>
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
                {submitting ? 'Creating Card...' : 'Save Campaign Card'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white border border-neutral-200/65 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-neutral-400">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black mx-auto mb-2"></div>
            <p>Loading campaign cards...</p>
          </div>
        ) : cards.length === 0 ? (
          <div className="text-center py-16 text-neutral-500 font-medium">
            No campaign cards found. Click 'Add Campaign Card' to create one.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
            {cards.map((card) => (
              <div key={card.id} className="border border-neutral-200 rounded-xl overflow-hidden bg-neutral-50 flex flex-col justify-between shadow-sm">
                {/* Visual Preview */}
                <div className="relative h-44 bg-neutral-900">
                  {card.backgroundImageUrl ? (
                    <img src={card.backgroundImageUrl} alt={card.heading} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-neutral-500">No Image</div>
                  )}
                  <div className="absolute inset-0 bg-black" style={{ opacity: card.overlayOpacity }}></div>
                  <div className={`absolute p-4 text-white flex flex-col justify-end inset-0 pointer-events-none ${
                    card.textPosition === 'bottom-left' ? 'items-start justify-end' :
                    card.textPosition === 'bottom-right' ? 'items-end justify-end text-right' :
                    card.textPosition === 'top-left' ? 'items-start justify-start' :
                    'items-end justify-start text-right'
                  }`}>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-neutral-300">{card.eyebrowText}</p>
                    <p className="text-lg font-extrabold uppercase mt-0.5">{card.heading}</p>
                    <p className="text-[9px] text-neutral-200 line-clamp-1 mt-0.5">{card.description}</p>
                    <span className="mt-2 inline-block bg-white text-black text-[9px] font-bold px-3 py-1 rounded">
                      {card.buttonText}
                    </span>
                  </div>
                </div>

                {/* Details & Actions */}
                <div className="p-4 space-y-3 bg-white border-t">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-neutral-900">{card.internalName || card.heading}</h4>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="px-1.5 py-0.5 rounded bg-stone-100 text-[9px] font-bold uppercase text-stone-600">
                          {card.cardType}
                        </span>
                        <span className="text-[10px] text-neutral-400">Order: {card.order}</span>
                      </div>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                        card.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : card.status === 'draft'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-neutral-100 text-neutral-500 border'
                      }`}
                    >
                      {card.status}
                    </span>
                  </div>

                  <div className="text-[10px] text-neutral-500 space-y-1 pt-1 border-t">
                    <div><strong>Action:</strong> {card.actionType.replace('-', ' ')}</div>
                    {card.hasDiscount && <div><strong>Attached Promo:</strong> {card.promotionId}</div>}
                    <div><strong>Schedule:</strong> {new Date(card.startsAt).toLocaleDateString()} - {new Date(card.endsAt).toLocaleDateString()}</div>
                  </div>

                  <div className="flex gap-2 pt-2 border-t justify-end">
                    <button type="button" aria-label="Move card earlier" onClick={() => moveCard(card.id, -1)} className="p-2 border rounded-lg hover:bg-neutral-50"><ArrowUp className="w-3.5 h-3.5" /></button>
                    <button type="button" aria-label="Move card later" onClick={() => moveCard(card.id, 1)} className="p-2 border rounded-lg hover:bg-neutral-50"><ArrowDown className="w-3.5 h-3.5" /></button>
                    <button
                      onClick={() => handleEdit(card)}
                      className="flex items-center gap-1 px-3 py-1.5 border rounded-lg hover:bg-neutral-50 text-neutral-600 font-bold uppercase tracking-wider"
                    >
                      <Edit2 className="w-3 h-3" /> Edit
                    </button>
                    <button
                      onClick={() => handleDelete(card.id)}
                      className="flex items-center gap-1 px-3 py-1.5 border border-red-100 hover:bg-red-50 text-red-500 rounded-lg font-bold uppercase tracking-wider"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
