'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Mail,
  Inbox,
  Layout,
  MapPin,
  HelpCircle,
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
  Search,
  Filter,
  Phone,
  Clock,
  MessageCircle,
  ExternalLink,
  Tag,
  UserCheck,
  FileText,
  AlertTriangle,
  ChevronRight,
  Send,
  Upload,
} from 'lucide-react';
import { auth } from '../../lib/firebase';
import {
  ContactPageSettings,
  ContactDetail,
  ContactSubject,
  ContactMapSettings,
  ContactInquiry,
  ContactPagePayload,
  InquiryStatus,
  InquiryPriority,
  defaultContactSettings,
  defaultContactMapSettings,
} from '../../lib/contact-page';

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

export default function ContactInquiriesModule() {
  const { toast, show: showToast } = useToast();

  const [activeSubTab, setActiveSubTab] = useState<'inbox' | 'page' | 'details' | 'subjects' | 'map'>('inbox');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);

  // Data state
  const [inquiries, setInquiries] = useState<ContactInquiry[]>([]);
  const [inquiryCounts, setInquiryCounts] = useState<Record<InquiryStatus | 'all', number>>({
    all: 0,
    new: 0,
    in_progress: 0,
    resolved: 0,
    archived: 0,
    spam: 0,
  });

  const [settings, setSettings] = useState<ContactPageSettings>(defaultContactSettings);
  const [details, setDetails] = useState<ContactDetail[]>([]);
  const [subjects, setSubjects] = useState<ContactSubject[]>([]);
  const [map, setMap] = useState<ContactMapSettings>(defaultContactMapSettings);
  const [heroImageFile, setHeroImageFile] = useState<File | null>(null);
  const [mapImageFile, setMapImageFile] = useState<File | null>(null);

  // Inbox filtering & selection
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<InquiryStatus | 'all'>('all');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [selectedInquiry, setSelectedInquiry] = useState<ContactInquiry | null>(null);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Drawer / Notes form state
  const [adminNotes, setAdminNotes] = useState('');
  const [assignedTo, setAssignedTo] = useState('');

  // Contact detail form
  const [editingDetail, setEditingDetail] = useState<ContactDetail | null>(null);
  const [detailForm, setDetailForm] = useState({
    type: 'address' as ContactDetail['type'],
    label: '',
    value: '',
    href: '',
    icon: 'map-pin' as ContactDetail['icon'],
    active: true,
  });

  // Contact subject form
  const [editingSubject, setEditingSubject] = useState<ContactSubject | null>(null);
  const [subjectForm, setSubjectForm] = useState({ name: '', recipientEmail: '', active: true });

  // ═══════════════════════════════════════════════════════════════════════════
  // FETCH DATA
  // ═══════════════════════════════════════════════════════════════════════════
  const fetchInquiries = useCallback(async () => {
    try {
      const headers = await adminHeaders();
      const queryParams = new URLSearchParams();
      if (search) queryParams.set('search', search);
      if (statusFilter !== 'all') queryParams.set('status', statusFilter);
      if (subjectFilter !== 'all') queryParams.set('subjectId', subjectFilter);

      const res = await fetch(`/api/admin/contact-inquiries?${queryParams.toString()}`, { headers });
      const json = await res.json();
      if (json.success && json.data) {
        setInquiries(json.data.inquiries || []);
        if (json.data.counts) setInquiryCounts(json.data.counts);
      }
    } catch {
      showToast('Failed to load inquiries.', 'error');
    }
  }, [search, statusFilter, subjectFilter]);

  const fetchPagePayload = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await adminHeaders();
      const res = await fetch('/api/contact-page?all=true', { headers });
      const json = await res.json();
      if (json.success && json.data) {
        const payload: ContactPagePayload = json.data;
        if (payload.settings) setSettings(payload.settings);
        if (payload.map) setMap(payload.map);
        setDetails(payload.details || []);
        setSubjects(payload.subjects || []);
      }
    } catch {
      showToast('Failed to load page config.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPagePayload();
  }, [fetchPagePayload]);

  useEffect(() => {
    if (activeSubTab === 'inbox') {
      fetchInquiries();
    }
  }, [activeSubTab, fetchInquiries]);

  // Seed Handler
  const handleSeed = async () => {
    if (!confirm('Seed default Contact Page settings, map, details, and inquiry subjects?')) return;
    setSeeding(true);
    try {
      const headers = await adminHeaders(true);
      const res = await fetch('/api/contact-page/seed', { method: 'POST', headers });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Seed failed.');
      showToast(data.message);
      fetchPagePayload();
    } catch (err: any) {
      showToast(err.message || 'Seed failed.', 'error');
    } finally {
      setSeeding(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // INBOX ACTIONS
  // ═══════════════════════════════════════════════════════════════════════════
  const openInquiryDrawer = (inq: ContactInquiry) => {
    setSelectedInquiry(inq);
    setAdminNotes(inq.adminNotes || '');
    setAssignedTo(inq.assignedTo || '');
  };

  const handleUpdateInquiry = async (inqId: string, updates: Partial<ContactInquiry>) => {
    setSaving(true);
    try {
      const headers = await adminHeaders(true);
      const res = await fetch(`/api/admin/contact-inquiries/${inqId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to update inquiry.');
      showToast('Inquiry updated.');
      if (selectedInquiry?.id === inqId) {
        setSelectedInquiry(data.data);
      }
      fetchInquiries();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteInquiry = async (inqId: string) => {
    if (!confirm('Permanently delete this inquiry document?')) return;
    setSaving(true);
    try {
      const headers = await adminHeaders();
      const res = await fetch(`/api/admin/contact-inquiries/${inqId}`, { method: 'DELETE', headers });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      showToast('Inquiry deleted.');
      if (selectedInquiry?.id === inqId) setSelectedInquiry(null);
      fetchInquiries();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleBulkStatusChange = async (status: InquiryStatus) => {
    if (selectedIds.length === 0) return;
    setSaving(true);
    try {
      const headers = await adminHeaders(true);
      const res = await fetch('/api/admin/contact-inquiries/bulk-status', {
        method: 'POST',
        headers,
        body: JSON.stringify({ ids: selectedIds, status }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      showToast(data.message);
      setSelectedIds([]);
      fetchInquiries();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === inquiries.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(inquiries.map((i) => i.id));
    }
  };

  const toggleSelectId = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE SETTINGS ACTIONS
  // ═══════════════════════════════════════════════════════════════════════════
  const optimizeImage = async (file: File, maxWidth: number, maxBytes: number) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Only JPG, PNG, and WebP images are allowed.');
    if (file.size > 8 * 1024 * 1024) throw new Error('Image must be smaller than 8MB.');
    const source = await createImageBitmap(file);
    const scale = Math.min(1, maxWidth / source.width);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(source.width * scale));
    canvas.height = Math.max(1, Math.round(source.height * scale));
    const context = canvas.getContext('2d');
    if (!context) { source.close(); throw new Error('Browser could not prepare the image.'); }
    context.drawImage(source, 0, 0, canvas.width, canvas.height);
    source.close();
    const result = canvas.toDataURL('image/webp', 0.76);
    if (result.length > maxBytes) throw new Error('Optimized image is still too large. Please select a smaller image.');
    return result;
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const heroImageUrl = heroImageFile ? await optimizeImage(heroImageFile, 1800, 700_000) : settings.heroImageUrl;
      const headers = await adminHeaders(true);
      const res = await fetch('/api/contact-page/settings', {
        method: 'POST',
        headers,
        body: JSON.stringify({ settings: { ...settings, heroImageUrl } }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to save settings.');
      showToast('Page settings updated.');
      setHeroImageFile(null);
      fetchPagePayload();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // MAP SETTINGS ACTIONS
  // ═══════════════════════════════════════════════════════════════════════════
  const handleSaveMap = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const mapImageUrl = mapImageFile ? await optimizeImage(mapImageFile, 1200, 550_000) : map.mapImageUrl;
      const headers = await adminHeaders(true);
      const [mapRes, settingsRes] = await Promise.all([
        fetch('/api/contact-page/map', { method: 'POST', headers, body: JSON.stringify({ map: { ...map, mapImageUrl } }) }),
        fetch('/api/contact-page/settings', { method: 'POST', headers, body: JSON.stringify({ settings }) }),
      ]);
      const [mapData, settingsData] = await Promise.all([mapRes.json(), settingsRes.json()]);
      if (!mapRes.ok || !mapData.success) throw new Error(mapData.message || 'Failed to save map settings.');
      if (!settingsRes.ok || !settingsData.success) throw new Error(settingsData.message || 'Failed to save FAQ settings.');
      showToast('Map & location settings updated.');
      setMapImageFile(null);
      fetchPagePayload();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // CONTACT DETAILS CRUD
  // ═══════════════════════════════════════════════════════════════════════════
  const resetDetailForm = () => {
    setEditingDetail(null);
    setDetailForm({ type: 'address', label: '', value: '', href: '', icon: 'map-pin', active: true });
  };

  const startEditDetail = (d: ContactDetail) => {
    setEditingDetail(d);
    setDetailForm({
      type: d.type,
      label: d.label,
      value: d.value,
      href: d.href || '',
      icon: d.icon,
      active: d.active,
    });
  };

  const handleSaveDetail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detailForm.label.trim() || !detailForm.value.trim()) {
      showToast('Label and value are required.', 'error');
      return;
    }
    setSaving(true);
    try {
      const headers = await adminHeaders(true);
      const method = editingDetail ? 'PUT' : 'POST';
      const payload = {
        detail: {
          ...(editingDetail ? { id: editingDetail.id } : {}),
          ...detailForm,
        },
      };
      const res = await fetch('/api/contact-details', { method, headers, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to save detail.');
      showToast(data.message || (editingDetail ? 'Detail updated.' : 'Detail added.'));
      resetDetailForm();
      fetchPagePayload();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleDetailActive = async (d: ContactDetail) => {
    setSaving(true);
    try {
      const headers = await adminHeaders(true);
      const res = await fetch('/api/contact-details', {
        method: 'PUT',
        headers,
        body: JSON.stringify({ detail: { ...d, active: !d.active } }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      showToast(`Detail ${!d.active ? 'activated' : 'hidden'}.`);
      fetchPagePayload();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDetail = async (d: ContactDetail) => {
    if (!confirm(`Delete contact detail "${d.label}"?`)) return;
    setSaving(true);
    try {
      const headers = await adminHeaders();
      const res = await fetch(`/api/contact-details?id=${d.id}`, { method: 'DELETE', headers });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      showToast('Detail deleted.');
      fetchPagePayload();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleMoveDetailOrder = async (idx: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= details.length) return;
    const reordered = [...details];
    const [moved] = reordered.splice(idx, 1);
    reordered.splice(targetIdx, 0, moved);
    const ids = reordered.map((item) => item.id);

    setSaving(true);
    try {
      const headers = await adminHeaders(true);
      const res = await fetch('/api/contact-details/reorder', { method: 'PATCH', headers, body: JSON.stringify({ ids }) });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      showToast('Detail display order updated.');
      fetchPagePayload();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // CONTACT SUBJECTS CRUD
  // ═══════════════════════════════════════════════════════════════════════════
  const resetSubjectForm = () => {
    setEditingSubject(null);
    setSubjectForm({ name: '', recipientEmail: '', active: true });
  };

  const startEditSubject = (s: ContactSubject) => {
    setEditingSubject(s);
    setSubjectForm({ name: s.name, recipientEmail: s.recipientEmail || '', active: s.active });
  };

  const handleSaveSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectForm.name.trim()) {
      showToast('Subject name is required.', 'error');
      return;
    }
    setSaving(true);
    try {
      const headers = await adminHeaders(true);
      const method = editingSubject ? 'PUT' : 'POST';
      const payload = {
        subject: {
          ...(editingSubject ? { id: editingSubject.id } : {}),
          ...subjectForm,
        },
      };
      const res = await fetch('/api/contact-subjects', { method, headers, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to save subject.');
      showToast(data.message || (editingSubject ? 'Subject updated.' : 'Subject added.'));
      resetSubjectForm();
      fetchPagePayload();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleSubjectActive = async (s: ContactSubject) => {
    setSaving(true);
    try {
      const headers = await adminHeaders(true);
      const res = await fetch('/api/contact-subjects', {
        method: 'PUT',
        headers,
        body: JSON.stringify({ subject: { ...s, active: !s.active } }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      showToast(`Subject ${!s.active ? 'activated' : 'hidden'}.`);
      fetchPagePayload();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSubject = async (s: ContactSubject) => {
    if (!confirm(`Delete subject "${s.name}"?`)) return;
    setSaving(true);
    try {
      const headers = await adminHeaders();
      const res = await fetch(`/api/contact-subjects?id=${s.id}`, { method: 'DELETE', headers });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      showToast('Subject deleted.');
      fetchPagePayload();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleMoveSubjectOrder = async (idx: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= subjects.length) return;
    const reordered = [...subjects];
    const [moved] = reordered.splice(idx, 1);
    reordered.splice(targetIdx, 0, moved);
    const ids = reordered.map((s) => s.id);

    setSaving(true);
    try {
      const headers = await adminHeaders(true);
      const res = await fetch('/api/contact-subjects/reorder', { method: 'PATCH', headers, body: JSON.stringify({ ids }) });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      showToast('Subject display order updated.');
      fetchPagePayload();
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
        <span className="text-sm text-neutral-500">Loading contact system & inquiries…</span>
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

      {/* SUB-TABS & GLOBAL SEED */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {[
            { key: 'inbox', label: `Inbox (${inquiryCounts.new > 0 ? `${inquiryCounts.new} new` : inquiryCounts.all})`, icon: Inbox },
            { key: 'page', label: 'Page & Hero', icon: Layout },
            { key: 'details', label: `Contact Details (${details.length})`, icon: Phone },
            { key: 'subjects', label: `Form Subjects (${subjects.length})`, icon: Tag },
            { key: 'map', label: 'Map & FAQ CTA', icon: MapPin },
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
          {details.length === 0 && subjects.length === 0 && (
            <button
              onClick={handleSeed}
              disabled={seeding}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition"
            >
              <Database className="w-3.5 h-3.5" />
              {seeding ? 'Seeding…' : 'Seed Default Content'}
            </button>
          )}
          <button
            onClick={() => { fetchPagePayload(); if (activeSubTab === 'inbox') fetchInquiries(); }}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-neutral-100 text-neutral-600 rounded-lg hover:bg-neutral-200 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          SUB-TAB 1: INBOX & CUSTOMER INQUIRIES
          ═══════════════════════════════════════════════════════════════════════ */}
      {activeSubTab === 'inbox' && (
        <div className="space-y-4">
          {/* SEARCH & STATUS TABS BAR */}
          <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-3 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Search by inquiry ref, name, email, order ID, or message..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-neutral-300 rounded-lg text-xs outline-none focus:border-black transition"
                />
              </div>

              <div className="flex gap-2">
                <select
                  value={subjectFilter}
                  onChange={(e) => setSubjectFilter(e.target.value)}
                  className="border border-neutral-300 rounded-lg px-3 py-2 text-xs outline-none focus:border-black bg-white"
                >
                  <option value="all">All Subjects</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>

                <button
                  onClick={fetchInquiries}
                  className="px-4 py-2 bg-black text-white text-xs font-bold rounded-lg hover:bg-neutral-800 transition"
                >
                  Search
                </button>
              </div>
            </div>

            {/* STATUS FILTER PILLS */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {[
                { key: 'all', label: 'All', count: inquiryCounts.all },
                { key: 'new', label: 'New', count: inquiryCounts.new, badge: 'bg-blue-600 text-white' },
                { key: 'in_progress', label: 'In Progress', count: inquiryCounts.in_progress, badge: 'bg-amber-500 text-black' },
                { key: 'resolved', label: 'Resolved', count: inquiryCounts.resolved, badge: 'bg-emerald-600 text-white' },
                { key: 'archived', label: 'Archived', count: inquiryCounts.archived, badge: 'bg-neutral-500 text-white' },
                { key: 'spam', label: 'Spam', count: inquiryCounts.spam, badge: 'bg-red-600 text-white' },
              ].map((st) => (
                <button
                  key={st.key}
                  onClick={() => setStatusFilter(st.key as any)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                    statusFilter === st.key ? 'bg-black text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  {st.label}
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${st.badge || (statusFilter === st.key ? 'bg-neutral-700 text-white' : 'bg-neutral-200 text-neutral-700')}`}>
                    {st.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* BULK ACTIONS BAR */}
          {selectedIds.length > 0 && (
            <div className="bg-neutral-900 text-white rounded-xl px-4 py-3 flex items-center justify-between text-xs animate-slide-in">
              <span>{selectedIds.length} inquiries selected</span>
              <div className="flex gap-2">
                <button onClick={() => handleBulkStatusChange('in_progress')} className="bg-amber-500 text-black font-bold px-3 py-1 rounded hover:bg-amber-400">
                  Mark In Progress
                </button>
                <button onClick={() => handleBulkStatusChange('resolved')} className="bg-emerald-600 text-white font-bold px-3 py-1 rounded hover:bg-emerald-500">
                  Mark Resolved
                </button>
                <button onClick={() => handleBulkStatusChange('archived')} className="bg-neutral-700 text-white font-bold px-3 py-1 rounded hover:bg-neutral-600">
                  Archive
                </button>
                <button onClick={() => handleBulkStatusChange('spam')} className="bg-red-600 text-white font-bold px-3 py-1 rounded hover:bg-red-500">
                  Mark Spam
                </button>
              </div>
            </div>
          )}

          {/* INQUIRIES LIST TABLE */}
          {inquiries.length === 0 ? (
            <div className="text-center py-16 bg-neutral-50 border border-dashed border-neutral-300 rounded-xl">
              <Inbox className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-neutral-700">No customer inquiries found</p>
              <p className="text-xs text-neutral-400 mt-1">Check filters or wait for customer submissions.</p>
            </div>
          ) : (
            <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="p-3 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.length === inquiries.length}
                          onChange={toggleSelectAll}
                          className="rounded border-neutral-300"
                        />
                      </th>
                      <th className="p-3">Ref & Customer</th>
                      <th className="p-3">Subject</th>
                      <th className="p-3">Message Preview</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Date</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {inquiries.map((inq) => {
                      const isSelected = selectedIds.includes(inq.id);
                      return (
                        <tr
                          key={inq.id}
                          className={`hover:bg-neutral-50 transition cursor-pointer ${
                            inq.status === 'new' ? 'font-semibold bg-blue-50/30' : ''
                          }`}
                        >
                          <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectId(inq.id)}
                              className="rounded border-neutral-300"
                            />
                          </td>

                          <td className="p-3" onClick={() => openInquiryDrawer(inq)}>
                            <div className="font-mono text-[11px] font-bold text-neutral-900">{inq.inquiryRef}</div>
                            <div className="text-neutral-800">{inq.name}</div>
                            <div className="text-[10px] text-neutral-400 font-mono">{inq.email}</div>
                          </td>

                          <td className="p-3" onClick={() => openInquiryDrawer(inq)}>
                            <span className="inline-block bg-neutral-100 text-neutral-700 px-2 py-0.5 rounded text-[10px] font-medium">
                              {inq.subjectLabel}
                            </span>
                            {inq.orderId && (
                              <div className="text-[10px] text-neutral-400 font-mono mt-0.5">Order: {inq.orderId}</div>
                            )}
                          </td>

                          <td className="p-3 max-w-xs truncate text-neutral-600 font-light" onClick={() => openInquiryDrawer(inq)}>
                            {inq.message}
                          </td>

                          <td className="p-3" onClick={() => openInquiryDrawer(inq)}>
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                inq.status === 'new'
                                  ? 'bg-blue-100 text-blue-800'
                                  : inq.status === 'in_progress'
                                  ? 'bg-amber-100 text-amber-800'
                                  : inq.status === 'resolved'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : inq.status === 'spam'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-neutral-200 text-neutral-700'
                              }`}
                            >
                              {inq.status}
                            </span>
                            {inq.priority === 'high' && (
                              <span className="ml-1 bg-red-600 text-white text-[9px] font-bold px-1.5 py-0.2 rounded">
                                HIGH
                              </span>
                            )}
                          </td>

                          <td className="p-3 text-neutral-400 text-[11px]" onClick={() => openInquiryDrawer(inq)}>
                            {new Date(inq.createdAt).toLocaleDateString()}
                          </td>

                          <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => openInquiryDrawer(inq)}
                                title="View details"
                                className="p-1 rounded hover:bg-neutral-200 text-neutral-600"
                              >
                                <ChevronRight className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteInquiry(inq.id)}
                                title="Delete"
                                className="p-1 rounded hover:bg-red-100 text-red-600"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* INQUIRY DETAIL DRAWER / MODAL */}
          {selectedInquiry && (
            <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-end animate-fade-up">
              <div className="bg-white w-full max-w-xl h-full overflow-y-auto p-6 space-y-6 shadow-2xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b pb-4 mb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold bg-neutral-100 px-2 py-0.5 rounded">
                          {selectedInquiry.inquiryRef}
                        </span>
                        <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                          selectedInquiry.status === 'new' ? 'bg-blue-100 text-blue-800' :
                          selectedInquiry.status === 'in_progress' ? 'bg-amber-100 text-amber-800' :
                          selectedInquiry.status === 'resolved' ? 'bg-emerald-100 text-emerald-800' : 'bg-neutral-200 text-neutral-700'
                        }`}>
                          {selectedInquiry.status}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-neutral-900 mt-1">{selectedInquiry.name}</h3>
                      <p className="text-xs text-neutral-500 font-mono">{selectedInquiry.email}</p>
                    </div>
                    <button onClick={() => setSelectedInquiry(null)} className="p-2 rounded-lg hover:bg-neutral-100">
                      <X className="w-5 h-5 text-neutral-500" />
                    </button>
                  </div>

                  {/* DETAILS CARD */}
                  <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 space-y-3 mb-6">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-neutral-400 font-semibold block text-[10px] uppercase">Subject Category</span>
                        <span className="font-medium text-neutral-900">{selectedInquiry.subjectLabel}</span>
                      </div>
                      {selectedInquiry.phone && (
                        <div>
                          <span className="text-neutral-400 font-semibold block text-[10px] uppercase">Phone</span>
                          <a href={`tel:${selectedInquiry.phone}`} className="text-black underline font-medium">{selectedInquiry.phone}</a>
                        </div>
                      )}
                      {selectedInquiry.orderId && (
                        <div>
                          <span className="text-neutral-400 font-semibold block text-[10px] uppercase">Order ID</span>
                          <span className="font-mono font-medium text-neutral-900">{selectedInquiry.orderId}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-neutral-400 font-semibold block text-[10px] uppercase">Submitted At</span>
                        <span className="text-neutral-700">{new Date(selectedInquiry.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* MESSAGE BODY */}
                  <div className="mb-6">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">Message Content</h4>
                    <div className="bg-white border border-neutral-200 rounded-xl p-4 text-xs text-neutral-800 leading-relaxed font-light whitespace-pre-line shadow-inner">
                      {selectedInquiry.message}
                    </div>
                  </div>

                  {/* STATUS & PRIORITY CONTROLS */}
                  <div className="space-y-4 border-t pt-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500">Inquiry Management</h4>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-semibold text-neutral-500 uppercase mb-1">Status</label>
                        <select
                          value={selectedInquiry.status}
                          onChange={(e) => handleUpdateInquiry(selectedInquiry.id, { status: e.target.value as InquiryStatus })}
                          className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-xs font-semibold outline-none bg-white"
                        >
                          <option value="new">New</option>
                          <option value="in_progress">In Progress</option>
                          <option value="resolved">Resolved</option>
                          <option value="archived">Archived</option>
                          <option value="spam">Spam</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold text-neutral-500 uppercase mb-1">Priority</label>
                        <select
                          value={selectedInquiry.priority}
                          onChange={(e) => handleUpdateInquiry(selectedInquiry.id, { priority: e.target.value as InquiryPriority })}
                          className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-xs font-semibold outline-none bg-white"
                        >
                          <option value="normal">Normal Priority</option>
                          <option value="high">High Priority</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-neutral-500 uppercase mb-1">Assigned Admin</label>
                      <input
                        type="text"
                        value={assignedTo}
                        onChange={(e) => setAssignedTo(e.target.value)}
                        onBlur={() => handleUpdateInquiry(selectedInquiry.id, { assignedTo })}
                        placeholder="Admin name or email"
                        className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-xs outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-neutral-500 uppercase mb-1">Internal Admin Notes</label>
                      <textarea
                        rows={3}
                        value={adminNotes}
                        onChange={(e) => setAdminNotes(e.target.value)}
                        onBlur={() => handleUpdateInquiry(selectedInquiry.id, { adminNotes })}
                        placeholder="Add internal investigation notes..."
                        className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-xs outline-none"
                      />
                      <p className="text-[10px] text-neutral-400 mt-0.5">Notes automatically save on blur.</p>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4 flex justify-between items-center">
                  <a
                    href={`mailto:${selectedInquiry.email}?subject=RE: ${encodeURIComponent(selectedInquiry.inquiryRef + ' - ' + selectedInquiry.subjectLabel)}`}
                    className="inline-flex items-center gap-1.5 bg-black text-white text-xs font-bold px-4 py-2.5 rounded-lg hover:bg-neutral-800 transition"
                  >
                    <Mail className="w-3.5 h-3.5" /> Reply via Email
                  </a>

                  <button
                    onClick={() => handleDeleteInquiry(selectedInquiry.id)}
                    className="text-xs text-red-600 hover:underline font-semibold"
                  >
                    Delete Inquiry
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          SUB-TAB 2: PAGE & HERO SETTINGS
          ═══════════════════════════════════════════════════════════════════════ */}
      {activeSubTab === 'page' && (
        <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
            <Layout className="w-4 h-4 text-neutral-400" />
            General Contact Page & Hero Settings
          </h3>

          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-neutral-500 uppercase mb-1">Hero Title *</label>
                <input
                  type="text"
                  value={settings.heroTitle}
                  onChange={(e) => setSettings({ ...settings, heroTitle: e.target.value })}
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

            <div>
              <label className="block text-[11px] font-semibold text-neutral-500 uppercase mb-1">Hero Subtitle</label>
              <input
                type="text"
                value={settings.heroSubtitle}
                onChange={(e) => setSettings({ ...settings, heroSubtitle: e.target.value })}
                placeholder="We'd love to hear from you."
                className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:border-black outline-none transition"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-neutral-500 uppercase mb-1">Hero Image Upload</label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => setHeroImageFile(e.target.files?.[0] || null)}
                  className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-xs bg-white"
                />
                <p className="text-[10px] text-neutral-400 mt-1">JPG, PNG or WebP, maximum 8MB. Existing image is preserved if no file is selected.</p>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-500 uppercase mb-1">Page Visibility</label>
                <select
                  value={settings.pageActive ? 'active' : 'hidden'}
                  onChange={(e) => setSettings({ ...settings, pageActive: e.target.value === 'active' })}
                  className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:border-black outline-none transition bg-white"
                >
                  <option value="active">Active (Visible on Storefront)</option>
                  <option value="hidden">Hidden (Show Contact Unavailable Notice)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-neutral-500 uppercase mb-1">Hero Image Alt Text *</label>
              <input type="text" value={settings.heroImageAlt} onChange={(e) => setSettings({ ...settings, heroImageAlt: e.target.value })} maxLength={160} className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:border-black outline-none transition" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-neutral-500 uppercase mb-1">Form Heading *</label>
                <input
                  type="text"
                  value={settings.formHeading}
                  onChange={(e) => setSettings({ ...settings, formHeading: e.target.value })}
                  maxLength={100}
                  className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:border-black outline-none transition"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-500 uppercase mb-1">Submit Button Label</label>
                <input
                  type="text"
                  value={settings.submitButtonLabel}
                  onChange={(e) => setSettings({ ...settings, submitButtonLabel: e.target.value })}
                  maxLength={60}
                  className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:border-black outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-neutral-500 uppercase mb-1">Form Description / Helper Text</label>
              <input
                type="text"
                value={settings.formDescription}
                onChange={(e) => setSettings({ ...settings, formDescription: e.target.value })}
                placeholder="Our team typically replies within 24 hours."
                className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:border-black outline-none transition"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-neutral-500 uppercase mb-1">Success Heading</label>
                <input
                  type="text"
                  value={settings.successHeading}
                  onChange={(e) => setSettings({ ...settings, successHeading: e.target.value })}
                  placeholder="Thank You!"
                  className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:border-black outline-none transition"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-500 uppercase mb-1">Response Expectation Text</label>
                <input
                  type="text"
                  value={settings.responseTimeText}
                  onChange={(e) => setSettings({ ...settings, responseTimeText: e.target.value })}
                  placeholder="Typically replies within 24 hours"
                  className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:border-black outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-neutral-500 uppercase mb-1">Success Confirmation Message</label>
              <textarea
                rows={2}
                value={settings.successMessage}
                onChange={(e) => setSettings({ ...settings, successMessage: e.target.value })}
                className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:border-black outline-none transition resize-y"
              />
            </div>

            <div className="flex flex-wrap gap-5 border-t border-neutral-200 pt-4">
              <label className="flex items-center gap-2 text-xs font-medium"><input type="checkbox" checked={settings.contactDetailsActive} onChange={(e) => setSettings({ ...settings, contactDetailsActive: e.target.checked })} /> Show Contact Details</label>
              <label className="flex items-center gap-2 text-xs font-medium"><input type="checkbox" checked={settings.mapSectionActive} onChange={(e) => setSettings({ ...settings, mapSectionActive: e.target.checked })} /> Show Map Section</label>
              <label className="flex items-center gap-2 text-xs font-medium"><input type="checkbox" checked={settings.faqCtaActive} onChange={(e) => setSettings({ ...settings, faqCtaActive: e.target.checked })} /> Show FAQ CTA</label>
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
          SUB-TAB 3: CONTACT DETAILS
          ═══════════════════════════════════════════════════════════════════════ */}
      {activeSubTab === 'details' && (
        <div className="space-y-6">
          {/* DETAIL FORM */}
          <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
              <Phone className="w-4 h-4 text-neutral-400" />
              {editingDetail ? 'Edit Contact Detail' : 'Add New Contact Detail'}
            </h3>

            <form onSubmit={handleSaveDetail} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-500 uppercase mb-1">Detail Type *</label>
                  <select
                    value={detailForm.type}
                    onChange={(e) => {
                      const t = e.target.value as ContactDetail['type'];
                      const defaultIconMap: Record<string, ContactDetail['icon']> = {
                        address: 'map-pin',
                        phone: 'phone',
                        email: 'mail',
                        hours: 'clock',
                        whatsapp: 'message-circle',
                      };
                      setDetailForm({
                        ...detailForm,
                        type: t,
                        icon: defaultIconMap[t] || 'map-pin',
                      });
                    }}
                    className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:border-black outline-none transition bg-white"
                  >
                    <option value="address">Address</option>
                    <option value="phone">Phone</option>
                    <option value="email">Email</option>
                    <option value="hours">Working Hours</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="custom">Custom Detail</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-neutral-500 uppercase mb-1">Label *</label>
                  <input
                    type="text"
                    value={detailForm.label}
                    onChange={(e) => setDetailForm({ ...detailForm, label: e.target.value })}
                    placeholder="e.g. Address, Phone, Support Email"
                    maxLength={60}
                    className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:border-black outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-neutral-500 uppercase mb-1">Icon</label>
                  <select
                    value={detailForm.icon}
                    onChange={(e) => setDetailForm({ ...detailForm, icon: e.target.value as any })}
                    className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:border-black outline-none transition bg-white"
                  >
                    <option value="map-pin">Map Pin (Address)</option>
                    <option value="phone">Phone</option>
                    <option value="mail">Mail / Email</option>
                    <option value="clock">Clock / Hours</option>
                    <option value="message-circle">Message Circle / WhatsApp</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-500 uppercase mb-1">Value / Text *</label>
                  <input
                    type="text"
                    value={detailForm.value}
                    onChange={(e) => setDetailForm({ ...detailForm, value: e.target.value })}
                    placeholder="e.g. 12-C, Gulberg III, Lahore or +92 300 1234567"
                    maxLength={500}
                    className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:border-black outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-neutral-500 uppercase mb-1">Custom Clickable Href (Optional)</label>
                  <input
                    type="text"
                    value={detailForm.href}
                    onChange={(e) => setDetailForm({ ...detailForm, href: e.target.value })}
                    placeholder="tel:+923001234567 or mailto:support@example.com"
                    className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:border-black outline-none transition"
                  />
                  <p className="text-[10px] text-neutral-400 mt-0.5">Auto-generated if left empty for phone, email & WhatsApp.</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 text-xs font-medium text-neutral-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={detailForm.active}
                    onChange={(e) => setDetailForm({ ...detailForm, active: e.target.checked })}
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
                    {editingDetail ? 'Update Detail' : 'Add Detail'}
                  </button>
                  {editingDetail && (
                    <button type="button" onClick={resetDetailForm} className="px-4 py-2 text-xs font-medium text-neutral-600 bg-neutral-100 rounded-lg hover:bg-neutral-200 transition">
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>

          {/* DETAILS LIST */}
          {details.length === 0 ? (
            <div className="text-center py-12 bg-neutral-50 border border-dashed border-neutral-300 rounded-xl">
              <Phone className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
              <p className="text-sm text-neutral-500">No contact details added yet. Add one above or seed defaults.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {details.map((d, idx) => (
                <div key={d.id} className="bg-white border border-neutral-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3 shadow-sm hover:shadow transition">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs font-mono font-bold text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded">
                      #{idx + 1}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-neutral-900">{d.label}</span>
                        <span className="text-[10px] font-mono uppercase bg-neutral-100 px-1.5 py-0.2 rounded text-neutral-500">
                          {d.type}
                        </span>
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${d.active ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-neutral-400'}`}>
                          {d.active ? 'Active' : 'Hidden'}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-600 font-light truncate mt-0.5">{d.value}</p>
                      {d.href && <p className="text-[10px] text-neutral-400 font-mono">Href: {d.href}</p>}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => handleMoveDetailOrder(idx, 'up')} disabled={idx === 0 || saving} title="Move up" className="p-1.5 rounded hover:bg-neutral-100 text-neutral-400 hover:text-black disabled:opacity-30 transition">
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleMoveDetailOrder(idx, 'down')} disabled={idx === details.length - 1 || saving} title="Move down" className="p-1.5 rounded hover:bg-neutral-100 text-neutral-400 hover:text-black disabled:opacity-30 transition">
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleToggleDetailActive(d)} disabled={saving} title={d.active ? 'Hide' : 'Show'} className="p-1.5 rounded hover:bg-neutral-100 text-neutral-400 hover:text-black disabled:opacity-30 transition">
                      {d.active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={() => startEditDetail(d)} title="Edit" className="p-1.5 rounded hover:bg-neutral-100 text-neutral-400 hover:text-black transition">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDeleteDetail(d)} disabled={saving} title="Delete" className="p-1.5 rounded hover:bg-red-50 text-neutral-400 hover:text-red-600 disabled:opacity-30 transition">
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
          SUB-TAB 4: CONTACT SUBJECTS
          ═══════════════════════════════════════════════════════════════════════ */}
      {activeSubTab === 'subjects' && (
        <div className="space-y-6">
          {/* SUBJECT FORM */}
          <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
              <Tag className="w-4 h-4 text-neutral-400" />
              {editingSubject ? 'Edit Inquiry Subject' : 'Add New Inquiry Subject'}
            </h3>

            <form onSubmit={handleSaveSubject} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-500 uppercase mb-1">Subject Name *</label>
                  <input
                    type="text"
                    value={subjectForm.name}
                    onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                    placeholder="e.g. Order Help or Returns & Exchange"
                    maxLength={80}
                    className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:border-black outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-neutral-500 uppercase mb-1">Optional Notification Recipient Email</label>
                  <input
                    type="email"
                    value={subjectForm.recipientEmail}
                    onChange={(e) => setSubjectForm({ ...subjectForm, recipientEmail: e.target.value })}
                    placeholder="support@colossalrigout.pk"
                    className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:border-black outline-none transition"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 text-xs font-medium text-neutral-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={subjectForm.active}
                    onChange={(e) => setSubjectForm({ ...subjectForm, active: e.target.checked })}
                    className="rounded border-neutral-300 text-black focus:ring-black"
                  />
                  Active (Visible in Dropdown)
                </label>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-black text-white rounded-lg hover:bg-neutral-800 disabled:opacity-50 transition"
                  >
                    {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    {editingSubject ? 'Update Subject' : 'Add Subject'}
                  </button>
                  {editingSubject && (
                    <button type="button" onClick={resetSubjectForm} className="px-4 py-2 text-xs font-medium text-neutral-600 bg-neutral-100 rounded-lg hover:bg-neutral-200 transition">
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>

          {/* SUBJECTS LIST */}
          {subjects.length === 0 ? (
            <div className="text-center py-12 bg-neutral-50 border border-dashed border-neutral-300 rounded-xl">
              <Tag className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
              <p className="text-sm text-neutral-500">No inquiry subjects added yet. Add one above or seed defaults.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {subjects.map((s, idx) => (
                <div key={s.id} className="bg-white border border-neutral-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3 shadow-sm hover:shadow transition">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs font-mono font-bold text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded">
                      #{idx + 1}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-neutral-900">{s.name}</span>
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${s.active ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-neutral-400'}`}>
                          {s.active ? 'Active' : 'Hidden'}
                        </span>
                      </div>
                      <p className="text-[10px] text-neutral-400 font-mono mt-0.5">
                        Slug: {s.slug} {s.recipientEmail ? `| Recipient: ${s.recipientEmail}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => handleMoveSubjectOrder(idx, 'up')} disabled={idx === 0 || saving} title="Move up" className="p-1.5 rounded hover:bg-neutral-100 text-neutral-400 hover:text-black disabled:opacity-30 transition">
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleMoveSubjectOrder(idx, 'down')} disabled={idx === subjects.length - 1 || saving} title="Move down" className="p-1.5 rounded hover:bg-neutral-100 text-neutral-400 hover:text-black disabled:opacity-30 transition">
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleToggleSubjectActive(s)} disabled={saving} title={s.active ? 'Hide' : 'Show'} className="p-1.5 rounded hover:bg-neutral-100 text-neutral-400 hover:text-black disabled:opacity-30 transition">
                      {s.active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={() => startEditSubject(s)} title="Edit" className="p-1.5 rounded hover:bg-neutral-100 text-neutral-400 hover:text-black transition">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDeleteSubject(s)} disabled={saving} title="Delete" className="p-1.5 rounded hover:bg-red-50 text-neutral-400 hover:text-red-600 disabled:opacity-30 transition">
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
          SUB-TAB 5: MAP & FAQ CTA
          ═══════════════════════════════════════════════════════════════════════ */}
      {activeSubTab === 'map' && (
        <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-neutral-400" />
            Store Map & FAQ Teaser Settings
          </h3>

          <form onSubmit={handleSaveMap} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-neutral-500 uppercase mb-1">Map Image Upload</label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => setMapImageFile(e.target.files?.[0] || null)}
                  className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-xs bg-white"
                />
                <p className="text-[10px] text-neutral-400 mt-1">Existing image remains unchanged when no file is selected.</p>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-500 uppercase mb-1">Map Image Alt Text</label>
                <input
                  type="text"
                  value={map.mapImageAlt}
                  onChange={(e) => setMap({ ...map, mapImageAlt: e.target.value })}
                  placeholder="Gulberg Lahore Map Location"
                  className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:border-black outline-none transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-neutral-500 uppercase mb-1">Google Maps Link URL</label>
                <input
                  type="text"
                  value={map.mapUrl}
                  onChange={(e) => setMap({ ...map, mapUrl: e.target.value })}
                  placeholder="https://maps.google.com/?q=..."
                  className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:border-black outline-none transition"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-500 uppercase mb-1">Store Locator CTA Label</label>
                <input
                  type="text"
                  value={map.ctaLabel}
                  onChange={(e) => setMap({ ...map, ctaLabel: e.target.value })}
                  placeholder="FIND A STORE NEAR YOU"
                  className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:border-black outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="flex items-center gap-2 text-xs font-medium text-neutral-700 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={map.active}
                  onChange={(e) => setMap({ ...map, active: e.target.checked })}
                  className="rounded border-neutral-300 text-black focus:ring-black"
                />
                Show Store Map Card on Contact Page
              </label>
            </div>

            <div className="border-t border-neutral-200 pt-4 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2"><HelpCircle className="w-4 h-4" /> FAQ Teaser</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className="block text-[11px] font-semibold text-neutral-500 uppercase mb-1">Heading</label><input value={settings.faqHeading} onChange={(e) => setSettings({ ...settings, faqHeading: e.target.value })} maxLength={100} className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:border-black outline-none" /></div>
                <div><label className="block text-[11px] font-semibold text-neutral-500 uppercase mb-1">Button Label</label><input value={settings.faqButtonLabel} onChange={(e) => setSettings({ ...settings, faqButtonLabel: e.target.value })} maxLength={60} className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:border-black outline-none" /></div>
              </div>
              <div><label className="block text-[11px] font-semibold text-neutral-500 uppercase mb-1">Description</label><textarea rows={2} value={settings.faqDescription} onChange={(e) => setSettings({ ...settings, faqDescription: e.target.value })} maxLength={500} className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:border-black outline-none resize-y" /></div>
              <div><label className="block text-[11px] font-semibold text-neutral-500 uppercase mb-1">Button URL</label><input value={settings.faqButtonUrl} onChange={(e) => setSettings({ ...settings, faqButtonUrl: e.target.value })} placeholder="/faq" className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:border-black outline-none" /></div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 text-xs font-bold bg-black text-white rounded-lg hover:bg-neutral-800 disabled:opacity-50 transition"
              >
                {saving ? 'Saving Map Settings…' : 'Save Map & FAQ Settings'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
