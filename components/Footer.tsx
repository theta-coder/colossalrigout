'use client';

import React from 'react';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-black text-white mt-0">
      {/* 3 Pillars strip */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-neutral-800 text-center py-8">
        <div className="px-6 py-3">
          <p className="font-semibold text-sm tracking-wider">SUSTAINABLE MATERIALS</p>
          <p className="text-neutral-400 text-xs mt-1">Better for you. Better for the planet.</p>
        </div>
        <div className="px-6 py-3">
          <p className="font-semibold text-sm tracking-wider">ETHICAL PRODUCTION</p>
          <p className="text-neutral-400 text-xs mt-1">Made with care and respect.</p>
        </div>
        <div className="px-6 py-3">
          <p className="font-semibold text-sm tracking-wider">COMMUNITY FOCUSED</p>
          <p className="text-neutral-400 text-xs mt-1">Fashion that gives back.</p>
        </div>
      </div>

      {/* Main footer link groups */}
      <div className="border-t border-neutral-800">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 px-4 py-10 text-sm">
          <div>
            <p className="font-display text-lg font-bold mb-4">
              Colossal<span className="text-neutral-400">Rigout</span>
            </p>
            <p className="text-neutral-400 text-xs leading-relaxed">
              Trendy pieces, timeless style. Wear your confidence with Colossal Rigout.
            </p>
            <div className="flex gap-3 mt-5">
              <a
                href="#"
                className="w-8 h-8 rounded-full border border-neutral-700 flex items-center justify-center hover:bg-neutral-800 transition"
              >
                <span className="text-xs">IG</span>
              </a>
              <a
                href="#"
                className="w-8 h-8 rounded-full border border-neutral-700 flex items-center justify-center hover:bg-neutral-800 transition"
              >
                <span className="text-xs">FB</span>
              </a>
              <a
                href="#"
                className="w-8 h-8 rounded-full border border-neutral-700 flex items-center justify-center hover:bg-neutral-800 transition"
              >
                <span className="text-xs">YT</span>
              </a>
            </div>
          </div>
          <div>
            <p className="font-semibold mb-4 tracking-wider">SHOP</p>
            <ul className="space-y-2 text-neutral-400 text-xs">
              <li>
                <Link href="/shop" className="hover:text-white transition">Men</Link>
              </li>
              <li>
                <Link href="/shop?cat=kids" className="hover:text-white transition">Kids</Link>
              </li>
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
          <p>&copy; {new Date().getFullYear()} Colossal Rigout. All rights reserved. &middot; colossalrigout.pk</p>
          <div className="flex gap-2 text-neutral-400 font-medium">
            <span className="border border-neutral-700 rounded px-2 py-1 bg-neutral-900 text-[10px]">Cash on Delivery</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
