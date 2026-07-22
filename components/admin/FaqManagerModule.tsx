'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  CircleHelp,
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  Search,
  Filter,
  RefreshCw,
  Layers,
  X,
  Database,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { auth } from '../../lib/firebase';
import { FaqCategory, FaqItem } from '../../lib/faq';

// ── Admin auth headers (same pattern as other admin modules) ─────────────
async function adminHeaders(includeJson = false): Promise<HeadersInit> {
  const token = await auth.currentUser?.getIdToken();
  const isLocalDemo = typeof window !== 'undefined' && localStorage.getItem('cr_admin_session') === 'demo';
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(isLocalDemo ? { 'X-Admin-Demo': '1' } : {}),
    ...(includeJson ? { 'Content-Type': 'application/json' } : {}),
  };
}

// ── Toast helper ─────────────────────────────────────────────────────────
function useToast() {
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const show = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }, []);
  return { toast, show };
}

// ════════════════════════════════════════════════════════════════════════════
// FAQ MANAGER MODULE
// ════════════════════════════════════════════════════════════════════════════
export default function FaqManagerModule() {
  const { toast, show: showToast } = useToast();

  // ── Internal tab ──────────────────────────────────────────────────────
  const [internalTab, setInternalTab] = useState<'questions' | 'categories'>('questions');

  // ── Data ──────────────────────────────────────────────────────────────
  const [categories, setCategories] = useState<FaqCategory[]>([]);
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);

  // ── Category form ─────────────────────────────────────────────────────
  const [editingCategory, setEditingCategory] = useState<FaqCategory | null>(null);
  const [catForm, setCatForm] = useState({ name: '', order: 1, active: true });

  // ── FAQ form ──────────────────────────────────────────────────────────
  const [editingFaq, setEditingFaq] = useState<FaqItem | null>(null);
  const [faqForm, setFaqForm] = useState({ categoryId: '', question: '', answer: '', order: 1, active: true });

  // ── FAQ filters ───────────────────────────────────────────────────────
  const [faqSearch, setFaqSearch] = useState('');
  const [faqCategoryFilter, setFaqCategoryFilter] = useState('All');
  const [faqStatusFilter, setFaqStatusFilter] = useState<'All' | 'Active' | 'Hidden'>('All');

  // ═══════════════════════════════════════════════════════════════════════
  // DATA FETCHING
  // ═══════════════════════════════════════════════════════════════════════
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await adminHeaders();
      const [catRes, faqRes] = await Promise.all([
        fetch('/api/faq-categories?all=true', { headers }),
        fetch('/api/faqs?all=true', { headers }),
      ]);
      const catData = await catRes.json();
      const faqData = await faqRes.json();
      if (!catRes.ok || !catData.success) throw new Error(catData.message || 'Failed to load FAQ categories.');
      if (!faqRes.ok || !faqData.success) throw new Error(faqData.message || 'Failed to load FAQs.');
      setCategories(Array.isArray(catData.data) ? catData.data : []);
      setFaqs(Array.isArray(faqData.data) ? faqData.data : []);
    } catch (error: any) {
      showToast(error.message || 'Failed to load FAQ data.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ═══════════════════════════════════════════════════════════════════════
  // SEED
  // ═══════════════════════════════════════════════════════════════════════
  const handleSeed = async () => {
    if (!confirm('Seed default FAQ categories and questions? This only works when collections are empty.')) return;
    setSeeding(true);
    try {
      const headers = await adminHeaders(true);
      const res = await fetch('/api/faqs/seed', { method: 'POST', headers });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Seed failed.');
      showToast(data.message);
      fetchAll();
    } catch (err: any) {
      showToast(err.message || 'Seed failed.', 'error');
    } finally {
      setSeeding(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════
  // CATEGORY CRUD
  // ═══════════════════════════════════════════════════════════════════════
  const resetCatForm = () => {
    setEditingCategory(null);
    setCatForm({ name: '', order: categories.reduce((max, item) => Math.max(max, item.order || 0), 0) + 1, active: true });
  };

  const startEditCategory = (cat: FaqCategory) => {
    setEditingCategory(cat);
    setCatForm({ name: cat.name, order: cat.order, active: cat.active });
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = catForm.name.trim();
    if (!name || name.length < 2 || name.length > 60) {
      showToast('Category name must be 2–60 characters.', 'error');
      return;
    }
    setSaving(true);
    try {
      const headers = await adminHeaders(true);
      const method = editingCategory ? 'PUT' : 'POST';
      const payload = {
        category: {
          ...(editingCategory ? { id: editingCategory.id } : {}),
          name,
          order: Math.max(0, Number(catForm.order) || 0),
          active: catForm.active,
        },
      };
      const res = await fetch('/api/faq-categories', { method, headers, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to save category.');
      showToast(data.message || (editingCategory ? 'Category updated.' : 'Category created.'));
      resetCatForm();
      fetchAll();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleCategoryActive = async (cat: FaqCategory) => {
    setSaving(true);
    try {
      const headers = await adminHeaders(true);
      const res = await fetch('/api/faq-categories', {
        method: 'PUT',
        headers,
        body: JSON.stringify({ category: { ...cat, active: !cat.active } }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to update category visibility.');
      showToast(`Category "${cat.name}" set to ${!cat.active ? 'Active' : 'Hidden'}.`);
      fetchAll();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = async (cat: FaqCategory) => {
    if (!confirm(`Delete category "${cat.name}"? This is permanent.`)) return;
    setSaving(true);
    try {
      const headers = await adminHeaders();
      const res = await fetch(`/api/faq-categories?id=${cat.id}`, { method: 'DELETE', headers });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to delete category.');
      showToast(`Category "${cat.name}" deleted.`);
      fetchAll();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleMoveCategoryOrder = async (cat: FaqCategory, direction: 'up' | 'down') => {
    const idx = categories.findIndex((c) => c.id === cat.id);
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= categories.length) return;
    setSaving(true);
    try {
      const headers = await adminHeaders(true);
      const orderedIds = categories.map(item => item.id);
      [orderedIds[idx], orderedIds[targetIdx]] = [orderedIds[targetIdx], orderedIds[idx]];
      const response = await fetch('/api/faq-categories/reorder', { method: 'POST', headers, body: JSON.stringify({ orderedIds }) });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || 'Failed to reorder categories.');
      showToast(data.message || 'Category order updated.');
      await fetchAll();
    } catch (error: any) {
      showToast(error.message || 'Failed to reorder.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════
  // FAQ CRUD
  // ═══════════════════════════════════════════════════════════════════════
  const activeCategories = categories.filter((c) => c.active);

  useEffect(() => {
    const firstActiveCategory = categories.find(category => category.active);
    if (editingFaq || !firstActiveCategory || faqForm.categoryId) return;
    const categoryId = firstActiveCategory.id;
    const order = faqs.filter(item => item.categoryId === categoryId).reduce((max, item) => Math.max(max, item.order || 0), 0) + 1;
    setFaqForm(previous => ({ ...previous, categoryId, order }));
  }, [categories, faqs, editingFaq, faqForm.categoryId]);

  const resetFaqForm = () => {
    setEditingFaq(null);
    const categoryId = activeCategories[0]?.id || '';
    const order = faqs.filter(item => item.categoryId === categoryId).reduce((max, item) => Math.max(max, item.order || 0), 0) + 1;
    setFaqForm({ categoryId, question: '', answer: '', order, active: true });
  };

  const startEditFaq = (faq: FaqItem) => {
    setEditingFaq(faq);
    setFaqForm({ categoryId: faq.categoryId, question: faq.question, answer: faq.answer, order: faq.order, active: faq.active });
  };

  const handleSaveFaq = async (e: React.FormEvent) => {
    e.preventDefault();
    const question = faqForm.question.trim();
    const answer = faqForm.answer.trim();
    if (!faqForm.categoryId) { showToast('Please select a category.', 'error'); return; }
    if (!question || question.length < 2) { showToast('Question must be at least 2 characters.', 'error'); return; }
    if (!answer || answer.length < 2) { showToast('Answer must be at least 2 characters.', 'error'); return; }
    setSaving(true);
    try {
      const headers = await adminHeaders(true);
      const method = editingFaq ? 'PUT' : 'POST';
      const payload = {
        faq: {
          ...(editingFaq ? { id: editingFaq.id } : {}),
          categoryId: faqForm.categoryId,
          question,
          answer,
          order: Math.max(0, Number(faqForm.order) || 0),
          active: faqForm.active,
        },
      };
      const res = await fetch('/api/faqs', { method, headers, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to save FAQ.');
      showToast(data.message || (editingFaq ? 'FAQ updated.' : 'FAQ created.'));
      resetFaqForm();
      fetchAll();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleFaqActive = async (faq: FaqItem) => {
    setSaving(true);
    try {
      const headers = await adminHeaders(true);
      const res = await fetch('/api/faqs', {
        method: 'PUT',
        headers,
        body: JSON.stringify({ faq: { ...faq, active: !faq.active } }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to update FAQ visibility.');
      showToast(`FAQ ${!faq.active ? 'shown' : 'hidden'} on storefront.`);
      fetchAll();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteFaq = async (faq: FaqItem) => {
    if (!confirm(`Delete FAQ: "${faq.question}"?`)) return;
    setSaving(true);
    try {
      const headers = await adminHeaders();
      const res = await fetch(`/api/faqs?id=${faq.id}`, { method: 'DELETE', headers });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to delete FAQ.');
      showToast('FAQ deleted.');
      fetchAll();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleMoveFaqOrder = async (faq: FaqItem, direction: 'up' | 'down') => {
    // Only reorder within same category
    const sameCat = faqs.filter((f) => f.categoryId === faq.categoryId).sort((a, b) => a.order - b.order);
    const idx = sameCat.findIndex((f) => f.id === faq.id);
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= sameCat.length) return;
    setSaving(true);
    try {
      const headers = await adminHeaders(true);
      const orderedIds = sameCat.map(item => item.id);
      [orderedIds[idx], orderedIds[targetIdx]] = [orderedIds[targetIdx], orderedIds[idx]];
      const response = await fetch('/api/faqs/reorder', { method: 'POST', headers, body: JSON.stringify({ categoryId: faq.categoryId, orderedIds }) });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || 'Failed to reorder FAQs.');
      showToast(data.message || 'FAQ order updated.');
      await fetchAll();
    } catch (error: any) {
      showToast(error.message || 'Failed to reorder.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════
  // FAQ FILTERING
  // ═══════════════════════════════════════════════════════════════════════
  const categoryNameMap = Object.fromEntries(categories.map((c) => [c.id, c.name]));

  const filteredFaqs = faqs
    .filter((f) => {
      if (faqCategoryFilter !== 'All' && f.categoryId !== faqCategoryFilter) return false;
      if (faqStatusFilter === 'Active' && !f.active) return false;
      if (faqStatusFilter === 'Hidden' && f.active) return false;
      if (faqSearch) {
        const q = faqSearch.trim().toLowerCase();
        return f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q);
      }
      return true;
    })
    .sort((a, b) => {
      const catA = categories.find((c) => c.id === a.categoryId);
      const catB = categories.find((c) => c.id === b.categoryId);
      const catOrder = (catA?.order ?? 999) - (catB?.order ?? 999);
      if (catOrder !== 0) return catOrder;
      return (a.order ?? 0) - (b.order ?? 0);
    });

  // ── Count FAQs per category ───────────────────────────────────────────
  const faqCountByCat = (catId: string) => faqs.filter((f) => f.categoryId === catId).length;

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="w-5 h-5 animate-spin text-neutral-400 mr-2" />
        <span className="text-sm text-neutral-500">Loading FAQ data…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-up">
      {/* TOAST */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 text-white text-xs font-bold px-4 py-3 rounded-lg shadow-xl flex items-center gap-2 animate-slide-in ${toast.type === 'success' ? 'bg-black border border-neutral-800' : 'bg-red-600'}`}>
          {toast.type === 'success' ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* INTERNAL TABS + SEED */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex gap-2">
          <button
            onClick={() => setInternalTab('questions')}
            className={`px-4 py-2 text-xs font-bold rounded-lg uppercase tracking-wider transition ${
              internalTab === 'questions' ? 'bg-black text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            Questions & Answers
          </button>
          <button
            onClick={() => setInternalTab('categories')}
            className={`px-4 py-2 text-xs font-bold rounded-lg uppercase tracking-wider transition ${
              internalTab === 'categories' ? 'bg-black text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            Categories
          </button>
        </div>
        <div className="flex gap-2">
          {categories.length === 0 && faqs.length === 0 && (
            <button
              onClick={handleSeed}
              disabled={seeding}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition"
            >
              <Database className="w-3.5 h-3.5" />
              {seeding ? 'Seeding…' : 'Seed Default FAQs'}
            </button>
          )}
          <button
            onClick={fetchAll}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-neutral-100 text-neutral-600 rounded-lg hover:bg-neutral-200 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          CATEGORIES TAB
          ═══════════════════════════════════════════════════════════════════ */}
      {internalTab === 'categories' && (
        <div className="space-y-6">
          {/* CATEGORY FORM */}
          <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
              <Layers className="w-4 h-4 text-neutral-400" />
              {editingCategory ? 'Edit Category' : 'Add New Category'}
            </h3>
            <form onSubmit={handleSaveCategory} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-neutral-500 uppercase mb-1">Category Name *</label>
                <input
                  type="text"
                  value={catForm.name}
                  onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                  placeholder="e.g. Shipping"
                  maxLength={60}
                  className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:border-black focus:ring-1 focus:ring-black outline-none transition"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-neutral-500 uppercase mb-1">Display Order</label>
                <input
                  type="number"
                  min={0}
                  value={catForm.order}
                  onChange={(e) => setCatForm({ ...catForm, order: Number(e.target.value) })}
                  className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:border-black focus:ring-1 focus:ring-black outline-none transition"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-neutral-500 uppercase mb-1">Status</label>
                <select
                  value={catForm.active ? 'active' : 'hidden'}
                  onChange={(e) => setCatForm({ ...catForm, active: e.target.value === 'active' })}
                  className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:border-black focus:ring-1 focus:ring-black outline-none transition bg-white"
                >
                  <option value="active">Active</option>
                  <option value="hidden">Hidden</option>
                </select>
              </div>
              <div className="sm:col-span-3 flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-black text-white rounded-lg hover:bg-neutral-800 disabled:opacity-50 transition"
                >
                  {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  {editingCategory ? 'Update Category' : 'Add Category'}
                </button>
                {editingCategory && (
                  <button type="button" onClick={resetCatForm} className="px-4 py-2 text-xs font-medium text-neutral-600 bg-neutral-100 rounded-lg hover:bg-neutral-200 transition">
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* CATEGORY LIST */}
          {categories.length === 0 ? (
            <div className="text-center py-12 bg-neutral-50 border border-dashed border-neutral-300 rounded-xl">
              <Layers className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
              <p className="text-sm text-neutral-500">No categories yet. Add one above or seed defaults.</p>
            </div>
          ) : (
            <div className="bg-white border border-neutral-200 rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-neutral-50 border-b border-neutral-200 text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                      <th className="text-left px-4 py-3">Name</th>
                      <th className="text-left px-4 py-3">Slug</th>
                      <th className="text-center px-4 py-3">FAQs</th>
                      <th className="text-center px-4 py-3">Order</th>
                      <th className="text-center px-4 py-3">Status</th>
                      <th className="text-right px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {categories.map((cat, idx) => (
                      <tr key={cat.id} className="hover:bg-neutral-50 transition">
                        <td className="px-4 py-3 font-semibold text-neutral-800">{cat.name}</td>
                        <td className="px-4 py-3 text-neutral-400 text-xs font-mono">{cat.slug}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-block min-w-[24px] text-center bg-neutral-100 text-neutral-600 text-xs font-bold px-1.5 py-0.5 rounded-full">
                            {faqCountByCat(cat.id)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-neutral-500">{cat.order}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${cat.active ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-neutral-400'}`}>
                            {cat.active ? 'Active' : 'Hidden'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => handleMoveCategoryOrder(cat, 'up')} disabled={idx === 0 || saving} title="Move up" className="p-1.5 rounded hover:bg-neutral-100 text-neutral-400 hover:text-black disabled:opacity-30 transition">
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleMoveCategoryOrder(cat, 'down')} disabled={idx === categories.length - 1 || saving} title="Move down" className="p-1.5 rounded hover:bg-neutral-100 text-neutral-400 hover:text-black disabled:opacity-30 transition">
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleToggleCategoryActive(cat)} disabled={saving} title={cat.active ? 'Hide' : 'Show'} className="p-1.5 rounded hover:bg-neutral-100 text-neutral-400 hover:text-black disabled:opacity-30 transition">
                              {cat.active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                            <button onClick={() => startEditCategory(cat)} title="Edit" className="p-1.5 rounded hover:bg-neutral-100 text-neutral-400 hover:text-black transition">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDeleteCategory(cat)} disabled={saving} title="Delete" className="p-1.5 rounded hover:bg-red-50 text-neutral-400 hover:text-red-600 disabled:opacity-30 transition">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          QUESTIONS & ANSWERS TAB
          ═══════════════════════════════════════════════════════════════════ */}
      {internalTab === 'questions' && (
        <div className="space-y-6">
          {/* FAQ FORM */}
          <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
              <CircleHelp className="w-4 h-4 text-neutral-400" />
              {editingFaq ? 'Edit FAQ' : 'Add New FAQ'}
            </h3>

            {categories.length === 0 ? (
              <div className="text-center py-6 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-amber-500 mx-auto mb-1" />
                <p className="text-xs text-amber-700 font-medium">No categories exist. Create a category first or seed defaults.</p>
              </div>
            ) : (
              <form onSubmit={handleSaveFaq} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-500 uppercase mb-1">Category *</label>
                    <select
                      value={faqForm.categoryId}
                      onChange={(e) => {
                        const categoryId = e.target.value;
                        const order = faqs.filter(item => item.categoryId === categoryId).reduce((max, item) => Math.max(max, item.order || 0), 0) + 1;
                        setFaqForm({ ...faqForm, categoryId, order });
                      }}
                      className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:border-black focus:ring-1 focus:ring-black outline-none transition bg-white"
                    >
                      <option value="">Select category…</option>
                      {/* Show active categories primarily, and if editing with hidden cat, show it too */}
                      {categories
                        .filter((c) => c.active || (editingFaq && editingFaq.categoryId === c.id))
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}{!c.active ? ' (Hidden)' : ''}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-500 uppercase mb-1">Display Order</label>
                    <input
                      type="number"
                      min={0}
                      value={faqForm.order}
                      onChange={(e) => setFaqForm({ ...faqForm, order: Number(e.target.value) })}
                      className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:border-black focus:ring-1 focus:ring-black outline-none transition"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-500 uppercase mb-1">Status</label>
                    <select
                      value={faqForm.active ? 'active' : 'hidden'}
                      onChange={(e) => setFaqForm({ ...faqForm, active: e.target.value === 'active' })}
                      className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:border-black focus:ring-1 focus:ring-black outline-none transition bg-white"
                    >
                      <option value="active">Active</option>
                      <option value="hidden">Hidden</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-500 uppercase mb-1">Question *</label>
                  <input
                    type="text"
                    value={faqForm.question}
                    onChange={(e) => setFaqForm({ ...faqForm, question: e.target.value })}
                    placeholder="How long does delivery take?"
                    maxLength={200}
                    className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:border-black focus:ring-1 focus:ring-black outline-none transition"
                  />
                  <p className="text-[10px] text-neutral-400 mt-0.5 text-right">{faqForm.question.length}/200</p>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-500 uppercase mb-1">Answer *</label>
                  <textarea
                    value={faqForm.answer}
                    onChange={(e) => setFaqForm({ ...faqForm, answer: e.target.value })}
                    placeholder="Standard delivery takes 3–5 business days…"
                    rows={3}
                    maxLength={5000}
                    className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:border-black focus:ring-1 focus:ring-black outline-none transition resize-y"
                  />
                  <p className="text-[10px] text-neutral-400 mt-0.5 text-right">{faqForm.answer.length}/5000</p>
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-black text-white rounded-lg hover:bg-neutral-800 disabled:opacity-50 transition"
                  >
                    {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    {editingFaq ? 'Update FAQ' : 'Save FAQ'}
                  </button>
                  {editingFaq && (
                    <button type="button" onClick={resetFaqForm} className="px-4 py-2 text-xs font-medium text-neutral-600 bg-neutral-100 rounded-lg hover:bg-neutral-200 transition">
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            )}
          </div>

          {/* FAQ FILTERS */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex items-center border border-neutral-300 rounded-lg px-3 py-2 bg-white flex-1 focus-within:border-black transition">
              <Search className="w-4 h-4 text-neutral-400 mr-2 flex-none" />
              <input
                type="text"
                value={faqSearch}
                onChange={(e) => setFaqSearch(e.target.value)}
                placeholder="Search questions or answers…"
                className="flex-1 outline-none text-sm bg-transparent"
              />
              {faqSearch && (
                <button onClick={() => setFaqSearch('')} className="text-neutral-400 hover:text-black ml-1">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <select
              value={faqCategoryFilter}
              onChange={(e) => setFaqCategoryFilter(e.target.value)}
              className="border border-neutral-300 rounded-lg px-3 py-2 text-sm bg-white focus:border-black outline-none transition"
            >
              <option value="All">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <select
              value={faqStatusFilter}
              onChange={(e) => setFaqStatusFilter(e.target.value as any)}
              className="border border-neutral-300 rounded-lg px-3 py-2 text-sm bg-white focus:border-black outline-none transition"
            >
              <option value="All">All Status</option>
              <option value="Active">Active</option>
              <option value="Hidden">Hidden</option>
            </select>
          </div>

          {/* FAQ COUNT */}
          <p className="text-xs text-neutral-400 font-medium">
            Showing {filteredFaqs.length} of {faqs.length} FAQs
          </p>

          {/* FAQ LIST */}
          {filteredFaqs.length === 0 ? (
            <div className="text-center py-12 bg-neutral-50 border border-dashed border-neutral-300 rounded-xl">
              <CircleHelp className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
              <p className="text-sm text-neutral-500">{faqs.length === 0 ? 'No FAQs yet. Add one above or seed defaults.' : 'No FAQs match your filters.'}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredFaqs.map((faq) => {
                const catName = categoryNameMap[faq.categoryId] || faq.categoryId;
                // Find position within same category for move up/down
                const sameCat = faqs.filter((f) => f.categoryId === faq.categoryId).sort((a, b) => a.order - b.order);
                const posInCat = sameCat.findIndex((f) => f.id === faq.id);

                return (
                  <div key={faq.id} className="bg-white border border-neutral-200 rounded-xl px-4 py-3 shadow-sm hover:shadow transition">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-500">
                            {catName}
                          </span>
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${faq.active ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-neutral-400'}`}>
                            {faq.active ? 'Active' : 'Hidden'}
                          </span>
                          <span className="text-[10px] text-neutral-400">Order: {faq.order}</span>
                        </div>
                        <p className="text-sm font-semibold text-neutral-800 leading-snug">{faq.question}</p>
                        <p className="text-xs text-neutral-500 mt-1 line-clamp-2 leading-relaxed">{faq.answer}</p>
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button onClick={() => handleMoveFaqOrder(faq, 'up')} disabled={posInCat === 0 || saving} title="Move up" className="p-1.5 rounded hover:bg-neutral-100 text-neutral-400 hover:text-black disabled:opacity-30 transition">
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleMoveFaqOrder(faq, 'down')} disabled={posInCat === sameCat.length - 1 || saving} title="Move down" className="p-1.5 rounded hover:bg-neutral-100 text-neutral-400 hover:text-black disabled:opacity-30 transition">
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleToggleFaqActive(faq)} disabled={saving} title={faq.active ? 'Hide' : 'Show'} className="p-1.5 rounded hover:bg-neutral-100 text-neutral-400 hover:text-black disabled:opacity-30 transition">
                          {faq.active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                        <button onClick={() => startEditFaq(faq)} title="Edit" className="p-1.5 rounded hover:bg-neutral-100 text-neutral-400 hover:text-black transition">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDeleteFaq(faq)} disabled={saving} title="Delete" className="p-1.5 rounded hover:bg-red-50 text-neutral-400 hover:text-red-600 disabled:opacity-30 transition">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
