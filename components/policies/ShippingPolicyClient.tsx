'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { AlertTriangle, DollarSign, Globe, PackageOpen, RefreshCw, Truck } from 'lucide-react';
import { ShippingPolicySection, ShippingPolicySettings } from '../../lib/shipping-policy';

const iconMap = { truck: Truck, dollar: DollarSign, package: PackageOpen, globe: Globe, alert: AlertTriangle };

export default function ShippingPolicyClient() {
  const [settings, setSettings] = useState<ShippingPolicySettings>({ id: 'settings', pageTitle: 'SHIPPING POLICY', intro: '' });
  const [sections, setSections] = useState<ShippingPolicySection[]>([]);
  const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const load = async () => { setLoading(true); setError(''); try { const response = await fetch('/api/shipping-policy'); const payload = await response.json(); if (!response.ok || !payload.success) throw new Error(payload.message); setSettings(payload.data.settings); setSections(payload.data.sections); } catch (error: any) { setError(error.message || 'Unable to load shipping policy.'); } finally { setLoading(false); } };
  useEffect(() => { load(); }, []);
  return <div className="max-w-7xl mx-auto px-4 pb-16">
    <section className="relative h-40 sm:h-56 md:h-64 overflow-hidden -mx-4"><Image src="https://images.unsplash.com/photo-1494412651409-8963ce7935a7?auto=format&fit=crop&w=1920&q=80" alt="Shipping policy background" fill priority className="object-cover object-center" /><div className="absolute inset-0 bg-black/50" /><div className="relative z-10 max-w-7xl mx-auto h-full flex flex-col justify-center px-4"><h1 className="font-display text-white text-3xl sm:text-4xl font-extrabold tracking-tight">{settings.pageTitle}</h1></div></section>
    <div className="py-4 text-xs sm:text-sm text-neutral-500"><Link href="/" className="hover:text-black">Home</Link> <span className="mx-1">/</span> <span className="text-neutral-900 font-medium">Shipping Policy</span></div>
    <section className="max-w-3xl mx-auto pb-16 animate-fade-up">
      {loading ? <div className="py-20 text-center"><RefreshCw className="w-5 h-5 animate-spin mx-auto text-neutral-400" /></div> : error ? <div className="bg-white border rounded-xl p-10 text-center"><p className="text-sm text-red-600">{error}</p><button onClick={load} className="mt-4 bg-black text-white px-4 py-2 rounded text-xs">TRY AGAIN</button></div> : <div className="bg-white border border-neutral-200 rounded-md p-6 sm:p-10 space-y-9 shadow-sm">
        {settings.intro && <p className="text-sm text-neutral-600 leading-relaxed border-b pb-6">{settings.intro}</p>}
        {sections.length === 0 ? <p className="text-sm text-neutral-500 text-center py-8">Shipping policy information is being updated. Please contact support for assistance.</p> : sections.map(section => { const Icon = iconMap[section.icon] || Truck; return <div key={section.id} className="flex gap-4 items-start"><div className="bg-neutral-100 p-2.5 rounded-full flex-none mt-1"><Icon className="w-5 h-5 text-neutral-800" /></div><div><h2 className="font-display text-lg font-bold mb-2 text-neutral-900 tracking-wide">{section.title}</h2><p className="text-neutral-700 text-sm leading-relaxed font-light whitespace-pre-line">{section.description}</p></div></div>; })}
      </div>}
    </section>
  </div>;
}
