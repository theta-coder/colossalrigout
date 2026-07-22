'use client';
import { useCallback, useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Edit2, Eye, EyeOff, Plus, RefreshCw, Trash2, X } from 'lucide-react';
import { adminApiFetch } from '../../lib/admin-api';
import { ShippingPolicyIcon, ShippingPolicySection, ShippingPolicySettings } from '../../lib/shipping-policy';

const emptyForm = { title: '', description: '', icon: 'truck' as ShippingPolicyIcon, active: true };

export default function ShippingPolicyModule() {
  const [settings, setSettings] = useState<ShippingPolicySettings>({ id: 'settings', pageTitle: 'SHIPPING POLICY', intro: '' });
  const [sections, setSections] = useState<ShippingPolicySection[]>([]);
  const [form, setForm] = useState(emptyForm); const [editing, setEditing] = useState<ShippingPolicySection | null>(null);
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try { const response = await adminApiFetch('/api/shipping-policy?all=true'); const payload = await response.json(); if (!response.ok || !payload.success) throw new Error(payload.message); setSettings(payload.data.settings); setSections(payload.data.sections); }
    catch (error: any) { setMessage(error.message || 'Unable to load shipping policy.'); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const saveSettings = async (event: React.FormEvent) => { event.preventDefault(); setSaving(true); try { const response = await adminApiFetch('/api/shipping-policy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ settings }) }); const data = await response.json(); if (!response.ok) throw new Error(data.message); setMessage(data.message); await load(); } catch (error: any) { setMessage(error.message); } finally { setSaving(false); } };
  const saveSection = async (event: React.FormEvent) => { event.preventDefault(); setSaving(true); try { const response = await adminApiFetch('/api/shipping-policy', { method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ section: { ...editing, ...form } }) }); const data = await response.json(); if (!response.ok) throw new Error(data.message); setMessage(data.message); setEditing(null); setForm(emptyForm); await load(); } catch (error: any) { setMessage(error.message); } finally { setSaving(false); } };
  const update = async (section: ShippingPolicySection) => { const response = await adminApiFetch('/api/shipping-policy', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ section }) }); const data = await response.json(); if (!response.ok) throw new Error(data.message); await load(); };
  const move = async (index: number, delta: number) => { const target = index + delta; if (target < 0 || target >= sections.length) return; const ids = sections.map(item => item.id); [ids[index], ids[target]] = [ids[target], ids[index]]; setSaving(true); try { const response = await adminApiFetch('/api/shipping-policy', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderedIds: ids }) }); const data = await response.json(); if (!response.ok) throw new Error(data.message); await load(); } catch (error: any) { setMessage(error.message); } finally { setSaving(false); } };
  const remove = async (section: ShippingPolicySection) => { if (!confirm(`Delete "${section.title}"?`)) return; const response = await adminApiFetch(`/api/shipping-policy?id=${encodeURIComponent(section.id)}`, { method: 'DELETE' }); const data = await response.json(); if (!response.ok) setMessage(data.message); else await load(); };
  const seed = async () => { setSaving(true); try { const response = await adminApiFetch('/api/shipping-policy/seed', { method: 'POST' }); const data = await response.json(); if (!response.ok) throw new Error(data.message); setMessage(data.message); await load(); } catch (error: any) { setMessage(error.message); } finally { setSaving(false); } };

  if (loading) return <div className="py-20 text-center"><RefreshCw className="w-5 h-5 animate-spin mx-auto" /></div>;
  return <div className="max-w-4xl mx-auto space-y-6">
    {message && <div className="bg-black text-white text-xs p-3 rounded-lg flex justify-between"><span>{message}</span><button onClick={() => setMessage('')}><X className="w-4 h-4" /></button></div>}
    <form onSubmit={saveSettings} className="bg-white border rounded-xl p-6 space-y-4">
      <h3 className="font-bold uppercase">Page Settings</h3>
      <input required maxLength={100} value={settings.pageTitle} onChange={event => setSettings({ ...settings, pageTitle: event.target.value })} placeholder="Page title" className="w-full border rounded-lg px-3 py-2 text-sm" />
      <textarea maxLength={1000} value={settings.intro} onChange={event => setSettings({ ...settings, intro: event.target.value })} placeholder="Optional introduction shown above sections" className="w-full border rounded-lg px-3 py-2 text-sm" />
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="text-xs space-y-1"><span className="font-semibold">Free shipping threshold (PKR)</span><input type="number" min="0" value={settings.freeShippingThreshold ?? 5000} onChange={event => setSettings({ ...settings, freeShippingThreshold: Number(event.target.value) })} className="w-full border rounded-lg px-3 py-2" /></label>
        <label className="text-xs space-y-1"><span className="font-semibold">Flat shipping rate (PKR)</span><input type="number" min="0" value={settings.flatRate ?? 500} onChange={event => setSettings({ ...settings, flatRate: Number(event.target.value) })} className="w-full border rounded-lg px-3 py-2" /></label>
        <label className="text-xs space-y-1"><span className="font-semibold">Minimum delivery days</span><input type="number" min="1" value={settings.deliveryMinBusinessDays ?? 4} onChange={event => setSettings({ ...settings, deliveryMinBusinessDays: Number(event.target.value) })} className="w-full border rounded-lg px-3 py-2" /></label>
        <label className="text-xs space-y-1"><span className="font-semibold">Maximum delivery days</span><input type="number" min="1" value={settings.deliveryMaxBusinessDays ?? 6} onChange={event => setSettings({ ...settings, deliveryMaxBusinessDays: Number(event.target.value) })} className="w-full border rounded-lg px-3 py-2" /></label>
      </div>
      <div className="flex flex-wrap gap-5 text-xs"><label><input type="checkbox" checked={settings.freeShippingEnabled !== false} onChange={event => setSettings({ ...settings, freeShippingEnabled: event.target.checked })} className="mr-2" />Free shipping enabled</label><label><input type="checkbox" checked={settings.flatRateEnabled !== false} onChange={event => setSettings({ ...settings, flatRateEnabled: event.target.checked })} className="mr-2" />Flat rate enabled</label><label><input type="checkbox" checked={settings.productPageEnabled !== false} onChange={event => setSettings({ ...settings, productPageEnabled: event.target.checked })} className="mr-2" />Show on product page</label></div>
      <textarea maxLength={500} value={settings.productPageNote || ''} onChange={event => setSettings({ ...settings, productPageNote: event.target.value })} placeholder="Optional product-page shipping note" className="w-full border rounded-lg px-3 py-2 text-sm" />
      <button disabled={saving} className="bg-black text-white px-5 py-2 rounded-lg text-xs font-bold">SAVE PAGE SETTINGS</button>
    </form>
    <form onSubmit={saveSection} className="bg-white border rounded-xl p-6 space-y-4">
      <h3 className="font-bold uppercase">{editing ? 'Edit Policy Section' : 'Add Policy Section'}</h3>
      <div className="grid sm:grid-cols-2 gap-3"><input required maxLength={100} value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} placeholder="Section title" className="border rounded-lg px-3 py-2 text-sm" /><select value={form.icon} onChange={event => setForm({ ...form, icon: event.target.value as ShippingPolicyIcon })} className="border rounded-lg px-3 py-2 text-sm bg-white">{['truck','dollar','package','globe','alert'].map(icon => <option key={icon}>{icon}</option>)}</select></div>
      <textarea required maxLength={3000} rows={5} value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} placeholder="Policy details" className="w-full border rounded-lg px-3 py-2 text-sm" />
      <label className="text-xs"><input type="checkbox" checked={form.active} onChange={event => setForm({ ...form, active: event.target.checked })} className="mr-2" />Visible on storefront</label>
      <div className="flex gap-2"><button disabled={saving} className="bg-black text-white px-5 py-2 rounded-lg text-xs font-bold"><Plus className="w-3 h-3 inline mr-1" />{editing ? 'UPDATE' : 'ADD SECTION'}</button>{editing && <button type="button" onClick={() => { setEditing(null); setForm(emptyForm); }} className="border px-4 rounded-lg text-xs">CANCEL</button>}</div>
    </form>
    {sections.length === 0 ? <div className="bg-white border rounded-xl py-14 text-center"><p className="text-sm text-neutral-500 mb-4">No shipping sections configured.</p><button onClick={seed} disabled={saving} className="bg-black text-white px-5 py-2 rounded-lg text-xs font-bold">CREATE DEFAULT POLICY</button></div> : <div className="space-y-3">{sections.map((section, index) => <div key={section.id} className="bg-white border rounded-xl p-4 flex gap-3 justify-between">
      <div><div className="flex gap-2 items-center"><h4 className="font-bold text-sm">{section.title}</h4><span className="text-[9px] bg-neutral-100 px-2 py-0.5 rounded uppercase">{section.icon}</span><span className={`text-[9px] px-2 py-0.5 rounded ${section.active ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-neutral-500'}`}>{section.active ? 'Active' : 'Hidden'}</span></div><p className="text-xs text-neutral-500 mt-1 line-clamp-2">{section.description}</p></div>
      <div className="flex shrink-0"><button disabled={index === 0 || saving} onClick={() => move(index,-1)} className="p-2 disabled:opacity-20"><ArrowUp className="w-4 h-4" /></button><button disabled={index === sections.length-1 || saving} onClick={() => move(index,1)} className="p-2 disabled:opacity-20"><ArrowDown className="w-4 h-4" /></button><button onClick={() => update({ ...section, active: !section.active })} className="p-2">{section.active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button><button onClick={() => { setEditing(section); setForm({ title: section.title, description: section.description, icon: section.icon, active: section.active }); }} className="p-2"><Edit2 className="w-4 h-4" /></button><button onClick={() => remove(section)} className="p-2 text-red-500"><Trash2 className="w-4 h-4" /></button></div>
    </div>)}</div>}
  </div>;
}
