'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AudienceGroup } from '../lib/audience-group';
import { FooterSettings, DEFAULT_FOOTER_SETTINGS, isValidUrlOrPath } from '../lib/storefront-settings';

interface FooterProps {
  settings?: FooterSettings;
}

function SocialMediaIcon({ platform, label }: { platform: string; label: string }) {
  const commonProps = {
    viewBox: '0 0 24 24',
    className: 'h-4 w-4 fill-current',
    'aria-hidden': true,
  };

  if (platform === 'instagram') {
    return (
      <svg {...commonProps}>
        <path d="M7.75 2h8.5A5.76 5.76 0 0 1 22 7.75v8.5A5.76 5.76 0 0 1 16.25 22h-8.5A5.76 5.76 0 0 1 2 16.25v-8.5A5.76 5.76 0 0 1 7.75 2Zm0 2A3.75 3.75 0 0 0 4 7.75v8.5A3.75 3.75 0 0 0 7.75 20h8.5A3.75 3.75 0 0 0 20 16.25v-8.5A3.75 3.75 0 0 0 16.25 4h-8.5ZM17.5 5.5a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" />
      </svg>
    );
  }

  if (platform === 'facebook') {
    return (
      <svg {...commonProps}>
        <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06C2 17.08 5.66 21.24 10.44 22v-7.03H7.9v-2.91h2.54V9.85c0-2.52 1.49-3.91 3.77-3.91 1.09 0 2.23.2 2.23.2V8.6h-1.25c-1.24 0-1.63.77-1.63 1.56v1.9h2.77l-.44 2.91h-2.33V22C18.34 21.24 22 17.08 22 12.06Z" />
      </svg>
    );
  }

  if (platform === 'youtube') {
    return (
      <svg {...commonProps}>
        <path d="M23.5 6.19a3 3 0 0 0-2.11-2.12C19.53 3.57 12 3.57 12 3.57s-7.53 0-9.39.5A3 3 0 0 0 .5 6.19 31.21 31.21 0 0 0 0 12a31.21 31.21 0 0 0 .5 5.81 3 3 0 0 0 2.11 2.12c1.86.5 9.39.5 9.39.5s7.53 0 9.39-.5a3 3 0 0 0 2.11-2.12A31.21 31.21 0 0 0 24 12a31.21 31.21 0 0 0-.5-5.81ZM9.6 15.57V8.43L15.86 12 9.6 15.57Z" />
      </svg>
    );
  }

  if (platform === 'tiktok') {
    return (
      <svg {...commonProps}>
        <path d="M16.6 2c.25 2.16 1.45 3.45 3.4 3.58v3.06a8.55 8.55 0 0 1-3.37-.78v6.22a6.1 6.1 0 1 1-5.26-6.04v3.1a3.04 3.04 0 1 0 2.14 2.94V2h3.09Z" />
      </svg>
    );
  }

  if (platform === 'x') {
    return (
      <svg {...commonProps}>
        <path d="M18.9 2H22l-6.77 7.74L23.2 22h-6.24l-4.89-6.39L6.48 22H3.36l7.26-8.3L2.97 2h6.4l4.42 5.84L18.9 2Zm-1.1 17.84h1.72L8.43 4.05H6.58L17.8 19.84Z" />
      </svg>
    );
  }

  return <span className="text-[10px] font-semibold">{label}</span>;
}

export default function Footer({ settings = DEFAULT_FOOTER_SETTINGS }: FooterProps) {
  const pathname = usePathname();
  const [shopGroups, setShopGroups] = useState<AudienceGroup[]>([]);

  useEffect(() => {
    fetch('/api/audience-groups')
      .then((response) => response.json())
      .then((payload) => {
        if (payload.success && Array.isArray(payload.data)) setShopGroups(payload.data);
      })
      .catch(() => setShopGroups([]));
  }, []);

  if (pathname === '/login' || pathname === '/signup' || pathname?.startsWith('/admin')) {
    return null;
  }

  const enabledPillars = [...(settings?.pillars || DEFAULT_FOOTER_SETTINGS.pillars)]
    .filter((p) => p.enabled)
    .sort((a, b) => a.order - b.order);

  const activeSocials = [...(settings?.socialLinks || DEFAULT_FOOTER_SETTINGS.socialLinks)]
    .filter((s) => s.enabled && s.url && s.url.trim() !== '' && isValidUrlOrPath(s.url))
    .sort((a, b) => a.order - b.order);

  const brandName = settings?.brandName || DEFAULT_FOOTER_SETTINGS.brandName;
  const brandAccentText = settings?.brandAccentText || DEFAULT_FOOTER_SETTINGS.brandAccentText;
  const brandDescription = settings?.brandDescription || DEFAULT_FOOTER_SETTINGS.brandDescription;
  const websiteLabel = settings?.websiteLabel || DEFAULT_FOOTER_SETTINGS.websiteLabel;

  return (
    <footer className="bg-black text-white mt-0" suppressHydrationWarning>
      {/* Pillars strip */}
      {enabledPillars.length > 0 && (
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-neutral-800 text-center py-8">
          {enabledPillars.map((pillar) => (
            <div key={pillar.id} className="px-6 py-3">
              <p className="font-semibold text-sm tracking-wider uppercase">{pillar.title}</p>
              <p className="text-neutral-400 text-xs mt-1 font-light">{pillar.description}</p>
            </div>
          ))}
        </div>
      )}

      {/* Main footer link groups */}
      <div className="border-t border-neutral-800">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 px-4 py-10 text-sm">
          <div>
            <p className="font-display text-lg font-bold mb-4">
              {brandName}<span className="text-neutral-400">{brandAccentText}</span>
            </p>
            <p className="text-neutral-400 text-xs leading-relaxed">
              {brandDescription}
            </p>
            {activeSocials.length > 0 && (
              <div className="flex flex-wrap gap-3 mt-5">
                {activeSocials.map((social) => {
                  const isExternal = social.url.startsWith('http://') || social.url.startsWith('https://');
                  return (
                    <a
                      key={social.id}
                      href={social.url}
                      target={isExternal ? '_blank' : undefined}
                      rel={isExternal ? 'noopener noreferrer' : undefined}
                      className="w-8 h-8 rounded-full border border-neutral-700 flex items-center justify-center text-neutral-300 hover:bg-white hover:text-black hover:border-white transition"
                      title={social.label}
                      aria-label={social.platform === 'custom' ? social.label : `Visit us on ${social.platform}`}
                    >
                      <SocialMediaIcon platform={social.platform} label={social.label} />
                    </a>
                  );
                })}
              </div>
            )}
          </div>
          <div>
            <p className="font-semibold mb-4 tracking-wider">SHOP</p>
            <ul className="space-y-2 text-neutral-400 text-xs">
              {shopGroups.map((group) => (
                <li key={group.id}>
                  <Link
                    href={`/shop?group=${encodeURIComponent(group.slug)}`}
                    className="hover:text-white transition"
                  >
                    {group.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-4 tracking-wider">HELP</p>
            <ul className="space-y-2 text-neutral-400 text-xs">
              <li>
                <Link href="/faq" className="hover:text-white transition">FAQ</Link>
              </li>
              <li>
                <Link href="/track-order" className="hover:text-white transition">Track Order</Link>
              </li>
              <li>
                <Link href="/shipping-policy" className="hover:text-white transition">Shipping Policy</Link>
              </li>
              <li>
                <Link href="/returns" className="hover:text-white transition">Returns &amp; Exchanges</Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-4 tracking-wider">COMPANY</p>
            <ul className="space-y-2 text-neutral-400 text-xs">
              <li>
                <Link href="/about" className="hover:text-white transition">About Us</Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-white transition">Contact</Link>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Payment methods & copyrights */}
      <div className="border-t border-neutral-800 py-6 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-neutral-500">
          <p>&copy; {new Date().getFullYear()} Colossal Rigout. All rights reserved. &middot; {websiteLabel}</p>
          <div className="flex gap-2 text-neutral-400 font-medium">
            <span className="border border-neutral-700 rounded px-2 py-1 bg-neutral-900 text-[10px]">Cash on Delivery</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
