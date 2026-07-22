'use client';

import { useCallback, useEffect, useState } from 'react';
import { Edit2, Plus, RefreshCw, Trash2, X } from 'lucide-react';
import { AudienceGroup } from '../../lib/audience-group';

export default function AudienceGroupsModule(props: {
  groups?: AudienceGroup[]; loading?: boolean; refresh?: () => Promise<void>;
} = {}) {
  const [localGroups, setLocalGroups] = useState<AudienceGroup[]>([]);
  const [localLoading, setLocalLoading] = useState(false);
  const loadGroups = useCallback(async () => {
    setLocalLoading(true);
    try {
      const response = await fetch('/api/audience-groups?all=true', { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || 'Unable to load customer groups.');
      setLocalGroups(payload.data || []);
    } finally { setLocalLoading(false); }
  }, []);
  const groups = props.groups ?? localGroups;
  const loading = props.loading ?? localLoading;
  const refresh = props.refresh ?? loadGroups;
  const [name, setName] = useState('');
  const [editing, setEditing] = useState<AudienceGroup | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (!props.groups) void loadGroups(); }, [loadGroups, props.groups]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const response = await fetch('/api/audience-groups', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ group: { ...editing, name } }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message);
      setName(''); setEditing(null); await refresh();
    } catch (error: any) { alert(error.message || 'Unable to save customer group.'); }
    finally { setSaving(false); }
  };

  const remove = async (group: AudienceGroup) => {
    if (!confirm(`Delete "${group.name}"? Existing products will keep their current assignment.`)) return;
    const response = await fetch(`/api/audience-groups?id=${encodeURIComponent(group.id)}`, { method: 'DELETE' });
    if (response.ok) await refresh();
  };

  return <div className="max-w-3xl mx-auto space-y-6 animate-fade-up">
    <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-sm">
      <h3 className="font-extrabold uppercase tracking-wide">{editing ? 'Edit customer group' : 'Add customer group'}</h3>
      <p className="text-xs text-neutral-500 mt-1 mb-5">Only enter a name, for example Men, Boys, or Kids.</p>
      <form onSubmit={save} className="flex flex-col sm:flex-row gap-3">
        <input value={name} onChange={event => setName(event.target.value)} placeholder="e.g. Boys" className="flex-1 px-4 py-3 text-sm border border-neutral-300 rounded-lg outline-none focus:border-black" />
        <button disabled={saving || !name.trim()} className="bg-black text-white px-5 py-3 rounded-lg text-xs font-bold uppercase flex items-center justify-center gap-2 disabled:opacity-40">
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} {editing ? 'Save name' : 'Add group'}
        </button>
        {editing && <button type="button" onClick={() => { setEditing(null); setName(''); }} className="border px-4 py-3 rounded-lg"><X className="w-4 h-4" /></button>}
      </form>
    </div>
    <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm">
      <div className="px-6 py-4 border-b flex justify-between"><h3 className="font-bold">Customer Groups ({groups.length})</h3><button onClick={refresh}><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button></div>
      {groups.map(group => <div key={group.id} className="px-6 py-4 border-b last:border-0 flex items-center justify-between">
        <div><p className="font-bold text-sm">{group.name}</p><p className="text-[10px] text-neutral-400">/{group.slug}</p></div>
        <div className="flex gap-2"><button onClick={() => { setEditing(group); setName(group.name); }} className="p-2 border rounded-lg hover:bg-neutral-50"><Edit2 className="w-4 h-4" /></button><button onClick={() => remove(group)} className="p-2 border border-red-100 text-red-500 rounded-lg hover:bg-red-50"><Trash2 className="w-4 h-4" /></button></div>
      </div>)}
    </div>
  </div>;
}
