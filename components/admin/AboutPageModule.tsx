'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import {
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
  Layout,
  FileText,
  ShieldCheck,
  UsersRound,
  Upload,
  Image as ImageIcon,
  Info,
} from 'lucide-react';
import { auth } from '../../lib/firebase';
import {
  AboutPageSettings,
  AboutStoryBlock,
  AboutValue,
  AboutTeamMember,
  AboutPagePayload,
  defaultSettings,
  allowedValueIcons,
} from '../../lib/about-page';

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

const iconMap: Record<string, any> = {
  leaf: require('lucide-react').Leaf,
  shield: require('lucide-react').ShieldCheck,
  users: require('lucide-react').Users,
  heart: require('lucide-react').Heart,
  sparkles: require('lucide-react').Sparkles,
  globe: require('lucide-react').Globe,
};

export default function AboutPageModule() {
  const { toast, show: showToast } = useToast();

  const [activeSubTab, setActiveSubTab] = useState<'page-hero' | 'story' | 'values' | 'team'>('page-hero');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const [settings, setSettings] = useState<AboutPageSettings>(defaultSettings);
  const [storyBlocks, setStoryBlocks] = useState<AboutStoryBlock[]>([]);
  const [values, setValues] = useState<AboutValue[]>([]);
  const [teamMembers, setTeamMembers] = useState<AboutTeamMember[]>([]);

  const [heroImageFile, setHeroImageFile] = useState<File | null>(null);
  const [heroImagePreview, setHeroImagePreview] = useState<string>('');

  const [editingStory, setEditingStory] = useState<AboutStoryBlock | null>(null);
  const [storyForm, setStoryForm] = useState({ text: '', active: true });

  const [editingValue, setEditingValue] = useState<AboutValue | null>(null);
  const [valueForm, setValueForm] = useState({ title: '', description: '', icon: 'leaf', active: true });

  const [editingMember, setEditingMember] = useState<AboutTeamMember | null>(null);
  const [memberForm, setMemberForm] = useState({ name: '', role: '', bio: '', image: '', imageAlt: '', active: true });
  const [memberImageFile, setMemberImageFile] = useState<File | null>(null);
  const [memberImagePreview, setMemberImagePreview] = useState<string>('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await adminHeaders();
      const res = await fetch('/api/about-page?all=true', { headers });
      const json = await res.json();
      if (json.success && json.data) {
        const payload: AboutPagePayload = json.data;
        setSettings(payload.settings || defaultSettings);
        setStoryBlocks(payload.storyBlocks || []);
        setValues(payload.values || []);
        setTeamMembers(payload.teamMembers || []);
      }
    } catch {
      showToast('Failed to load about page data.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleSeed = async () => {
    if (!confirm('Seed default About Us content? (Only works when collections are empty)')) return;
    setSeeding(true);
    try {
      const headers = await adminHeaders(true);
      const res = await fetch('/api/about-page/seed', { method: 'POST', headers });
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

  async function optimizeHeroImage(file: File): Promise<string> {
    const source = await createImageBitmap(file);
    const maxWidth = 1920;
    const maxHeight = 1200;
    const scale = Math.min(1, maxWidth / source.width, maxHeight / source.height);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(source.width * scale));
    canvas.height = Math.max(1, Math.round(source.height * scale));
    const context = canvas.getContext('2d');
    if (!context) {
      source.close();
      throw new Error('Your browser could not prepare this hero image.');
    }
    context.drawImage(source, 0, 0, canvas.width, canvas.height);
    source.close();
    const dataUrl = canvas.toDataURL('image/webp', 0.72);
    if (dataUrl.length > 750_000) {
      throw new Error('The optimized image is still too large. Please choose a simpler or smaller image.');
    }
    return dataUrl;
  }

  async function optimizeTeamImage(file: File): Promise<string> {
    const source = await createImageBitmap(file);
    const maxSize = 800;
    const scale = Math.min(1, maxSize / Math.max(source.width, source.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(source.width * scale));
    canvas.height = Math.max(1, Math.round(source.height * scale));
    const context = canvas.getContext('2d');
    if (!context) {
      source.close();
      throw new Error('Your browser could not prepare this team image.');
    }
    context.drawImage(source, 0, 0, canvas.width, canvas.height);
    source.close();
    const dataUrl = canvas.toDataURL('image/webp', 0.78);
    if (dataUrl.length > 500_000) {
      throw new Error('The optimized image is still too large. Please choose a simpler or smaller image.');
    }
    return dataUrl;
  }

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const headers = await adminHeaders(true);
      let finalHeroImage = settings.heroImage;
      if (heroImageFile) {
        try {
          finalHeroImage = await optimizeHeroImage(heroImageFile);
        } catch (err: any) {
          showToast(err.message || 'Failed to process hero image.', 'error');
          setSaving(false);
          return;
        }
      }

      const payload = {
        settings: {
          ...settings,
          heroImage: finalHeroImage,
        },
      };

      const res = await fetch('/api/about-page/settings', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to save settings.');
      showToast('Page settings updated.');
      setHeroImageFile(null);
      setHeroImagePreview('');
      fetchAll();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleHeroImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      showToast('File is too large. Max size is 8MB.', 'error');
      return;
    }
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      showToast('Only JPG, PNG and WebP formats are allowed.', 'error');
      return;
    }
    setHeroImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setHeroImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const resetStoryForm = () => { setEditingStory(null); setStoryForm({ text: '', active: true }); };

  const startEditStory = (s: AboutStoryBlock) => {
    setEditingStory(s);
    setStoryForm({ text: s.text, active: s.active });
  };

  const handleSaveStory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storyForm.text.trim()) { showToast('Story text is required.', 'error'); return; }
    setSaving(true);
    try {
      const headers = await adminHeaders(true);
      const method = editingStory ? 'PUT' : 'POST';
      const payload = {
        block: {
          ...(editingStory ? { id: editingStory.id } : {}),
          text: storyForm.text,
          active: storyForm.active,
        },
      };
      const res = await fetch('/api/about-page/story', { method, headers, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to save story block.');
      showToast(data.message || (editingStory ? 'Story updated.' : 'Story added.'));
      resetStoryForm();
      fetchAll();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStoryActive = async (s: AboutStoryBlock) => {
    setSaving(true);
    try {
      const headers = await adminHeaders(true);
      const res = await fetch('/api/about-page/story', {
        method: 'PUT',
        headers,
        body: JSON.stringify({ block: { ...s, active: !s.active } }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      showToast(`Story block ${!s.active ? 'activated' : 'hidden'}.`);
      fetchAll();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteStory = async (s: AboutStoryBlock) => {
    if (!confirm('Delete this story block?')) return;
    setSaving(true);
    try {
      const headers = await adminHeaders();
      const res = await fetch(`/api/about-page/story?id=${s.id}`, { method: 'DELETE', headers });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      showToast('Story block deleted.');
      fetchAll();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleMoveStoryOrder = async (idx: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= storyBlocks.length) return;
    const reordered = [...storyBlocks];
    const [moved] = reordered.splice(idx, 1);
    reordered.splice(targetIdx, 0, moved);
    const ids = reordered.map((s) => s.id);

    setSaving(true);
    try {
      const headers = await adminHeaders(true);
      const res = await fetch('/api/about-page/story/reorder', { method: 'PATCH', headers, body: JSON.stringify({ ids }) });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      showToast('Story block order updated.');
      fetchAll();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const resetValueForm = () => { setEditingValue(null); setValueForm({ title: '', description: '', icon: 'leaf', active: true }); };

  const startEditValue = (v: AboutValue) => {
    setEditingValue(v);
    setValueForm({ title: v.title, description: v.description, icon: v.icon, active: v.active });
  };

  const handleSaveValue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valueForm.title.trim() || !valueForm.description.trim()) { showToast('Value title and description are required.', 'error'); return; }
    setSaving(true);
    try {
      const headers = await adminHeaders(true);
      const method = editingValue ? 'PUT' : 'POST';
      const payload = {
        value: {
          ...(editingValue ? { id: editingValue.id } : {}),
          title: valueForm.title,
          description: valueForm.description,
          icon: valueForm.icon,
          active: valueForm.active,
        },
      };
      const res = await fetch('/api/about-page/values', { method, headers, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to save value.');
      showToast(data.message || (editingValue ? 'Value updated.' : 'Value added.'));
      resetValueForm();
      fetchAll();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleValueActive = async (v: AboutValue) => {
    setSaving(true);
    try {
      const headers = await adminHeaders(true);
      const res = await fetch('/api/about-page/values', {
        method: 'PUT',
        headers,
        body: JSON.stringify({ value: { ...v, active: !v.active } }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      showToast(`Value ${!v.active ? 'activated' : 'hidden'}.`);
      fetchAll();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteValue = async (v: AboutValue) => {
    if (!confirm(`Delete value "${v.title}"?`)) return;
    setSaving(true);
    try {
      const headers = await adminHeaders();
      const res = await fetch(`/api/about-page/values?id=${v.id}`, { method: 'DELETE', headers });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      showToast('Value deleted.');
      fetchAll();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleMoveValueOrder = async (idx: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= values.length) return;
    const reordered = [...values];
    const [moved] = reordered.splice(idx, 1);
    reordered.splice(targetIdx, 0, moved);
    const ids = reordered.map((v) => v.id);

    setSaving(true);
    try {
      const headers = await adminHeaders(true);
      const res = await fetch('/api/about-page/values/reorder', { method: 'PATCH', headers, body: JSON.stringify({ ids }) });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      showToast('Value order updated.');
      fetchAll();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const resetMemberForm = () => {
    setEditingMember(null);
    setMemberForm({ name: '', role: '', bio: '', image: '', imageAlt: '', active: true });
    setMemberImageFile(null);
    setMemberImagePreview('');
  };

  const startEditMember = (m: AboutTeamMember) => {
    setEditingMember(m);
    setMemberForm({ name: m.name, role: m.role, bio: m.bio, image: m.image, imageAlt: m.imageAlt, active: m.active });
    setMemberImageFile(null);
    setMemberImagePreview(m.image || '');
  };

  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberForm.name.trim() || !memberForm.role.trim()) { showToast('Member name and role are required.', 'error'); return; }
    setSaving(true);
    try {
      const headers = await adminHeaders(true);
      let finalImage = memberForm.image;
      if (memberImageFile) {
        try {
          finalImage = await optimizeTeamImage(memberImageFile);
        } catch (err: any) {
          showToast(err.message || 'Failed to process team image.', 'error');
          setSaving(false);
          return;
        }
      }

      const method = editingMember ? 'PUT' : 'POST';
      const payload = {
        member: {
          ...(editingMember ? { id: editingMember.id } : {}),
          name: memberForm.name,
          role: memberForm.role,
          bio: memberForm.bio,
          image: finalImage,
          imageAlt: memberForm.imageAlt.trim() || memberForm.name.trim(),
          active: memberForm.active,
        },
      };

      const res = await fetch('/api/about-page/team', { method, headers, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to save team member.');
      showToast(data.message || (editingMember ? 'Member updated.' : 'Member added.'));
      resetMemberForm();
      fetchAll();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleMemberActive = async (m: AboutTeamMember) => {
    setSaving(true);
    try {
      const headers = await adminHeaders(true);
      const res = await fetch('/api/about-page/team', {
        method: 'PUT',
        headers,
        body: JSON.stringify({ member: { ...m, active: !m.active } }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      showToast(`Member ${!m.active ? 'activated' : 'hidden'}.`);
      fetchAll();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMember = async (m: AboutTeamMember) => {
    if (!confirm(`Delete team member "${m.name}"?`)) return;
    setSaving(true);
    try {
      const headers = await adminHeaders();
      const res = await fetch(`/api/about-page/team?id=${m.id}`, { method: 'DELETE', headers });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      showToast('Team member deleted.');
      fetchAll();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleMoveMemberOrder = async (idx: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= teamMembers.length) return;
    const reordered = [...teamMembers];
    const [moved] = reordered.splice(idx, 1);
    reordered.splice(targetIdx, 0, moved);
    const ids = reordered.map((m) => m.id);

    setSaving(true);
    try {
      const headers = await adminHeaders(true);
      const res = await fetch('/api/about-page/team/reorder', { method: 'PATCH', headers, body: JSON.stringify({ ids }) });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      showToast('Team member order updated.');
      fetchAll();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleMemberImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast('File is too large. Max size is 5MB.', 'error');
      return;
    }
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      showToast('Only JPG, PNG and WebP formats are allowed.', 'error');
      return;
    }
    setMemberImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setMemberImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="w-5 h-5 animate-spin text-neutral-400 mr-2" />
        <span className="text-sm text-neutral-500">Loading about page data…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-up">
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

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {[
            { key: 'page-hero', label: 'Page & Hero', icon: Layout },
            { key: 'story', label: `Brand Story (${storyBlocks.length})`, icon: FileText },
            { key: 'values', label: `Brand Values (${values.length})`, icon: ShieldCheck },
            { key: 'team', label: `Team Members (${teamMembers.length})`, icon: UsersRound },
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
          {(storyBlocks.length === 0 && values.length === 0 && teamMembers.length === 0) && (
            <button
              onClick={handleSeed}
              disabled={seeding}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition"
            >
              <Database className="w-3.5 h-3.5" />
              {seeding ? 'Seeding…' : 'Seed Defaults'}
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

      {/* PAGE & HERO */}
      {activeSubTab === 'page-hero' && (
        <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
            <Layout className="w-4 h-4 text-neutral-400" />
            Page & Hero Settings
          </h3>

          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-neutral-500 uppercase mb-1">Hero Eyebrow *</label>
                <input
                  type="text"
                  value={settings.heroEyebrow}
                  onChange={(e) => setSettings({ ...settings, heroEyebrow: e.target.value })}
                  maxLength={60}
                  className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:border-black outline-none transition"
                />
              </div>
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
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <div>
                <label className="block text-[11px] font-semibold text-neutral-500 uppercase mb-1">Hero Image Alt Text *</label>
                <input
                  type="text"
                  value={settings.heroImageAlt}
                  onChange={(e) => setSettings({ ...settings, heroImageAlt: e.target.value })}
                  maxLength={160}
                  className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:border-black outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-neutral-500 uppercase mb-1">Hero Image</label>
              <div className="border border-dashed border-neutral-300 rounded-xl p-3 bg-neutral-50/50 hover:bg-neutral-50 transition">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleHeroImageChange}
                  className="hidden"
                  id="hero-image-upload"
                />
                <label htmlFor="hero-image-upload" className="flex items-center gap-2 cursor-pointer text-xs font-bold text-neutral-700">
                  <Upload className="w-4 h-4" />
                  {heroImageFile ? 'Change Selected File' : 'Click to upload hero image'}
                </label>
                {heroImageFile && (
                  <p className="text-[10px] text-neutral-400 mt-1">{(heroImageFile.size / 1024 / 1024).toFixed(2)} MB selected</p>
                )}
              </div>
              {(heroImagePreview || settings.heroImage) && (
                <div className="mt-3 relative aspect-video rounded-xl overflow-hidden bg-neutral-100 border border-neutral-200">
                  <Image src={heroImagePreview || settings.heroImage} alt="Hero preview" fill unoptimized className="object-cover" />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-neutral-500 uppercase mb-1">Team Heading *</label>
                <input
                  type="text"
                  value={settings.teamHeading}
                  onChange={(e) => setSettings({ ...settings, teamHeading: e.target.value })}
                  maxLength={100}
                  className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:border-black outline-none transition"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-neutral-500 uppercase mb-1">Team Description</label>
                <input
                  type="text"
                  value={settings.teamDescription}
                  onChange={(e) => setSettings({ ...settings, teamDescription: e.target.value })}
                  maxLength={500}
                  className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:border-black outline-none transition"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 text-xs font-medium text-neutral-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.valuesSectionActive}
                  onChange={(e) => setSettings({ ...settings, valuesSectionActive: e.target.checked })}
                  className="rounded border-neutral-300 text-black focus:ring-black"
                />
                Values Section Active
              </label>
              <label className="flex items-center gap-2 text-xs font-medium text-neutral-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.teamSectionActive}
                  onChange={(e) => setSettings({ ...settings, teamSectionActive: e.target.checked })}
                  className="rounded border-neutral-300 text-black focus:ring-black"
                />
                Team Section Active
              </label>
              <label className="flex items-center gap-2 text-xs font-medium text-neutral-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.pageActive}
                  onChange={(e) => setSettings({ ...settings, pageActive: e.target.checked })}
                  className="rounded border-neutral-300 text-black focus:ring-black"
                />
                Page Active
              </label>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 text-xs font-bold bg-black text-white rounded-lg hover:bg-neutral-800 disabled:opacity-50 transition"
              >
                {saving ? 'Saving…' : 'Save Page Settings'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* BRAND STORY */}
      {activeSubTab === 'story' && (
        <div className="space-y-6">
          <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-neutral-400" />
              {editingStory ? 'Edit Story Block' : 'Add New Story Block'}
            </h3>

            <form onSubmit={handleSaveStory} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-neutral-500 uppercase mb-1">Story Text *</label>
                <textarea
                  rows={4}
                  value={storyForm.text}
                  onChange={(e) => setStoryForm({ ...storyForm, text: e.target.value })}
                  maxLength={3000}
                  className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:border-black outline-none transition resize-y"
                />
                <p className="text-[10px] text-neutral-400 mt-0.5 text-right">{storyForm.text.length}/3000</p>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 text-xs font-medium text-neutral-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={storyForm.active}
                    onChange={(e) => setStoryForm({ ...storyForm, active: e.target.checked })}
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
                    {editingStory ? 'Update Block' : 'Add Block'}
                  </button>
                  {editingStory && (
                    <button type="button" onClick={resetStoryForm} className="px-4 py-2 text-xs font-medium text-neutral-600 bg-neutral-100 rounded-lg hover:bg-neutral-200 transition">
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>

          {storyBlocks.length === 0 ? (
            <div className="text-center py-12 bg-neutral-50 border border-dashed border-neutral-300 rounded-xl">
              <FileText className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
              <p className="text-sm text-neutral-500">No story blocks added yet. Add one above or seed defaults.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {storyBlocks.map((s, idx) => (
                <div key={s.id} className="bg-white border border-neutral-200 rounded-xl p-4 shadow-sm hover:shadow transition">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <span className="text-xs font-mono font-bold text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded shrink-0">
                        #{idx + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full shrink-0 ${s.active ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-neutral-400'}`}>
                            {s.active ? 'Active' : 'Hidden'}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-600 font-light leading-relaxed whitespace-pre-line">{s.text}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => handleMoveStoryOrder(idx, 'up')} disabled={idx === 0 || saving} title="Move up" className="p-1.5 rounded hover:bg-neutral-100 text-neutral-400 hover:text-black disabled:opacity-30 transition">
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleMoveStoryOrder(idx, 'down')} disabled={idx === storyBlocks.length - 1 || saving} title="Move down" className="p-1.5 rounded hover:bg-neutral-100 text-neutral-400 hover:text-black disabled:opacity-30 transition">
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleToggleStoryActive(s)} disabled={saving} title={s.active ? 'Hide' : 'Show'} className="p-1.5 rounded hover:bg-neutral-100 text-neutral-400 hover:text-black disabled:opacity-30 transition">
                        {s.active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                      <button onClick={() => startEditStory(s)} title="Edit" className="p-1.5 rounded hover:bg-neutral-100 text-neutral-400 hover:text-black transition">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDeleteStory(s)} disabled={saving} title="Delete" className="p-1.5 rounded hover:bg-red-50 text-neutral-400 hover:text-red-600 disabled:opacity-30 transition">
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

      {/* BRAND VALUES */}
      {activeSubTab === 'values' && (
        <div className="space-y-6">
          <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-neutral-400" />
              {editingValue ? 'Edit Brand Value' : 'Add New Brand Value'}
            </h3>

            <form onSubmit={handleSaveValue} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-500 uppercase mb-1">Title *</label>
                  <input
                    type="text"
                    value={valueForm.title}
                    onChange={(e) => setValueForm({ ...valueForm, title: e.target.value })}
                    maxLength={100}
                    className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:border-black outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-500 uppercase mb-1">Icon *</label>
                  <select
                    value={valueForm.icon}
                    onChange={(e) => setValueForm({ ...valueForm, icon: e.target.value })}
                    className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:border-black outline-none transition bg-white"
                  >
                    {allowedValueIcons.map((icon) => (
                      <option key={icon} value={icon}>{icon.charAt(0).toUpperCase() + icon.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-500 uppercase mb-1">Description *</label>
                <textarea
                  rows={2}
                  value={valueForm.description}
                  onChange={(e) => setValueForm({ ...valueForm, description: e.target.value })}
                  maxLength={500}
                  className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:border-black outline-none transition resize-y"
                />
                <p className="text-[10px] text-neutral-400 mt-0.5 text-right">{valueForm.description.length}/500</p>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 text-xs font-medium text-neutral-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={valueForm.active}
                    onChange={(e) => setValueForm({ ...valueForm, active: e.target.checked })}
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
                    {editingValue ? 'Update Value' : 'Add Value'}
                  </button>
                  {editingValue && (
                    <button type="button" onClick={resetValueForm} className="px-4 py-2 text-xs font-medium text-neutral-600 bg-neutral-100 rounded-lg hover:bg-neutral-200 transition">
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>

          {values.length === 0 ? (
            <div className="text-center py-12 bg-neutral-50 border border-dashed border-neutral-300 rounded-xl">
              <ShieldCheck className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
              <p className="text-sm text-neutral-500">No brand values added yet. Add one above or seed defaults.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {values.map((v, idx) => {
                const IconComponent = iconMap[v.icon] || ShieldCheck;
                return (
                  <div key={v.id} className="bg-white border border-neutral-200 rounded-xl p-4 shadow-sm hover:shadow transition">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <span className="text-xs font-mono font-bold text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded shrink-0">
                          #{idx + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <IconComponent className="w-4 h-4 text-neutral-400" />
                            <h4 className="text-sm font-bold text-neutral-900">{v.title}</h4>
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full shrink-0 ${v.active ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-neutral-400'}`}>
                              {v.active ? 'Active' : 'Hidden'}
                            </span>
                          </div>
                          <p className="text-xs text-neutral-600 font-light leading-relaxed">{v.description}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => handleMoveValueOrder(idx, 'up')} disabled={idx === 0 || saving} title="Move up" className="p-1.5 rounded hover:bg-neutral-100 text-neutral-400 hover:text-black disabled:opacity-30 transition">
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleMoveValueOrder(idx, 'down')} disabled={idx === values.length - 1 || saving} title="Move down" className="p-1.5 rounded hover:bg-neutral-100 text-neutral-400 hover:text-black disabled:opacity-30 transition">
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleToggleValueActive(v)} disabled={saving} title={v.active ? 'Hide' : 'Show'} className="p-1.5 rounded hover:bg-neutral-100 text-neutral-400 hover:text-black disabled:opacity-30 transition">
                          {v.active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                        <button onClick={() => startEditValue(v)} title="Edit" className="p-1.5 rounded hover:bg-neutral-100 text-neutral-400 hover:text-black transition">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDeleteValue(v)} disabled={saving} title="Delete" className="p-1.5 rounded hover:bg-red-50 text-neutral-400 hover:text-red-600 disabled:opacity-30 transition">
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

      {/* TEAM MEMBERS */}
      {activeSubTab === 'team' && (
        <div className="space-y-6">
          <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
              <UsersRound className="w-4 h-4 text-neutral-400" />
              {editingMember ? 'Edit Team Member' : 'Add New Team Member'}
            </h3>

            <form onSubmit={handleSaveMember} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">Name *</label>
                  <input
                    type="text"
                    value={memberForm.name}
                    onChange={(e) => setMemberForm({ ...memberForm, name: e.target.value })}
                    placeholder="e.g. Amna Sheikh"
                    maxLength={100}
                    className="w-full px-3.5 py-2.5 text-sm border border-neutral-300 rounded-lg outline-none focus:border-black transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">Role *</label>
                  <input
                    type="text"
                    value={memberForm.role}
                    onChange={(e) => setMemberForm({ ...memberForm, role: e.target.value })}
                    maxLength={120}
                    className="w-full px-3.5 py-2.5 text-sm border border-neutral-300 rounded-lg outline-none focus:border-black transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">Bio</label>
                <textarea
                  rows={3}
                  value={memberForm.bio}
                  onChange={(e) => setMemberForm({ ...memberForm, bio: e.target.value })}
                  placeholder="Optional: Brief bio or description"
                  maxLength={1500}
                  className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:border-black outline-none transition resize-y"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">Image Alt Text</label>
                <input
                  type="text"
                  value={memberForm.imageAlt}
                  onChange={(e) => setMemberForm({ ...memberForm, imageAlt: e.target.value })}
                  placeholder="Defaults to the team member's name"
                  maxLength={160}
                  className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:border-black outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">Image Upload</label>
                <div className="border border-dashed border-neutral-300 rounded-xl p-3 bg-neutral-50/50 hover:bg-neutral-50 transition">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleMemberImageChange}
                    className="hidden"
                    id="team-member-image-upload"
                  />
                  <label
                    htmlFor="team-member-image-upload"
                    className="flex items-center gap-2 cursor-pointer py-3 text-center text-xs font-bold text-neutral-700"
                  >
                    <Upload className="w-5 h-5 text-neutral-400 mb-1.5" />
                    {memberImageFile ? 'Change Selected Image' : 'Click to upload member image'}
                  </label>
                  {memberImageFile && (
                    <span className="text-xs font-medium text-neutral-500 truncate max-w-xs">
                      {memberImageFile.name} ({(memberImageFile.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-neutral-400 mt-1 font-light">
                  Import JPG, PNG, or WebP files. Max 5MB. Image will be cropped to 800x800 square.
                </p>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 text-xs font-medium text-neutral-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={memberForm.active}
                    onChange={(e) => setMemberForm({ ...memberForm, active: e.target.checked })}
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
                    {editingMember ? 'Update Member' : 'Add Member'}
                  </button>
                  {editingMember && (
                    <button type="button" onClick={resetMemberForm} className="px-4 py-2 text-xs font-medium text-neutral-600 bg-neutral-100 rounded-lg hover:bg-neutral-200 transition">
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>

      {/* TEAM MEMBERS LIST */}
      {teamMembers.length === 0 ? (
        <div className="text-center py-12 bg-neutral-50 border border-dashed border-neutral-300 rounded-xl">
          <UsersRound className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
          <p className="text-sm text-neutral-500">No team members added yet. Add one above or seed defaults.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {teamMembers.map((m, idx) => (
            <div key={m.id} className="bg-white border border-neutral-200 rounded-xl p-4 shadow-sm hover:shadow transition">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <span className="w-7 h-7 rounded-full bg-black text-white text-xs font-bold flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <div className="relative w-10 h-13 rounded bg-neutral-50 border border-neutral-200 overflow-hidden shrink-0">
                        <Image
                          src={m.image}
                          alt={m.name}
                          fill
                          unoptimized
                          className="object-cover"
                        />
                      </div>
                      <div className="overflow-hidden">
                        <h4 className="font-bold text-neutral-900 truncate">{m.name}</h4>
                        <p className="text-xs text-neutral-500 font-light">{m.role}</p>
                        {m.bio && (
                          <p className="text-[10px] text-neutral-500 mt-0.5">
                            {m.bio}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => handleMoveMemberOrder(idx, 'up')} disabled={idx === 0 || saving} title="Move up" className="p-1.5 rounded hover:bg-neutral-100 text-neutral-400 hover:text-black disabled:opacity-30 transition">
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleMoveMemberOrder(idx, 'down')} disabled={idx === teamMembers.length - 1 || saving} title="Move down" className="p-1.5 rounded hover:bg-neutral-100 text-neutral-400 hover:text-black disabled:opacity-30 transition">
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleToggleMemberActive(m)} disabled={saving} title={m.active ? 'Hide' : 'Show'} className="p-1.5 rounded hover:bg-neutral-100 text-neutral-400 hover:text-black disabled:opacity-30 transition">
                        {m.active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                      <button onClick={() => startEditMember(m)} title="Edit" className="p-1.5 rounded hover:bg-neutral-100 text-neutral-400 hover:text-black transition">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDeleteMember(m)} disabled={saving} title="Delete" className="p-1.5 rounded hover:bg-red-50 text-neutral-400 hover:text-red-600 disabled:opacity-30 transition">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
        </div>
      )}

      {/* SEED BUTTON */}
      {activeSubTab === 'page-hero' && (
        <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-neutral-200 pb-4">
            <h3 className="font-display font-extrabold text-xs tracking-wider uppercase">
              <Layout className="w-4 h-4 text-neutral-400" />
              About Us Page Settings
            </h3>
            <button
              onClick={handleSeed}
              disabled={seeding}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition"
            >
              <Database className="w-3.5 h-3.5" />
              {seeding ? 'Seeding...' : 'Seed Defaults'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
