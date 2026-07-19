'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { Menu, X, Search, Heart, ShoppingBag, MapPin, HelpCircle, User } from 'lucide-react';

export default function Header() {
  const { cart, wishlist } = useCart();
  const { currentUser } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const [searchValue, setSearchValue] = useState('');

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (searchValue.trim()) {
      router.push(`/shop?q=${encodeURIComponent(searchValue.trim())}`);
    }
  };

  const totalQty = cart.reduce((acc, item) => acc + item.qty, 0);

  const navLinks = [
    { label: 'NEW IN', href: '/shop?cat=new-arrival' },
    { label: 'MEN', href: '/shop?cat=men' },
    { label: 'KIDS', href: '/shop?cat=kids' },
    { label: 'SALE', href: '/shop?cat=sale', isSale: true },
    { label: 'ADMIN', href: '/admin', isAdminLink: true },
  ];

  return (
    <>
      {/* TOP ANNOUNCEMENT BAR */}
      <div className="bg-black text-white text-[11px] sm:text-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 py-2">
          <span className="hidden sm:block"></span>
          <p className="mx-auto tracking-wide font-normal">
            FREE SHIPPING ON ORDERS OVER $75 &nbsp;|&nbsp; EASY RETURNS
          </p>
          <div className="hidden sm:flex items-center gap-4 whitespace-nowrap text-neutral-300">
            <span className="hover:text-white cursor-pointer flex items-center gap-1">
              <MapPin className="w-3 h-3" /> Store Locator
            </span>
            <Link href="/faq" className="hover:text-white flex items-center gap-1">
              <HelpCircle className="w-3 h-3" /> Help
            </Link>
          </div>
        </div>
      </div>

      {/* STICKY MAIN HEADER */}
      <header className="border-b border-white/50 sticky top-0 bg-white/82 backdrop-blur-md shadow-[0_1px_12px_rgba(0,0,0,0.04)] z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 py-3 md:py-4">
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Hamburger button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden -ml-1 p-1 hover:bg-neutral-200/50 rounded-md transition"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            <Link
              href="/"
              aria-label="Colossal Rigout home"
              className="group flex items-center gap-2 sm:gap-3"
            >
              <span className="relative block h-10 w-10 sm:h-12 sm:w-12 shrink-0 overflow-hidden rounded-lg bg-black shadow-sm ring-1 ring-black/10 transition-transform group-hover:scale-105">
                <Image
                  src="/colossal-rigout-logo.png"
                  alt=""
                  fill
                  priority
                  sizes="(max-width: 640px) 40px, 48px"
                  className="object-cover scale-[1.75]"
                />
              </span>
              <span className="font-display text-lg sm:text-2xl font-bold tracking-tight whitespace-nowrap">
                Colossal<span className="text-neutral-400">Rigout</span>
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-8 text-sm font-medium tracking-wide">
            {navLinks.map((link, idx) => (
              <Link
                key={idx}
                href={link.href}
                className={`transition ${
                  link.isSale
                    ? 'text-red-600 hover:text-red-700 font-semibold'
                    : 'text-neutral-900 hover:text-neutral-500'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Header Action Icons */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Search Input Box */}
            <form onSubmit={handleSearchSubmit} className="hidden md:flex items-center border border-neutral-300 rounded-full px-3 py-1.5 w-40 lg:w-56 bg-neutral-100/50">
              <input
                type="text"
                placeholder="Search items..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="outline-none text-xs w-full bg-transparent text-neutral-800"
              />
              <button type="submit" aria-label="Search" className="focus:outline-none cursor-pointer">
                <Search className="w-4 h-4 text-neutral-500 flex-none hover:text-black transition" />
              </button>
            </form>

            {/* Mobile / General Search Icon */}
            <button className="md:hidden p-1 hover:bg-neutral-200/50 rounded-full transition">
              <Search className="w-5 h-5 text-neutral-900" />
            </button>

            {/* Wishlist Icon */}
            <Link
              href="/wishlist"
              className="relative p-1 hover:bg-neutral-200/50 rounded-full transition"
            >
              <Heart
                className={`w-5 h-5 ${
                  wishlist.length > 0 ? 'fill-red-500 text-red-500' : 'text-neutral-900'
                }`}
              />
              {wishlist.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-black text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                  {wishlist.length}
                </span>
              )}
            </Link>

            {/* User Account / Order History Icon */}
            <Link
              href="/order-history"
              className="relative p-1 hover:bg-neutral-200/50 rounded-full transition flex items-center gap-1"
              title={currentUser ? `Logged in as ${currentUser.name}` : 'Order History & Login'}
            >
              <User className={`w-5 h-5 ${currentUser ? 'text-neutral-900 fill-neutral-900/10' : 'text-neutral-900'}`} />
              {currentUser && (
                <span className="absolute top-0 right-0 w-2 h-2 bg-emerald-500 rounded-full ring-2 ring-[#f4f4f3]"></span>
              )}
            </Link>

            {/* Shopping Bag Icon */}
            <Link
              href="/cart"
              className="relative p-1 hover:bg-neutral-200/50 rounded-full transition"
            >
              <ShoppingBag className="w-5 h-5 text-neutral-900" />
              {totalQty > 0 && (
                <span className="absolute -top-1 -right-1 bg-black text-white text-[9px] rounded-full w-4.5 h-4.5 flex items-center justify-center font-bold">
                  {totalQty}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-neutral-200 bg-[#f4f4f3] px-4 py-4 absolute w-full left-0 shadow-lg animate-fade-in">
            <form onSubmit={(e) => {
              handleSearchSubmit(e);
              setMobileMenuOpen(false);
            }} className="flex items-center border border-neutral-300 rounded-full px-3 py-2 mb-4">
              <input
                type="text"
                placeholder="Search for items, brands..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="outline-none text-sm w-full bg-transparent"
              />
              <button type="submit" aria-label="Search" className="focus:outline-none cursor-pointer">
                <Search className="w-4 h-4 text-neutral-500 flex-none hover:text-black transition" />
              </button>
            </form>
            <nav className="flex flex-col gap-4 text-sm font-medium tracking-wide">
              {navLinks.map((link, idx) => (
                <Link
                  key={idx}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`py-1 border-b border-neutral-200/50 ${
                    link.isSale ? 'text-red-600 font-semibold' : 'text-neutral-800'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href="/faq"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1 border-b border-neutral-200/50 text-neutral-600 text-xs"
              >
                Help & FAQs
              </Link>
              <Link
                href="/track-order"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1 border-b border-neutral-200/50 text-neutral-600 text-xs"
              >
                Track My Order
              </Link>
              <Link
                href="/order-history"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1 border-b border-neutral-200/50 text-neutral-900 font-semibold text-xs flex items-center gap-1.5"
              >
                <User className="w-3.5 h-3.5" /> {currentUser ? `Order History (${currentUser.name})` : 'Order History / Login'}
              </Link>
            </nav>
          </div>
        )}
      </header>
    </>
  );
}
