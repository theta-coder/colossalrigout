'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { Menu, X, Search, Heart, ShoppingBag, HelpCircle, User } from 'lucide-react';

import { AnnouncementSettings, DEFAULT_ANNOUNCEMENT_SETTINGS } from '../lib/storefront-settings';

interface HeaderProps {
  announcement?: AnnouncementSettings;
}

export default function Header({ announcement = DEFAULT_ANNOUNCEMENT_SETTINGS }: HeaderProps) {
  const { cart, wishlist } = useCart();
  const { currentUser } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const [searchValue, setSearchValue] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  const activeUser = mounted ? currentUser : null;

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (searchValue.trim()) {
      router.push(`/shop?q=${encodeURIComponent(searchValue.trim())}`);
    }
  };

  const totalQty = cart.reduce((acc, item) => acc + item.qty, 0);

  const navLinks = [
    { label: 'MEN', href: '/shop?cat=men', key: 'men' },
    { label: 'NEW ARRIVALS', href: '/shop?cat=new-arrivals', key: 'new-arrivals' },
    { label: 'BEST SELLERS', href: '/shop?cat=best-sellers', key: 'best-sellers' },
  ];

  if (pathname === '/login' || pathname === '/signup' || pathname?.startsWith('/admin')) {
    return null;
  }

  return (
    <>
      {/* TOP ANNOUNCEMENT BAR */}
      {announcement?.enabled !== false && (
        <div className="bg-black text-white text-[11px] sm:text-xs">
          <div className="max-w-7xl mx-auto flex items-center justify-between px-4 py-2">
            <span className="hidden sm:block"></span>
            <p className="mx-auto tracking-wide font-normal truncate px-2">
              {announcement.linkHref ? (
                <Link
                  href={announcement.linkHref}
                  target={announcement.openInNewTab ? '_blank' : undefined}
                  rel={announcement.openInNewTab ? 'noopener noreferrer' : undefined}
                  className="hover:underline flex items-center justify-center gap-1.5 inline-flex"
                >
                  <span>{announcement.message}</span>
                  {announcement.secondaryMessage && (
                    <span>
                      &nbsp;{announcement.separator || '|'}&nbsp;{announcement.secondaryMessage}
                    </span>
                  )}
                  {announcement.linkLabel && (
                    <span className="font-semibold underline underline-offset-2 ml-1">
                      {announcement.linkLabel}
                    </span>
                  )}
                </Link>
              ) : (
                <>
                  <span>{announcement.message}</span>
                  {announcement.secondaryMessage && (
                    <span>
                      &nbsp;{announcement.separator || '|'}&nbsp;{announcement.secondaryMessage}
                    </span>
                  )}
                </>
              )}
            </p>
            <div className="hidden sm:flex items-center gap-4 whitespace-nowrap text-neutral-300">
              <Link href="/faq" className="hover:text-white flex items-center gap-1">
                <HelpCircle className="w-3 h-3" /> Help
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* STICKY MAIN HEADER */}
      <header
        className="border-b border-neutral-800 sticky top-0 bg-black/95 backdrop-blur-md shadow-[0_1px_12px_rgba(0,0,0,0.4)] z-40"
        suppressHydrationWarning
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Hamburger button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden -ml-1 p-1 hover:bg-neutral-800/80 rounded-md transition text-white"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6 text-white" /> : <Menu className="w-6 h-6 text-white" />}
            </button>
            <Link
              href="/"
              aria-label="Colossal Rigout home"
              className="group flex items-center"
            >
              <span className="relative block h-14 w-28 sm:h-16 sm:w-32 shrink-0 transition-transform duration-200 group-hover:scale-[1.02]">
                <Image
                  src="/colossal-rigout-logo.png"
                  alt="Colossal Rigout"
                  fill
                  priority
                  sizes="(max-width: 640px) 112px, 128px"
                  className="object-contain object-left filter brightness-110"
                />
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-8 text-sm font-semibold tracking-wide">
            {navLinks.map((link, idx) => (
              <Link
                key={idx}
                href={link.href}
                className="text-white hover:text-neutral-300 transition"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Header Action Icons */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Search Input Box */}
            <form onSubmit={handleSearchSubmit} className="hidden md:flex items-center border border-neutral-700 rounded-full px-3 py-1.5 w-40 lg:w-56 bg-neutral-900/90">
              <input
                type="text"
                placeholder="Search items..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="outline-none text-xs w-full bg-transparent text-white placeholder-neutral-400"
              />
              <button type="submit" aria-label="Search" className="focus:outline-none cursor-pointer">
                <Search className="w-4 h-4 text-neutral-400 flex-none hover:text-white transition" />
              </button>
            </form>

            {/* Mobile / General Search Icon */}
            <button className="md:hidden p-1 hover:bg-neutral-800/80 rounded-full transition">
              <Search className="w-5 h-5 text-white" />
            </button>

            {/* Wishlist Icon */}
            {(() => {
              const uniqueWishlistCount = mounted ? new Set(wishlist.map((id) => String(id))).size : 0;
              return (
                <Link
                  href="/wishlist"
                  className="relative p-1 hover:bg-neutral-800/80 rounded-full transition"
                  title="View Wishlist"
                >
                  <Heart
                    className={`w-5 h-5 ${
                      uniqueWishlistCount > 0 ? 'fill-red-500 text-red-500' : 'text-white'
                    }`}
                  />
                  {uniqueWishlistCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-white text-black text-[9px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                      {uniqueWishlistCount}
                    </span>
                  )}
                </Link>
              );
            })()}

            {/* User Account / Order History Icon */}
            <Link
              href="/order-history"
              className="relative p-1 hover:bg-neutral-800/80 rounded-full transition flex items-center gap-1"
              title={activeUser ? `Logged in as ${activeUser.name}` : 'Order History & Login'}
              suppressHydrationWarning
            >
              <User className={`w-5 h-5 ${activeUser ? 'text-white fill-white/20' : 'text-white'}`} />
              {activeUser && (
                <span className="absolute top-0 right-0 w-2 h-2 bg-emerald-400 rounded-full ring-2 ring-black"></span>
              )}
            </Link>

            {/* Shopping Bag Icon */}
            <Link
              href="/cart"
              className="relative p-1 hover:bg-neutral-800/80 rounded-full transition"
            >
              <ShoppingBag className="w-5 h-5 text-white" />
              {totalQty > 0 && (
                <span className="absolute -top-1 -right-1 bg-white text-black text-[9px] rounded-full w-4.5 h-4.5 flex items-center justify-center font-bold">
                  {totalQty}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-neutral-800 bg-neutral-950 px-4 py-4 absolute w-full left-0 shadow-xl animate-fade-in text-white">
            <form onSubmit={(e) => {
              handleSearchSubmit(e);
              setMobileMenuOpen(false);
            }} className="flex items-center border border-neutral-700 bg-neutral-900 rounded-full px-3 py-2 mb-4">
              <input
                type="text"
                placeholder="Search for items, brands..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="outline-none text-sm w-full bg-transparent text-white placeholder-neutral-400"
              />
              <button type="submit" aria-label="Search" className="focus:outline-none cursor-pointer">
                <Search className="w-4 h-4 text-neutral-400 flex-none hover:text-white transition" />
              </button>
            </form>
            <nav className="flex flex-col gap-4 text-sm font-medium tracking-wide">
              {navLinks.map((link, idx) => (
                <Link
                  key={idx}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-1 border-b border-neutral-800/80 text-white font-medium"
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href="/faq"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1 border-b border-neutral-800/80 text-neutral-400 text-xs hover:text-white"
              >
                Help & FAQs
              </Link>
              <Link
                href="/track-order"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1 border-b border-neutral-800/80 text-neutral-400 text-xs hover:text-white"
              >
                Track My Order
              </Link>
              <Link
                href="/order-history"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1 border-b border-neutral-800/80 text-white font-semibold text-xs flex items-center gap-1.5"
                suppressHydrationWarning
              >
                <User className="w-3.5 h-3.5" /> {activeUser ? `Order History (${activeUser.name})` : 'Order History / Login'}
              </Link>
            </nav>
          </div>
        )}
      </header>
    </>
  );
}
