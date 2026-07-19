import React, { useState, useEffect } from 'react';
import { Trash2, Edit2, Plus, X, Search, MapPin, Phone, CheckCircle, AlertCircle } from 'lucide-react';

interface Store {
  id: string;
  name: string;
  address: string;
  city: string;
  phone?: string;
  mapUrl?: string;
  active: boolean;
}

export default function StoresModule() {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [form, setForm] = useState({
    name: '',
    address: '',
    city: '',
    phone: '',
    mapUrl: '',
    active: true,
  });
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchStores();
  }, []);

  const fetchStores = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/stores');
      const json = await res.json();
      if (json.success) {
        setStores(json.data || []);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (store: Store) => {
    setEditingStore(store);
    setForm({
      name: store.name,
      address: store.address,
      city: store.city,
      phone: store.phone || '',
      mapUrl: store.mapUrl || '',
      active: store.active,
    });
    setShowForm(true);
    setError('');
    setSuccess('');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this store?')) return;
    try {
      const res = await fetch(`/api/stores?id=${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        setSuccess('Store deleted successfully!');
        fetchStores();
      } else {
        setError(json.message || 'Failed to delete store.');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.address || !form.city) {
      setError('Please fill in all required fields.');
      return;
    }
    
    setSubmitting(true);
    setError('');
    setSuccess('');
    
    try {
      const method = editingStore ? 'PUT' : 'POST';
      const payload = editingStore
        ? { store: { ...form, id: editingStore.id } }
        : { store: form };

      const res = await fetch('/api/stores', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (json.success) {
        setSuccess(editingStore ? 'Store updated!' : 'Store created!');
        setShowForm(false);
        setEditingStore(null);
        setForm({ name: '', address: '', city: '', phone: '', mapUrl: '', active: true });
        fetchStores();
      } else {
        setError(json.message || 'Something went wrong.');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredStores = stores.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 text-xs text-neutral-800">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 border border-neutral-200/65 rounded-xl shadow-sm">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-900">Physical Stores Registry</h2>
          <p className="text-[11px] text-neutral-500 mt-0.5">Manage physical locations referenced in Visit Us In Store campaigns.</p>
        </div>
        <button
          onClick={() => {
            setShowForm(true);
            setEditingStore(null);
            setForm({ name: '', address: '', city: '', phone: '', mapUrl: '', active: true });
            setError('');
            setSuccess('');
          }}
          className="flex items-center gap-1.5 px-4 py-2 bg-black hover:bg-neutral-800 text-white rounded-lg font-bold uppercase tracking-wider shadow-sm transition"
        >
          <Plus className="w-3.5 h-3.5" /> Add Store Location
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
        <div className="bg-white border border-neutral-200/65 rounded-xl shadow-sm p-6 max-w-xl animate-fade-up">
          <div className="flex justify-between items-center pb-4 mb-4 border-b">
            <h3 className="text-xs font-extrabold uppercase tracking-widest text-neutral-900">
              {editingStore ? 'Edit Store Location' : 'New Store Location'}
            </h3>
            <button onClick={() => setShowForm(false)} className="text-neutral-400 hover:text-black">
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-neutral-700 uppercase tracking-wider mb-1.5">Store Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Gulberg Flagship Store"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg outline-none focus:border-black transition"
                />
              </div>
              <div>
                <label className="block font-bold text-neutral-700 uppercase tracking-wider mb-1.5">City *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lahore"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg outline-none focus:border-black transition"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-neutral-700 uppercase tracking-wider mb-1.5">Address *</label>
              <textarea
                required
                rows={2}
                placeholder="Full address of the outlet..."
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg outline-none focus:border-black transition resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-neutral-700 uppercase tracking-wider mb-1.5">Contact Phone</label>
                <input
                  type="text"
                  placeholder="e.g. +92 42 111 222 333"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg outline-none focus:border-black transition"
                />
              </div>
              <div>
                <label className="block font-bold text-neutral-700 uppercase tracking-wider mb-1.5">Map Embed/Link URL</label>
                <input
                  type="text"
                  placeholder="Google Maps sharing URL..."
                  value={form.mapUrl}
                  onChange={(e) => setForm({ ...form, mapUrl: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg outline-none focus:border-black transition"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="activeStore"
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
                className="w-4 h-4 rounded text-black border-neutral-300 focus:ring-black"
              />
              <label htmlFor="activeStore" className="font-bold text-neutral-700 uppercase tracking-wider">
                Store is open and active
              </label>
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
                {submitting ? 'Saving...' : 'Save Location'}
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
            placeholder="Search stores by name, city, or address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent outline-none font-medium"
          />
        </div>

        {loading ? (
          <div className="text-center py-12 text-neutral-400">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black mx-auto mb-2"></div>
            <p>Loading stores...</p>
          </div>
        ) : filteredStores.length === 0 ? (
          <div className="text-center py-16 text-neutral-500 font-medium">
            No store locations found. Add one to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200 text-neutral-400 text-[10px] font-extrabold uppercase tracking-widest">
                  <th className="py-3 px-5">Store Name</th>
                  <th className="py-3 px-5">City</th>
                  <th className="py-3 px-5">Address</th>
                  <th className="py-3 px-5">Phone</th>
                  <th className="py-3 px-5">Status</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 font-medium text-neutral-700">
                {filteredStores.map((s) => (
                  <tr key={s.id} className="hover:bg-neutral-50/50 transition">
                    <td className="py-4 px-5 font-bold text-neutral-900">{s.name}</td>
                    <td className="py-4 px-5">{s.city}</td>
                    <td className="py-4 px-5 max-w-xs truncate">{s.address}</td>
                    <td className="py-4 px-5">{s.phone || 'N/A'}</td>
                    <td className="py-4 px-5">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                          s.active
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-neutral-100 text-neutral-500 border'
                        }`}
                      >
                        {s.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleEdit(s)}
                          className="w-7 h-7 rounded-lg border border-neutral-200 flex items-center justify-center hover:bg-neutral-50 transition text-neutral-500"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(s.id)}
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
    </div>
  );
}
