'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Globe2, Heart, Leaf, ShieldCheck, Sparkles, Users } from 'lucide-react';
import { AboutPagePayload, defaultSettings } from '../../lib/about-page';

const fallbackHero = 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?auto=format&fit=crop&w=1920&q=80';

const valueIcons = {
  leaf: Leaf,
  shield: ShieldCheck,
  users: Users,
  heart: Heart,
  sparkles: Sparkles,
  globe: Globe2,
} as const;

export default function AboutClient() {
  const [data, setData] = useState<AboutPagePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/about-page', { cache: 'no-store' });
      const body = await response.json();
      if (!response.ok || !body.success || !body.data) throw new Error(body.message || 'Unable to load About Us content.');
      setData(body.data as AboutPagePayload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load About Us content.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  if (loading) {
    return <div className="min-h-[55vh] flex items-center justify-center"><div className="text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto mb-3"/><p className="text-sm text-neutral-500">Loading About Us...</p></div></div>;
  }

  if (error || !data) {
    return <div className="min-h-[55vh] flex items-center justify-center px-4"><div className="text-center"><p className="font-semibold text-red-700">{error || 'About Us content is unavailable.'}</p><button onClick={() => void load()} className="mt-4 bg-black text-white px-6 py-2.5 rounded-md text-sm">TRY AGAIN</button></div></div>;
  }

  const settings = { ...defaultSettings, ...data.settings };
  if (!settings.pageActive) {
    return <div className="min-h-[55vh] flex items-center justify-center px-4 text-center"><div><h1 className="font-display text-2xl font-bold">ABOUT US</h1><p className="text-sm text-neutral-500 mt-2">This page is currently unavailable.</p><Link href="/" className="inline-block mt-5 bg-black text-white px-6 py-2.5 rounded-md text-sm">BACK HOME</Link></div></div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 pb-16">
      <section className="relative h-[340px] sm:h-[440px] md:h-[520px] overflow-hidden -mx-4">
        <Image src={settings.heroImage || fallbackHero} alt={settings.heroImageAlt || 'About Colossal Rigout'} fill priority sizes="100vw" className="object-cover object-center" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="relative z-10 max-w-7xl mx-auto h-full flex flex-col justify-end px-4 pb-10 sm:pb-14">
          <p className="text-neutral-200 text-xs sm:text-sm tracking-widest mb-2 font-semibold">{settings.heroEyebrow}</p>
          <h1 className="font-display text-white text-4xl sm:text-6xl font-extrabold tracking-tight drop-shadow">{settings.heroTitle}</h1>
        </div>
      </section>

      <div className="py-4 text-xs sm:text-sm text-neutral-500">
        <Link href="/" className="hover:text-black">Home</Link><span className="mx-1">/</span><span className="text-neutral-900 font-medium">{settings.breadcrumbLabel}</span>
      </div>

      {data.storyBlocks.length > 0 && (
        <section className="max-w-3xl mx-auto py-8 sm:py-12 animate-fade-up text-neutral-700 space-y-5 text-sm sm:text-base leading-relaxed font-light">
          {data.storyBlocks.map((block) => <p key={block.id}>{block.text}</p>)}
        </section>
      )}

      {settings.valuesSectionActive && data.values.length > 0 && (
        <section className="bg-black text-white -mx-4 mb-12">
          <div className={`max-w-7xl mx-auto grid grid-cols-1 ${data.values.length === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-3'} divide-y sm:divide-y-0 sm:divide-x divide-neutral-800 text-center py-8`}>
            {data.values.map((value) => {
              const Icon = valueIcons[value.icon as keyof typeof valueIcons] || Sparkles;
              return <div key={value.id} className="px-6 py-3 flex flex-col items-center"><Icon aria-hidden="true" className="w-5 h-5 text-neutral-400 mb-1"/><p className="font-semibold text-xs sm:text-sm tracking-wider">{value.title}</p><p className="text-neutral-400 text-xs mt-1 font-light">{value.description}</p></div>;
            })}
          </div>
        </section>
      )}

      {settings.teamSectionActive && data.teamMembers.length > 0 && (
        <section className="max-w-7xl mx-auto py-10 w-full animate-fade-up">
          <div className="text-center mb-8"><h2 className="font-display text-xl sm:text-2xl font-bold tracking-wide text-neutral-900">{settings.teamHeading}</h2><p className="text-neutral-500 text-xs sm:text-sm mt-1">{settings.teamDescription}</p></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {data.teamMembers.map((member) => (
              <article key={member.id} className="text-center group">
                <div className="overflow-hidden rounded-md aspect-square bg-neutral-200 relative w-full shadow-sm">
                  {member.image ? <Image src={member.image} alt={member.imageAlt || member.name} fill sizes="(max-width: 768px) 50vw, 25vw" className="object-cover transition duration-500 group-hover:scale-105"/> : <div className="h-full flex items-center justify-center text-neutral-400"><Users className="w-10 h-10"/></div>}
                </div>
                <h3 className="text-sm font-semibold mt-3 text-neutral-900">{member.name}</h3><p className="text-xs text-neutral-500 font-light">{member.role}</p>{member.bio && <p className="text-xs text-neutral-500 mt-2 line-clamp-3">{member.bio}</p>}
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
