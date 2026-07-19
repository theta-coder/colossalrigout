'use client';

import React from 'react';
import { Edit2, Plus, RefreshCw, Trash2 } from 'lucide-react';

type Module = 'colors' | 'sizes' | 'size-guides' | 'collections' | 'reviews' | 'inventory';
const titles: Record<Module, string> = { colors: 'Color Library', sizes: 'Size Library', 'size-guides': 'Size Guides', collections: 'Collections', reviews: 'Review Moderation', inventory: 'Stock Inventory' };

const emptyForm = (module: Module) => module === 'colors'
  ? { name: '', hex: '#000000', secondaryHex: '', active: true, order: 1 }
  : module === 'sizes' ? { name: '', code: '', type: 'clothing', active: true, order: 1 }
  : module === 'size-guides' ? { name: '', unit: 'in', instructions: '', columnsText: 'Chest, Waist, Length', rowsText: 'S | 36-38 | 30-32 | 27\nM | 39-41 | 33-35 | 28', columns: [], rows: [], active: true }
  : module === 'collections' ? { name: '', slug: '', subtitle: '', description: '', imageData: '', active: true, featuredOnHome: true, order: 1 }
  : module === 'inventory' ? { productId: '', colorId: '', sizeId: '', sku: '', stockOnHand: 0, reservedStock: 0, availableStock: 0, reorderLevel: 2, active: true }
  : { productId: '', customerName: '', rating: 5, title: '', body: '', status: 'pending' };

async function prepareCollectionImage(file: File) {
  const source = await createImageBitmap(file);
  const scale = Math.min(1, 900 / Math.max(source.width, source.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(source.width * scale); canvas.height = Math.round(source.height * scale);
  canvas.getContext('2d')?.drawImage(source, 0, 0, canvas.width, canvas.height); source.close();
  const value = canvas.toDataURL('image/webp', .72);
  if (value.length > 750_000) throw new Error('Collection image is too large.');
  return value;
}

export default function CommerceAdminModule({ module }: { module: Module }) {
  const [records, setRecords] = React.useState<any[]>([]);
  const [form, setForm] = React.useState<any>(() => emptyForm(module));
  const [editing, setEditing] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [message, setMessage] = React.useState('');

  const load = React.useCallback(async () => {
    setLoading(true);
    try { const response = await fetch(`/api/commerce/${module}`); const data = await response.json(); setRecords(data.data || []); }
    finally { setLoading(false); }
  }, [module]);
  React.useEffect(() => { setForm(emptyForm(module)); setEditing(null); load(); }, [module, load]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const prepared = { ...form };
    if (module === 'colors') {
      prepared.hex = String(prepared.hex || '').startsWith('#') ? prepared.hex.toUpperCase() : `#${prepared.hex}`.toUpperCase();
      prepared.slug = prepared.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    }
    if (module === 'sizes' && !prepared.name) prepared.name = prepared.code;
    if (module === 'collections' && !prepared.slug) prepared.slug = prepared.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    if (module === 'size-guides') {
      const labels = String(prepared.columnsText || '').split(',').map((value: string) => value.trim()).filter(Boolean);
      prepared.columns = labels.map((label: string, index: number) => ({ key: label.toLowerCase().replace(/[^a-z0-9]+/g, '-'), label, order: index + 1 }));
      prepared.rows = String(prepared.rowsText || '').split('\n').map((line: string, rowIndex: number) => {
        const [sizeName, ...values] = line.split('|').map(value => value.trim());
        return { sizeId: sizeName.toLowerCase().replace(/[^a-z0-9]+/g, '-'), sizeName, order: rowIndex + 1, values: Object.fromEntries(prepared.columns.map((column: any, index: number) => [column.key, values[index] || ''])) };
      }).filter((row: any) => row.sizeName);
    }
    if (module === 'inventory') prepared.availableStock = Math.max(0, Number(prepared.stockOnHand) - Number(prepared.reservedStock));
    const response = await fetch(`/api/commerce/${module}`, { method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ record: prepared }) });
    const data = await response.json();
    setMessage(data.success ? 'Saved successfully.' : data.message || 'Save failed.');
    if (data.success) { setForm(emptyForm(module)); setEditing(null); load(); }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this record?')) return;
    await fetch(`/api/commerce/${module}?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    load();
  };

  const field = (key: string, label: string, type = 'text') => (
    <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-600">
      {label}
      <input type={type} value={form[key] ?? ''} onChange={e => setForm({ ...form, [key]: type === 'number' ? Number(e.target.value) : e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 text-xs font-medium outline-none focus:border-black" />
    </label>
  );

  return <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 animate-fade-up">
    <form onSubmit={save} className="bg-white border rounded-xl p-6 space-y-4 self-start">
      <h3 className="font-display font-extrabold uppercase">{editing ? 'Edit' : 'Add'} {titles[module]}</h3>
      {module === 'colors' && <>{field('name', 'Color Name *')}<div className="grid grid-cols-[72px_1fr] gap-3"><input type="color" value={form.hex} onChange={e => setForm({ ...form, hex: e.target.value })} className="w-full h-10" />{field('hex', 'HEX *')}</div>{field('secondaryHex', 'Second HEX (optional)')}{field('order', 'Order', 'number')}</>}
      {module === 'sizes' && <>{field('name', 'Display Name *')}{field('code', 'Size Code *')}<label className="block text-[10px] font-bold uppercase">Type<select value={form.type} onChange={e => setForm({...form,type:e.target.value})} className="mt-1 w-full border rounded-lg px-3 py-2"><option>clothing</option><option>shoe</option><option>kids</option><option>accessory</option><option>custom</option></select></label>{field('order','Order','number')}</>}
      {module === 'size-guides' && <>{field('name','Guide Name *')}<label className="block text-[10px] font-bold uppercase">Unit<select value={form.unit} onChange={e=>setForm({...form,unit:e.target.value})} className="mt-1 w-full border rounded-lg px-3 py-2"><option value="in">Inches</option><option value="cm">Centimeters</option></select></label>{field('columnsText','Measurement Columns (comma separated)')}<label className="block text-[10px] font-bold uppercase">Rows (Size | value | value)<textarea value={form.rowsText || ''} onChange={e=>setForm({...form,rowsText:e.target.value})} rows={5} className="mt-1 w-full border rounded-lg p-3 text-xs"/></label>{field('instructions','Measurement Instructions')}</>}
      {module === 'collections' && <>{field('name','Collection Name *')}{field('slug','Slug (auto if empty)')}{field('subtitle','Subtitle')}{field('description','Description')}<label className="block text-[10px] font-bold uppercase">Cover Image File<input type="file" accept="image/jpeg,image/png,image/webp" onChange={async e=>{const file=e.target.files?.[0];if(file)setForm({...form,imageData:await prepareCollectionImage(file)})}} className="mt-1 w-full border rounded-lg px-3 py-2"/></label>{form.imageData&&<img src={form.imageData} alt="Collection preview" className="h-24 w-full object-cover rounded-lg"/>}{field('order','Order','number')}<label className="text-xs font-bold flex gap-2"><input type="checkbox" checked={form.featuredOnHome} onChange={e=>setForm({...form,featuredOnHome:e.target.checked})}/> Featured on homepage</label></>}
      {module === 'inventory' && <>{field('productId','Product ID *')}{field('colorId','Color ID *')}{field('sizeId','Size ID *')}{field('sku','SKU *')}{field('stockOnHand','Stock on Hand','number')}{field('reservedStock','Reserved','number')}{field('reorderLevel','Low-stock Level','number')}</>}
      {module === 'reviews' && <>{field('productId','Product ID')}{field('customerName','Customer')}{field('rating','Rating','number')}{field('title','Title')}{field('body','Review')}<label className="block text-[10px] font-bold uppercase">Status<select value={form.status} onChange={e=>setForm({...form,status:e.target.value})} className="mt-1 w-full border rounded-lg px-3 py-2"><option>pending</option><option>approved</option><option>rejected</option></select></label></>}
      {module !== 'reviews' && <label className="text-xs font-bold flex gap-2"><input type="checkbox" checked={form.active !== false} onChange={e=>setForm({...form,active:e.target.checked})}/> Active</label>}
      {message && <p className="text-xs text-neutral-500">{message}</p>}
      <button className="w-full bg-black text-white rounded-lg py-2.5 text-xs font-bold uppercase flex justify-center gap-2"><Plus className="w-4 h-4"/>{editing ? 'Update' : 'Save'}</button>
    </form>
    <div className="xl:col-span-2 bg-white border rounded-xl overflow-hidden">
      <div className="p-5 border-b flex justify-between"><div><h3 className="font-display font-extrabold uppercase">{titles[module]}</h3><p className="text-xs text-neutral-400">{records.length} database records</p></div><button onClick={load}><RefreshCw className={`w-4 h-4 ${loading?'animate-spin':''}`}/></button></div>
      <div className="divide-y max-h-[680px] overflow-auto">{records.map(record => <div key={record.id} className="p-4 flex items-center gap-4 text-xs">
        {module === 'colors' && <span className="w-9 h-9 rounded-full border" style={{background: record.secondaryHex ? `linear-gradient(135deg,${record.hex} 50%,${record.secondaryHex} 50%)` : record.hex}}/>}
        <div className="flex-1 min-w-0"><p className="font-bold text-sm">{record.name || record.sku || record.title || record.id}</p><p className="text-neutral-400 truncate">{record.hex || record.code || record.slug || `${record.productId || ''} ${record.status || ''}`}</p></div>
        {module === 'inventory' && <span className={`font-bold ${record.availableStock <= record.reorderLevel?'text-red-600':'text-emerald-600'}`}>{record.availableStock} available</span>}
        {module === 'reviews' && <span className="uppercase font-bold">{record.status}</span>}
        <button onClick={()=>{setEditing(record.id);setForm(record)}} className="p-2 border rounded"><Edit2 className="w-3.5 h-3.5"/></button>
        <button onClick={()=>remove(record.id)} className="p-2 border border-red-100 text-red-500 rounded"><Trash2 className="w-3.5 h-3.5"/></button>
      </div>)}{!loading && records.length===0 && <p className="p-12 text-center text-neutral-400 text-xs">No records yet.</p>}</div>
    </div>
  </div>;
}
