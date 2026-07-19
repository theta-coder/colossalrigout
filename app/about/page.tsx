'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Leaf, Users, ShieldCheck, Heart } from 'lucide-react';

export default function AboutUs() {
  const team = [
    { name: 'Amna Sheikh', role: 'Founder & Creative Director', img: 'https://images.unsplash.com/photo-1552058544-f2b08422138a?auto=format&fit=crop&w=400&q=80' },
    { name: 'Danish Ali', role: 'Head of Product', img: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=400&q=80' },
    { name: 'Hira Malik', role: 'Design Lead', img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80' },
    { name: 'Osman Tariq', role: 'Operations Manager', img: 'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?auto=format&fit=crop&w=400&q=80' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 pb-16">
      {/* HERO BANNER */}
      <section className="relative h-[340px] sm:h-[440px] md:h-[520px] overflow-hidden -mx-4">
        <Image
          src="https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?auto=format&fit=crop&w=1920&q=80"
          alt="Colossal Rigout studio background"
          fill
          priority
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
        <div className="relative z-10 max-w-7xl mx-auto h-full flex flex-col justify-end px-4 pb-10 sm:pb-14">
          <p className="text-neutral-200 text-xs sm:text-sm tracking-widest mb-2 font-semibold">ABOUT US</p>
          <h1 className="font-display text-white text-4xl sm:text-6xl font-extrabold tracking-tight drop-shadow">
            OUR STORY
          </h1>
        </div>
      </section>

      {/* BREADCRUMB */}
      <div className="py-4 text-xs sm:text-sm text-neutral-500">
        <Link href="/" className="hover:text-black">Home</Link> <span className="mx-1">/</span>{' '}
        <span className="text-neutral-900 font-medium">About Us</span>
      </div>

      {/* BRAND STORY */}
      <section className="max-w-3xl mx-auto py-8 sm:py-12 animate-fade-up text-neutral-700 space-y-5 text-sm sm:text-base leading-relaxed font-light">
        <p>
          Colossal Rigout started with a simple idea: everyday clothing shouldn&apos;t feel like a compromise between comfort and confidence. What began as a small collection of wardrobe staples has grown into a full range of pieces designed for people who want to look put-together without overthinking it.
        </p>
        <p>
          We work closely with our production partners to keep quality high and turnaround honest, from the first sketch to the final stitch. Every piece is tested for fit, fabric feel, and durability before it ever reaches the shop page.
        </p>
        <p>
          Today, Colossal Rigout serves customers who value style that lasts &mdash; not just for a season, but for years of everyday wear. This is only the beginning of the story, and we&apos;re glad you&apos;re part of it.
        </p>
      </section>

      {/* VALUES STRIP */}
      <section className="bg-black text-white -mx-4 mb-12">
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-neutral-800 text-center py-8">
          <div className="px-6 py-3 flex flex-col items-center">
            <Leaf className="w-5 h-5 text-neutral-400 mb-1" />
            <p className="font-semibold text-xs sm:text-sm tracking-wider">SUSTAINABLE MATERIALS</p>
            <p className="text-neutral-400 text-xs mt-1 font-light">Better for you. Better for the planet.</p>
          </div>
          <div className="px-6 py-3 flex flex-col items-center">
            <ShieldCheck className="w-5 h-5 text-neutral-400 mb-1" />
            <p className="font-semibold text-xs sm:text-sm tracking-wider">ETHICAL PRODUCTION</p>
            <p className="text-neutral-400 text-xs mt-1 font-light">Made with care and respect.</p>
          </div>
          <div className="px-6 py-3 flex flex-col items-center">
            <Users className="w-5 h-5 text-neutral-400 mb-1" />
            <p className="font-semibold text-xs sm:text-sm tracking-wider">COMMUNITY FOCUSED</p>
            <p className="text-neutral-400 text-xs mt-1 font-light">Fashion that gives back.</p>
          </div>
        </div>
      </section>

      {/* BEHIND THE BRAND */}
      <section className="max-w-7xl mx-auto py-10 w-full animate-fade-up">
        <div className="text-center mb-8">
          <h2 className="font-display text-xl sm:text-2xl font-bold tracking-wide text-neutral-900">
            BEHIND THE BRAND
          </h2>
          <p className="text-neutral-500 text-xs sm:text-sm mt-1">The people who bring Colossal Rigout to life.</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          {team.map((member, idx) => (
            <div key={idx} className="team-card text-center group cursor-pointer">
              <div className="overflow-hidden rounded-md aspect-square bg-neutral-200 relative w-full shadow-sm">
                <Image
                  src={member.img}
                  alt={member.name}
                  fill
                  sizes="(max-width: 768px) 50vw, 25vw"
                  className="object-cover transition duration-500 group-hover:scale-105"
                />
              </div>
              <p className="text-sm font-semibold mt-3 text-neutral-900 group-hover:underline">{member.name}</p>
              <p className="text-xs text-neutral-500 font-light">{member.role}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
