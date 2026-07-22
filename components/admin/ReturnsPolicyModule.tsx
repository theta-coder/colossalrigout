'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  RotateCcw,
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  X,
  Database,
  AlertCircle,
  CheckCircle,
  FileText,
  ShieldAlert,
  ListOrdered,
  HelpCircle,
  Layout,
} from 'lucide-react';
import { auth } from '../../lib/firebase';
import {
  ReturnsPolicySettings,
  ReturnCondition,
  ReturnStep,
  ReturnInfoSection,
  ReturnSupportCta,
  ReturnsPolicyPayload,
} from '../../lib/returns-policy';

async function adminHeaders(includeJson = false): Promise<HeadersInit> {
  const token = await auth.currentUser?.getIdToken();
  const isLocalDemo = typeof window !== 'undefined' && localStorage.getItem('cr_admin_session') === 'demo';
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(isLocalDemo ? { 'X-Admin-Demo': '1' } : {}),
    ...(includeJson ? { 'Content-Type': 'application/json' } : {}),
  };
}

function useToast() {
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const show = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };
  return { toast, show };
}

export default function ReturnsPolicyModule() {
  const { toast, show: showToast } = useToast();

  const [activeSubTab, setActiveSubTab] = useState<'settings' | 'conditions' | 'steps' | 'info' | 'cta'>('settings');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);

  // Data state
  const [settings, setSettings] = useState<ReturnsPolicySettings>({
    pageTitle: 'RETURNS & EXCHANGES',
    breadcrumbLabel: 'Returns & Exchanges',
    windowTitle: '30-Day Return Window',
    windowDescription: 'Not the right fit? Send it back within 30 days of delivery for a full refund or exchange.',
    conditionsHeading: 'Return Conditions',
    stepsHeading: 'How to Return an Item',
    active: true,
  });
  const [conditions, setConditions] = useState<ReturnCondition[]>([]);
  const [steps, setSteps] = useState<ReturnStep[]>([]);
  const [infoSections, setInfoSections] = useState<ReturnInfoSection[]>([]);
  const [cta, setCta] = useState<ReturnSupportCta>({
    heading: 'Still have questions?',
    description: 'Our support team is happy to help with any return or exchange queries.',
    buttonLabel: 'CONTACT US',
    buttonPath: '/contact',
    active: true,
  });

  // Forms state
  const [editingCond, setEditingCond] = useState<ReturnCondition | null>(null);
  const [condForm, setCondForm] = useState({ text: '', active: true });

  const [editingStep, setEditingStep] = useState<ReturnStep | null>(null);
  const [stepForm, setStepForm] = useState({ title: '', description: '', linkLabel: '', linkPath: '', active: true });

  const [editingInfo, setEditingInfo] = useState<ReturnInfoSection | null>(null);
  const [infoForm, setInfoForm] = useState({ title: '', description: '', active: true });

  // Load all data
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await adminHeaders();
      const res = await fetch('/api/returns-policy?all=true', { headers });
      const json = await res.json();
      if (json.success && json.data) {
        const payload: ReturnsPolicyPayload = json.data;
        if (payload.settings) setSettings(payload.settings);
        if (payload.cta) setCta(payload.cta);
        setConditions(payload.conditions || []);
        setSteps(payload.steps || []);
        setInfoSections(payload.infoSections || []);
      }
    } catch {
      showToast('Failed to load returns policy data.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Seed Handler
  const handleSeed = async () => {
    if (!confirm('Seed default Returns & Exchanges policy content? (Only works when collections are empty)')) return;
    setSeeding(true);
    try {
      const headers = await adminHeaders(true);
      const res = await fetch('/api/returns-policy/seed', { method: 'POST', headers });
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

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. PAGE SETTINGS
  // ═══════════════════════════════════════════════════════════════════════════
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const headers = await adminHeaders(true);
      const res = await fetch('/api/returns-policy/settings', {
        method: 'POST',
        headers,
        body: JSON.stringify({ settings }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to save settings.');
      showToast('Page settings updated.');
      fetchAll();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. RETURN CONDITIONS
  // ═══════════════════════════════════════════════════════════════════════════
  const resetCondForm = () => { setEditingCond(null); setCondForm({ text: '', active: true }); };

  const startEditCond = (c: ReturnCondition) => {
    setEditingCond(c);
    setCondForm({ text: c.text, active: c.active });
  };

  const handleSaveCondition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!condForm.text.trim()) { showToast('Condition text is required.', 'error'); return; }
    setSaving(true);
    try {
      const headers = await adminHeaders(true);
      const method = editingCond ? 'PUT' : 'POST';
      const payload = {
        condition: {
          ...(editingCond ? { id: editingCond.id } : {}),
          text: condForm.text,
          active: condForm.active,
        },
      };
      const res = await fetch('/api/returns-policy/conditions', { method, headers, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to save condition.');
      showToast(data.message || (editingCond ? 'Condition updated.' : 'Condition added.'));
      resetCondForm();
      fetchAll();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleCondActive = async (c: ReturnCondition) => {
    setSaving(true);
    try {
      const headers = await adminHeaders(true);
      const res = await fetch('/api/returns-policy/conditions', {
        method: 'PUT',
        headers,
        body: JSON.stringify({ condition: { ...c, active: !c.active } }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      showToast(`Condition ${!c.active ? 'activated' : 'hidden'}.`);
      fetchAll();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCondition = async (c: ReturnCondition) => {
    if (!confirm('Delete this return condition?')) return;
    setSaving(true);
    try {
      const headers = await adminHeaders();
      const res = await fetch(`/api/returns-policy/conditions?id=${c.id}`, { method: 'DELETE', headers });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      showToast('Condition deleted.');
      fetchAll();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleMoveCondOrder = async (idx: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= conditions.length) return;
    const reordered = [...conditions];
    const [moved] = reordered.splice(idx, 1);
    reordered.splice(targetIdx, 0, moved);
    const ids = reordered.map((c) => c.id);

    setSaving(true);
    try {
      const headers = await adminHeaders(true);
      const res = await fetch('/api/returns-policy/conditions/reorder', { method: 'PATCH', headers, body: JSON.stringify({ ids }) });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      showToast('Display order updated.');
      fetchAll();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. RETURN PROCESS STEPS
  // ═══════════════════════════════════════════════════════════════════════════
  const resetStepForm = () => { setEditingStep(null); setStepForm({ title: '', description: '', linkLabel: '', linkPath: '', active: true }); };

  const startEditStep = (s: ReturnStep) => {
    setEditingStep(s);
    setStepForm({ title: s.title, description: s.description, linkLabel: s.linkLabel || '', linkPath: s.linkPath || '', active: s.active });
  };

  const handleSaveStep = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stepForm.title.trim() || !stepForm.description.trim()) {
      showToast('Step title and description are required.', 'error');
      return;
    }
    setSaving(true);
    try {
      const headers = await adminHeaders(true);
      const method = editingStep ? 'PUT' : 'POST';
      const payload = {
        step: {
          ...(editingStep ? { id: editingStep.id } : {}),
          ...stepForm,
        },
      };
      const res = await fetch('/api/returns-policy/steps', { method, headers, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to save step.');
      showToast(data.message || (editingStep ? 'Step updated.' : 'Step added.'));
      resetStepForm();
      fetchAll();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStepActive = async (s: ReturnStep) => {
    setSaving(true);
    try {
      const headers = await adminHeaders(true);
      const res = await fetch('/api/returns-policy/steps', {
        method: 'PUT',
        headers,
        body: JSON.stringify({ step: { ...s, active: !s.active } }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      showToast(`Step ${!s.active ? 'activated' : 'hidden'}.`);
      fetchAll();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteStep = async (s: ReturnStep) => {
    if (!confirm(`Delete step "${s.title}"?`)) return;
    setSaving(true);
    try {
      const headers = await adminHeaders();
      const res = await fetch(`/api/returns-policy/steps?id=${s.id}`, { method: 'DELETE', headers });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      showToast('Step deleted.');
      fetchAll();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleMoveStepOrder = async (idx: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= steps.length) return;
    const reordered = [...steps];
    const [moved] = reordered.splice(idx, 1);
    reordered.splice(targetIdx, 0, moved);
    const ids = reordered.map((s) => s.id);

    setSaving(true);
    try {
      const headers = await adminHeaders(true);
      const res = await fetch('/api/returns-policy/steps/reorder', { method: 'PATCH', headers, body: JSON.stringify({ ids }) });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      showToast('Step display order updated.');
      fetchAll();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. INFORMATION SECTIONS
  // ═══════════════════════════════════════════════════════════════════════════
  const resetInfoForm = () => { setEditingInfo(null); setInfoForm({ title: '', description: '', active: true }); };

  const startEditInfo = (i: ReturnInfoSection) => {
    setEditingInfo(i);
    setInfoForm({ title: i.title, description: i.description, active: i.active });
  };

  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!infoForm.title.trim() || !infoForm.description.trim()) {
      showToast('Section title and description are required.', 'error');
      return;
    }
    setSaving(true);
    try {
      const headers = await adminHeaders(true);
      const method = editingInfo ? 'PUT' : 'POST';
      const payload = {
        infoSection: {
          ...(editingInfo ? { id: editingInfo.id } : {}),
          ...infoForm,
        },
      };
      const res = await fetch('/api/returns-policy/info-sections', { method, headers, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to save section.');
      showToast(data.message || (editingInfo ? 'Section updated.' : 'Section added.'));
      resetInfoForm();
      fetchAll();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleInfoActive = async (i: ReturnInfoSection) => {
    setSaving(true);
    try {
      const headers = await adminHeaders(true);
      const res = await fetch('/api/returns-policy/info-sections', {
        method: 'PUT',
        headers,
        body: JSON.stringify({ infoSection: { ...i, active: !i.active } }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      showToast(`Section ${!i.active ? 'activated' : 'hidden'}.`);
      fetchAll();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteInfo = async (i: ReturnInfoSection) => {
    if (!confirm(`Delete section "${i.title}"?`)) return;
    setSaving(true);
    try {
      const headers = await adminHeaders();
      const res = await fetch(`/api/returns-policy/info-sections?id=${i.id}`, { method: 'DELETE', headers });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      showToast('Section deleted.');
      fetchAll();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleMoveInfoOrder = async (idx: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= infoSections.length) return;
    const reordered = [...infoSections];
    const [moved] = reordered.splice(idx, 1);
    reordered.splice(targetIdx, 0, moved);
    const ids = reordered.map((i) => i.id);

    setSaving(true);
    try {
      const headers = await adminHeaders(true);
      const res = await fetch('/api/returns-policy/info-sections/reorder', { method: 'PATCH', headers, body: JSON.stringify({ ids }) });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      showToast('Section display order updated.');
      fetchAll();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. SUPPORT CTA
  // ═══════════════════════════════════════════════════════════════════════════
  const handleSaveCta = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const headers = await adminHeaders(true);
      const res = await fetch('/api/returns-policy/cta', {
        method: 'POST',
        headers,
        body: JSON.stringify({ cta }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to save CTA.');
      showToast('Support CTA updated.');
      fetchAll();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="w-5 h-5 animate-spin text-neutral-400 mr-2" />
        <span className="text-sm text-neutral-500">Loading returns policy data…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-up">
      {/* TOAST */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 text-white text-xs font-bold px-4 py-3 rounded-lg shadow-xl flex items-center gap-2 animate-slide-in ${
            toast.type === 'success' ? 'bg-black border border-neutral-800' : 'bg-red-600'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* INTERNAL SUB-TABS & SEED BUTTON */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {[
            { key: 'settings', label: 'Page Settings', icon: Layout },
            { key: 'conditions', label: `Conditions (${conditions.length})`, icon: ShieldAlert },
            { key: 'steps', label: `Return Steps (${steps.length})`, icon: ListOrdered },
            { key: 'info', label: `Info Sections (${infoSections.length})`, icon: FileText },
            { key: 'cta', label: 'Support CTA', icon: HelpCircle },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveSubTab(tab.key as any)}
                className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg uppercase tracking-wider transition ${
                  isActive ? 'bg-black text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex gap-2">
          {conditions.length === 0 && steps.length === 0 && (
            <button
              onClick={handleSeed}
              disabled={seeding}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition"
            >
              <Database className="w-3.5 h-3.5" />
              {seeding ? 'Seeding…' : 'Seed Default Policy'}
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

      {/* ═══════════════════════════════════════════════════════════════════════
          SUB-TAB 1: PAGE SETTINGS
          ═══════════════════════════════════════════════════════════════════════ */}
      {activeSubTab === 'settings' && (
        <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
            <Layout className="w-4 h-4 text-neutral-400" />
            General Returns Page Settings
          </h3>

          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-neutral-500 uppercase mb-1">Page Title *</label>
                <input
                  type="text"
                  value={settings.pageTitle}
                  onChange={(e) => setSettings({ ...settings, pageTitle: e.target.value })}
                  maxLength={100}
                  className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:border-black outline-none transition"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-500 uppercase mb-1">Breadcrumb Label *</label>
                <input
                  type="text"
                  value={settings.breadcrumbLabel}
                  onChange={(e) => setSettings({ ...settings, breadcrumbLabel: e.target.value })}
                  maxLength={60}
                  className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:border-black outline-none transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t pt-4">
              <div>
                <label className="block text-[11px] font-semibold text-neutral-500 uppercase mb-1">Return Window (Days)</label>
                <input type="number" min={1} max={365} value={settings.returnWindowDays ?? 30} onChange={(e) => setSettings({ ...settings, returnWindowDays: Number(e.target.value) })} className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <label className="flex items-center text-xs font-semibold mt-5"><input type="checkbox" checked={settings.productPageEnabled !== false} onChange={(e) => setSettings({ ...settings, productPageEnabled: e.target.checked })} className="mr-2" />Show returns summary on Product page</label>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-neutral-500 uppercase mb-1">Product Page Summary</label>
              <textarea rows={2} maxLength={500} value={settings.productPageSummary || ''} onChange={(e) => setSettings({ ...settings, productPageSummary: e.target.value })} placeholder="Short returns message shown on product pages" className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-neutral-500 uppercase mb-1">Return Window Title *</label>
                <input
                  type="text"
                  value={settings.windowTitle}
                  onChange={(e) => setSettings({ ...settings, windowTitle: e.target.value })}
                  maxLength={100}
                  placeholder="30-Day Return Window"
                  className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:border-black outline-none transition"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-500 uppercase mb-1">Page Visibility</label>
                <select
                  value={settings.active ? 'active' : 'hidden'}
                  onChange={(e) => setSettings({ ...settings, active: e.target.value === 'active' })}
                  className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:border-black outline-none transition bg-white"
                >
                  <option value="active">Active (Visible on Storefront)</option>
                  <option value="hidden">Hidden (Show Policy Unavailable Notice)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-neutral-500 uppercase mb-1">Return Window Description *</label>
              <textarea
                rows={2}
                value={settings.windowDescription}
                onChange={(e) => setSettings({ ...settings, windowDescription: e.target.value })}
                maxLength={1000}
                placeholder="Not the right fit? Send it back within 30 days..."
                className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:border-black outline-none transition resize-y"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-neutral-500 uppercase mb-1">Conditions Section Heading *</label>
                <input
                  type="text"
                  value={settings.conditionsHeading}
                  onChange={(e) => setSettings({ ...settings, conditionsHeading: e.target.value })}
                  maxLength={100}
                  className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:border-black outline-none transition"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-500 uppercase mb-1">Process Steps Heading *</label>
                <input
                  type="text"
                  value={settings.stepsHeading}
                  onChange={(e) => setSettings({ ...settings, stepsHeading: e.target.value })}
                  maxLength={100}
                  className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:border-black outline-none transition"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 text-xs font-bold bg-black text-white rounded-lg hover:bg-neutral-800 disabled:opacity-50 transition"
              >
                {saving ? 'Saving Settings…' : 'Save Page Settings'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          SUB-TAB 2: RETURN CONDITIONS
          ═══════════════════════════════════════════════════════════════════════ */}
      {activeSubTab === 'conditions' && (
        <div className="space-y-6">
          {/* CONDITION FORM */}
          <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-neutral-400" />
              {editingCond ? 'Edit Condition' : 'Add New Condition'}
            </h3>

            <form onSubmit={handleSaveCondition} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-neutral-500 uppercase mb-1">Condition Text *</label>
                <input
                  type="text"
                  value={condForm.text}
                  onChange={(e) => setCondForm({ ...condForm, text: e.target.value })}
                  placeholder="e.g. Item must be unworn, unwashed, and in original condition"
                  maxLength={500}
                  className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:border-black outline-none transition"
                />
                <p className="text-[10px] text-neutral-400 mt-0.5 text-right">{condForm.text.length}/500</p>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 text-xs font-medium text-neutral-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={condForm.active}
                    onChange={(e) => setCondForm({ ...condForm, active: e.target.checked })}
                    className="rounded border-neutral-300 text-black focus:ring-black"
                  />
                  Active (Visible on Storefront)
                </label>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-black text-white rounded-lg hover:bg-neutral-800 disabled:opacity-50 transition"
                  >
                    {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    {editingCond ? 'Update Condition' : 'Add Condition'}
                  </button>
                  {editingCond && (
                    <button type="button" onClick={resetCondForm} className="px-4 py-2 text-xs font-medium text-neutral-600 bg-neutral-100 rounded-lg hover:bg-neutral-200 transition">
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>

          {/* CONDITIONS LIST */}
          {conditions.length === 0 ? (
            <div className="text-center py-12 bg-neutral-50 border border-dashed border-neutral-300 rounded-xl">
              <ShieldAlert className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
              <p className="text-sm text-neutral-500">No return conditions added yet. Add one above or seed defaults.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {conditions.map((c, idx) => (
                <div key={c.id} className="bg-white border border-neutral-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3 shadow-sm hover:shadow transition">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs font-mono font-bold text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded">
                      #{idx + 1}
                    </span>
                    <span className="text-sm font-medium text-neutral-800 truncate">{c.text}</span>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full shrink-0 ${c.active ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-neutral-400'}`}>
                      {c.active ? 'Active' : 'Hidden'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => handleMoveCondOrder(idx, 'up')} disabled={idx === 0 || saving} title="Move up" className="p-1.5 rounded hover:bg-neutral-100 text-neutral-400 hover:text-black disabled:opacity-30 transition">
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleMoveCondOrder(idx, 'down')} disabled={idx === conditions.length - 1 || saving} title="Move down" className="p-1.5 rounded hover:bg-neutral-100 text-neutral-400 hover:text-black disabled:opacity-30 transition">
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleToggleCondActive(c)} disabled={saving} title={c.active ? 'Hide' : 'Show'} className="p-1.5 rounded hover:bg-neutral-100 text-neutral-400 hover:text-black disabled:opacity-30 transition">
                      {c.active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={() => startEditCond(c)} title="Edit" className="p-1.5 rounded hover:bg-neutral-100 text-neutral-400 hover:text-black transition">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDeleteCondition(c)} disabled={saving} title="Delete" className="p-1.5 rounded hover:bg-red-50 text-neutral-400 hover:text-red-600 disabled:opacity-30 transition">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          SUB-TAB 3: RETURN PROCESS STEPS
          ═══════════════════════════════════════════════════════════════════════ */}
      {activeSubTab === 'steps' && (
        <div className="space-y-6">
          {/* STEP FORM */}
          <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
              <ListOrdered className="w-4 h-4 text-neutral-400" />
              {editingStep ? 'Edit Process Step' : 'Add New Process Step'}
            </h3>

            <form onSubmit={handleSaveStep} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-neutral-500 uppercase mb-1">Step Title *</label>
                <input
                  type="text"
                  value={stepForm.title}
                  onChange={(e) => setStepForm({ ...stepForm, title: e.target.value })}
                  placeholder="e.g. Start your return"
                  maxLength={100}
                  className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:border-black outline-none transition"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-500 uppercase mb-1">Step Description *</label>
                <textarea
                  rows={3}
                  value={stepForm.description}
                  onChange={(e) => setStepForm({ ...stepForm, description: e.target.value })}
                  placeholder="Explain what the customer needs to do..."
                  maxLength={2000}
                  className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:border-black outline-none transition resize-y"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-500 uppercase mb-1">Optional Link Label</label>
                  <input
                    type="text"
                    value={stepForm.linkLabel}
                    onChange={(e) => setStepForm({ ...stepForm, linkLabel: e.target.value })}
                    placeholder="e.g. Track Order"
                    maxLength={60}
                    className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:border-black outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-neutral-500 uppercase mb-1">Optional Internal Link Path</label>
                  <input
                    type="text"
                    value={stepForm.linkPath}
                    onChange={(e) => setStepForm({ ...stepForm, linkPath: e.target.value })}
                    placeholder="e.g. /track-order"
                    className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:border-black outline-none transition"
                  />
                  <p className="text-[10px] text-neutral-400 mt-0.5">Must start with &quot;/&quot; for safe internal routing.</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 text-xs font-medium text-neutral-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={stepForm.active}
                    onChange={(e) => setStepForm({ ...stepForm, active: e.target.checked })}
                    className="rounded border-neutral-300 text-black focus:ring-black"
                  />
                  Active (Visible on Storefront)
                </label>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-black text-white rounded-lg hover:bg-neutral-800 disabled:opacity-50 transition"
                  >
                    {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    {editingStep ? 'Update Step' : 'Add Step'}
                  </button>
                  {editingStep && (
                    <button type="button" onClick={resetStepForm} className="px-4 py-2 text-xs font-medium text-neutral-600 bg-neutral-100 rounded-lg hover:bg-neutral-200 transition">
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>

          {/* STEPS LIST */}
          {steps.length === 0 ? (
            <div className="text-center py-12 bg-neutral-50 border border-dashed border-neutral-300 rounded-xl">
              <ListOrdered className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
              <p className="text-sm text-neutral-500">No process steps added yet. Add one above or seed defaults.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {steps.map((s, idx) => (
                <div key={s.id} className="bg-white border border-neutral-200 rounded-xl p-4 shadow-sm hover:shadow transition">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <span className="w-7 h-7 rounded-full bg-black text-white text-xs font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-neutral-900 truncate">{s.title}</h4>
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full shrink-0 ${s.active ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-neutral-400'}`}>
                            {s.active ? 'Active' : 'Hidden'}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-600 mt-1 font-light leading-relaxed">{s.description}</p>
                        {s.linkLabel && s.linkPath && (
                          <p className="text-[11px] text-neutral-400 mt-1 font-mono">
                            Link: &ldquo;{s.linkLabel}&rdquo; &rarr; {s.linkPath}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => handleMoveStepOrder(idx, 'up')} disabled={idx === 0 || saving} title="Move up" className="p-1.5 rounded hover:bg-neutral-100 text-neutral-400 hover:text-black disabled:opacity-30 transition">
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleMoveStepOrder(idx, 'down')} disabled={idx === steps.length - 1 || saving} title="Move down" className="p-1.5 rounded hover:bg-neutral-100 text-neutral-400 hover:text-black disabled:opacity-30 transition">
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleToggleStepActive(s)} disabled={saving} title={s.active ? 'Hide' : 'Show'} className="p-1.5 rounded hover:bg-neutral-100 text-neutral-400 hover:text-black disabled:opacity-30 transition">
                        {s.active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                      <button onClick={() => startEditStep(s)} title="Edit" className="p-1.5 rounded hover:bg-neutral-100 text-neutral-400 hover:text-black transition">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDeleteStep(s)} disabled={saving} title="Delete" className="p-1.5 rounded hover:bg-red-50 text-neutral-400 hover:text-red-600 disabled:opacity-30 transition">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          SUB-TAB 4: INFORMATION SECTIONS
          ═══════════════════════════════════════════════════════════════════════ */}
      {activeSubTab === 'info' && (
        <div className="space-y-6">
          {/* INFO FORM */}
          <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-neutral-400" />
              {editingInfo ? 'Edit Information Section' : 'Add New Information Section'}
            </h3>

            <form onSubmit={handleSaveInfo} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-neutral-500 uppercase mb-1">Section Title *</label>
                <input
                  type="text"
                  value={infoForm.title}
                  onChange={(e) => setInfoForm({ ...infoForm, title: e.target.value })}
                  placeholder="e.g. Refund Timeline or Exchanges"
                  maxLength={100}
                  className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:border-black outline-none transition"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-500 uppercase mb-1">Description *</label>
                <textarea
                  rows={3}
                  value={infoForm.description}
                  onChange={(e) => setInfoForm({ ...infoForm, description: e.target.value })}
                  placeholder="Enter section content details..."
                  maxLength={3000}
                  className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:border-black outline-none transition resize-y"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 text-xs font-medium text-neutral-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={infoForm.active}
                    onChange={(e) => setInfoForm({ ...infoForm, active: e.target.checked })}
                    className="rounded border-neutral-300 text-black focus:ring-black"
                  />
                  Active (Visible on Storefront)
                </label>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-black text-white rounded-lg hover:bg-neutral-800 disabled:opacity-50 transition"
                  >
                    {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    {editingInfo ? 'Update Section' : 'Add Section'}
                  </button>
                  {editingInfo && (
                    <button type="button" onClick={resetInfoForm} className="px-4 py-2 text-xs font-medium text-neutral-600 bg-neutral-100 rounded-lg hover:bg-neutral-200 transition">
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>

          {/* INFO LIST */}
          {infoSections.length === 0 ? (
            <div className="text-center py-12 bg-neutral-50 border border-dashed border-neutral-300 rounded-xl">
              <FileText className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
              <p className="text-sm text-neutral-500">No information sections added yet. Add one above or seed defaults.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {infoSections.map((i, idx) => (
                <div key={i.id} className="bg-white border border-neutral-200 rounded-xl p-4 shadow-sm hover:shadow transition">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-sm font-bold text-neutral-900">{i.title}</h4>
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full shrink-0 ${i.active ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-neutral-400'}`}>
                          {i.active ? 'Active' : 'Hidden'}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-600 font-light leading-relaxed whitespace-pre-line">{i.description}</p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => handleMoveInfoOrder(idx, 'up')} disabled={idx === 0 || saving} title="Move up" className="p-1.5 rounded hover:bg-neutral-100 text-neutral-400 hover:text-black disabled:opacity-30 transition">
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleMoveInfoOrder(idx, 'down')} disabled={idx === infoSections.length - 1 || saving} title="Move down" className="p-1.5 rounded hover:bg-neutral-100 text-neutral-400 hover:text-black disabled:opacity-30 transition">
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleToggleInfoActive(i)} disabled={saving} title={i.active ? 'Hide' : 'Show'} className="p-1.5 rounded hover:bg-neutral-100 text-neutral-400 hover:text-black disabled:opacity-30 transition">
                        {i.active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                      <button onClick={() => startEditInfo(i)} title="Edit" className="p-1.5 rounded hover:bg-neutral-100 text-neutral-400 hover:text-black transition">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDeleteInfo(i)} disabled={saving} title="Delete" className="p-1.5 rounded hover:bg-red-50 text-neutral-400 hover:text-red-600 disabled:opacity-30 transition">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          SUB-TAB 5: SUPPORT CTA
          ═══════════════════════════════════════════════════════════════════════ */}
      {activeSubTab === 'cta' && (
        <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-neutral-400" />
            Bottom Support Call-To-Action Card
          </h3>

          <form onSubmit={handleSaveCta} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-neutral-500 uppercase mb-1">Heading *</label>
                <input
                  type="text"
                  value={cta.heading}
                  onChange={(e) => setCta({ ...cta, heading: e.target.value })}
                  maxLength={100}
                  placeholder="Still have questions?"
                  className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:border-black outline-none transition"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-500 uppercase mb-1">CTA Visibility</label>
                <select
                  value={cta.active ? 'active' : 'hidden'}
                  onChange={(e) => setCta({ ...cta, active: e.target.value === 'active' })}
                  className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:border-black outline-none transition bg-white"
                >
                  <option value="active">Active (Visible)</option>
                  <option value="hidden">Hidden</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-neutral-500 uppercase mb-1">Description *</label>
              <textarea
                rows={2}
                value={cta.description}
                onChange={(e) => setCta({ ...cta, description: e.target.value })}
                maxLength={1000}
                placeholder="Our support team is happy to help with any return queries..."
                className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:border-black outline-none transition resize-y"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-neutral-500 uppercase mb-1">Button Label *</label>
                <input
                  type="text"
                  value={cta.buttonLabel}
                  onChange={(e) => setCta({ ...cta, buttonLabel: e.target.value })}
                  maxLength={60}
                  placeholder="CONTACT US"
                  className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:border-black outline-none transition"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-500 uppercase mb-1">Button Path *</label>
                <input
                  type="text"
                  value={cta.buttonPath}
                  onChange={(e) => setCta({ ...cta, buttonPath: e.target.value })}
                  placeholder="/contact"
                  className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:border-black outline-none transition"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 text-xs font-bold bg-black text-white rounded-lg hover:bg-neutral-800 disabled:opacity-50 transition"
              >
                {saving ? 'Saving CTA…' : 'Save Support CTA'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
