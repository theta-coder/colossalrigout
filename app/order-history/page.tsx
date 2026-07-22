'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '../../context/AuthContext';
import { auth } from '../../lib/firebase';
import {
  Package,
  MapPin,
  Clock,
  CheckCircle,
  ChevronRight,
  User as UserIcon,
  ShoppingBag,
  ArrowRight,
  Search,
  Lock,
  LogOut,
  Calendar,
  CreditCard,
  Truck,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  PlusCircle,
  AlertCircle
} from 'lucide-react';
import { CustomerSafeTrackedOrder, STATUS_DISPLAY_MAP } from '../../lib/order-tracking';
import OrderTrackingTimeline from '../../components/OrderTrackingTimeline';
import { formatPkr } from '../../lib/utils';

export default function OrderHistoryPage() {
  const { currentUser, logout, isLoaded } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [orders, setOrders] = useState<CustomerSafeTrackedOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [ordersError, setOrdersError] = useState<string | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusTab, setStatusTab] = useState<'all' | 'active' | 'delivered'>('all');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  // Claim guest orders state
  const [claiming, setClaiming] = useState(false);
  const [claimMsg, setClaimMsg] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [claimChallengeId, setClaimChallengeId] = useState('');
  const [claimCode, setClaimCode] = useState('');
  const [debugClaimCode, setDebugClaimCode] = useState('');

  // Fetch orders from API
  const fetchUserOrders = useCallback(async () => {
    if (!currentUser && !auth.currentUser) {
      setLoadingOrders(false);
      return;
    }
    setLoadingOrders(true);
    setOrdersError(null);
    try {
      const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
      const queryParams = new URLSearchParams();
      if (currentUser?.uid) queryParams.set('userId', currentUser.uid);
      if (currentUser?.email) queryParams.set('email', currentUser.email);

      const res = await fetch(`/api/orders/history?${queryParams.toString()}`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      const data = await res.json();

      if (res.ok && data.success && Array.isArray(data.orders)) {
        setOrders(data.orders);
      } else {
        setOrdersError(data.message || 'Failed to load orders.');
      }
    } catch (err: any) {
      console.error('Error fetching order history:', err);
      setOrdersError('Failed to load orders.');
    } finally {
      setLoadingOrders(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (isLoaded) {
      fetchUserOrders();
    }
  }, [isLoaded, fetchUserOrders]);

  // Claim unclaimed guest orders matching verified email
  const handleRequestGuestOrderClaim = async () => {
    if (!auth.currentUser) return;
    setClaiming(true);
    setClaimMsg(null);
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch('/api/orders/claim/request', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (res.ok && data.success && data.challengeId) {
        setClaimChallengeId(data.challengeId);
        setDebugClaimCode(data.debugCode || '');
        setClaimMsg({ msg: data.message, type: 'success' });
      } else if (res.ok && data.success) {
        setClaimMsg({ msg: data.message, type: 'error' });
      } else {
        setClaimMsg({ msg: data.message || 'Claim failed.', type: 'error' });
      }
    } catch (err: any) {
      setClaimMsg({ msg: 'Failed to claim orders.', type: 'error' });
    } finally {
      setClaiming(false);
    }
  };

  const handleVerifyGuestOrderClaim = async () => {
    if (!auth.currentUser || !/^\d{6}$/.test(claimCode)) return;
    setClaiming(true); setClaimMsg(null);
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch('/api/orders/claim/verify', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ challengeId: claimChallengeId, code: claimCode }) });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Verification failed.');
      setClaimMsg({ msg: data.message, type: 'success' });
      setClaimChallengeId(''); setClaimCode(''); setDebugClaimCode('');
      await fetchUserOrders();
    } catch (error: any) { setClaimMsg({ msg: error.message || 'Verification failed.', type: 'error' }); }
    finally { setClaiming(false); }
  };

  // Filter list
  const filteredOrders = orders.filter((o) => {
    const isDelivered = o.currentStatus === 'delivered';
    if (statusTab === 'active' && isDelivered) return false;
    if (statusTab === 'delivered' && !isDelivered) return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchId = o.orderId.toLowerCase().includes(q) || o.publicTrackingId.toLowerCase().includes(q);
      const matchItem = o.items.some((i) => i.name.toLowerCase().includes(q));
      return matchId || matchItem;
    }
    return true;
  });

  if (!mounted || !isLoaded) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <span className="w-8 h-8 border-3 border-black/20 border-t-black rounded-full animate-spin inline-block"></span>
        <p className="text-xs text-neutral-400 mt-2">Loading your wardrobe details...</p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="max-w-md mx-auto py-20 px-4 text-center animate-fade-up">
        <div className="w-14 h-14 bg-neutral-900 text-white rounded-full flex items-center justify-center mx-auto mb-5 shadow">
          <UserIcon className="w-7 h-7" />
        </div>
        <h1 className="font-display text-2xl font-extrabold text-neutral-900 tracking-tight">ACCOUNT LOGIN REQUIRED</h1>
        <p className="text-neutral-500 text-xs mt-2 leading-relaxed">
          Please sign in to view your complete order history, active shipment timelines, and receipts.
        </p>

        <div className="mt-6 space-y-3">
          <Link
            href={`/login?redirect=${encodeURIComponent('/order-history')}`}
            className="w-full inline-block bg-black text-white text-xs font-bold py-3.5 rounded-lg hover:bg-neutral-800 transition uppercase tracking-wider shadow"
          >
            SIGN IN TO YOUR ACCOUNT
          </Link>
          <div className="pt-2">
            <Link
              href="/track-order"
              className="text-xs text-neutral-600 font-semibold underline hover:text-black transition"
            >
              Placed an order as a guest? Track Order Here →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 pb-20 pt-6">
      {/* HEADER HERO SECTION */}
      <section className="relative h-44 sm:h-52 md:h-60 overflow-hidden -mx-4 mb-8 rounded-b-xl shadow-sm">
        <Image
          src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1920&q=80"
          alt="Order History Cover"
          fill
          priority
          referrerPolicy="no-referrer"
          className="object-cover object-center filter brightness-90"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-black/30"></div>
        <div className="relative z-10 max-w-7xl mx-auto h-full flex flex-col justify-center px-6 sm:px-10">
          <h1 className="font-display text-white text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight">
            ORDER HISTORY
          </h1>
          <p className="text-neutral-200 text-xs sm:text-sm mt-2 font-light max-w-md">
            Track active shipments, view verified order receipts, and trace real-time delivery timelines.
          </p>
        </div>
      </section>

      {/* BREADCRUMB / AUTH STATUS BAR */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between mb-8 pb-4 border-b border-neutral-200">
        <div className="text-xs sm:text-sm text-neutral-500 flex items-center gap-1.5 font-medium">
          <Link href="/" className="hover:text-black transition">Home</Link>
          <span>/</span>
          <span className="text-neutral-900 font-semibold">Order History</span>
        </div>

        {currentUser && (
          <div className="flex items-center gap-3 bg-white border border-neutral-200 rounded-full px-4 py-1.5 shadow-sm text-xs">
            <span className="flex items-center gap-1.5 text-neutral-700 font-medium">
              <UserIcon className="w-3.5 h-3.5 text-neutral-500" />
              Logged in as <strong className="text-neutral-900 font-bold">{currentUser.name}</strong>
            </span>
            <span className="text-neutral-300">|</span>
            <button
              onClick={() => {
                logout();
                window.location.reload();
              }}
              className="text-red-500 hover:text-red-700 font-semibold inline-flex items-center gap-0.5"
            >
              <LogOut className="w-3 h-3" /> Logout
            </button>
          </div>
        )}
      </div>

      {/* IF NOT LOGGED IN */}
      {!currentUser ? (
        <div className="max-w-2xl mx-auto bg-white border border-neutral-200 rounded-xl p-6 sm:p-10 text-center shadow-sm">
          <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="w-8 h-8 text-neutral-400 stroke-[1.5]" />
          </div>
          <h3 className="font-display text-xl sm:text-2xl font-bold text-neutral-900">Sign In Required</h3>
          <p className="text-neutral-500 text-xs sm:text-sm max-w-md mx-auto mt-2 leading-relaxed font-light">
            Please log in or create an account to view your verified order history, trace delivery progress, and store purchase receipts.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/login?redirect=/order-history"
              className="bg-black text-white text-xs sm:text-sm font-bold px-8 py-3.5 rounded hover:bg-neutral-800 transition active:scale-95 shadow-sm flex items-center justify-center gap-1.5"
            >
              SIGN IN <ChevronRight className="w-4 h-4" />
            </Link>
            <Link
              href="/signup?redirect=/order-history"
              className="border border-neutral-300 hover:border-black text-neutral-700 hover:text-black text-xs sm:text-sm font-bold px-8 py-3.5 rounded transition bg-neutral-50"
            >
              CREATE AN ACCOUNT
            </Link>
          </div>
        </div>
      ) : (
        /* IF LOGGED IN */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* ORDERS LIST COLUMN (2/3 width) */}
          <div className="lg:col-span-2 space-y-6">
            {/* CONTROLS BAR */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex gap-2">
                <button
                  onClick={() => setStatusTab('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition uppercase ${
                    statusTab === 'all' ? 'bg-black text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  All ({orders.length})
                </button>
                <button
                  onClick={() => setStatusTab('active')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition uppercase ${
                    statusTab === 'active' ? 'bg-black text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  Active ({orders.filter((o) => o.currentStatus !== 'delivered').length})
                </button>
                <button
                  onClick={() => setStatusTab('delivered')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition uppercase ${
                    statusTab === 'delivered' ? 'bg-black text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  Delivered ({orders.filter((o) => o.currentStatus === 'delivered').length})
                </button>
              </div>

              {/* SEARCH */}
              <div className="flex items-center border border-neutral-300 rounded-lg px-3 py-1.5 bg-white focus-within:border-black transition">
                <Search className="w-3.5 h-3.5 text-neutral-400 mr-2 shrink-0" />
                <input
                  type="text"
                  placeholder="Search by Order ID or item..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs outline-none bg-transparent"
                />
              </div>
            </div>

            {/* CLAIM NOTICE */}
            {claimMsg && (
              <div className={`p-3.5 rounded-xl border text-xs font-medium flex items-center gap-2 ${claimMsg.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
                {claimMsg.type === 'success' ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-amber-600" />}
                {claimMsg.msg}
              </div>
            )}

            {/* LOADING ORDERS */}
            {loadingOrders ? (
              <div className="text-center py-16 bg-white rounded-xl border border-neutral-200">
                <RefreshCw className="w-6 h-6 animate-spin text-neutral-400 mx-auto mb-2" />
                <p className="text-xs text-neutral-500">Loading your verified orders...</p>
              </div>
            ) : ordersError ? (
              <div className="text-center py-12 bg-white rounded-xl border border-neutral-200">
                <AlertCircle className="w-6 h-6 text-red-500 mx-auto mb-2" />
                <p className="text-xs text-neutral-600 mb-3">{ordersError}</p>
                <button onClick={fetchUserOrders} className="text-xs font-bold bg-black text-white px-4 py-2 rounded-lg">
                  Try Again
                </button>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-16 px-4 bg-white rounded-xl border border-neutral-200 shadow-sm">
                <div className="w-14 h-14 bg-neutral-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Package className="w-7 h-7 text-neutral-400 stroke-[1.2]" />
                </div>
                <h4 className="font-display text-lg font-bold text-neutral-900">No Orders Found</h4>
                <p className="text-neutral-500 text-xs max-w-sm mx-auto mt-2 font-light">
                  {orders.length === 0
                    ? "You haven't placed any orders with this account yet."
                    : 'No orders match your filter criteria.'}
                </p>
                <div className="mt-6 flex justify-center gap-3">
                  <Link
                    href="/shop"
                    className="bg-black text-white text-xs font-bold px-6 py-3 rounded-lg hover:bg-neutral-800 transition shadow inline-flex items-center gap-1.5"
                  >
                    START SHOPPING <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {filteredOrders.map((order) => {
                  const isExpanded = expandedOrderId === order.orderId;

                  return (
                    <div
                      key={order.orderId}
                      className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm hover:shadow transition duration-200"
                    >
                      {/* CARD HEADER */}
                      <div className="bg-neutral-50 border-b border-neutral-100 px-5 py-4 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="bg-black text-white text-xs font-extrabold px-3 py-1 rounded tracking-wide uppercase">
                            {order.orderId}
                          </span>
                          <span className="text-[11px] text-neutral-400 flex items-center gap-1 font-light">
                            <Calendar className="w-3 h-3" />{' '}
                            {new Date(order.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs">
                          <span className="text-neutral-500 font-light">Total:</span>
                          <span className="font-extrabold text-neutral-900 text-sm">{formatPkr(order.total)}</span>
                        </div>
                      </div>

                      {/* ITEMS LIST */}
                      <div className="p-5 border-b border-neutral-100 space-y-4">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="flex gap-4 items-center justify-between">
                            <div className="flex gap-3 items-center">
                              <div className="relative w-12 h-16 bg-neutral-100 rounded-lg overflow-hidden shrink-0 border border-neutral-200">
                                <Image src={item.img} alt={item.name} fill className="object-cover" />
                              </div>
                              <div>
                                <h5 className="text-xs sm:text-sm font-bold text-neutral-900 line-clamp-1">{item.name}</h5>
                                <p className="text-[10px] text-neutral-500 mt-0.5 font-light">
                                  Size: <span className="font-semibold text-neutral-800">{item.size}</span> &middot; Color:{' '}
                                  <span className="font-semibold text-neutral-800">{item.color}</span>
                                </p>
                              </div>
                            </div>
                            <div className="text-right text-xs">
                              <p className="font-bold text-neutral-900">{formatPkr(item.price)}</p>
                              <p className="text-[10px] text-neutral-400 mt-0.5 font-light">Qty: {item.qty}</p>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* TRACKING BAR & EXPAND BUTTON */}
                      <div className="p-5 bg-neutral-50/50">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-2.5 h-2.5 rounded-full inline-block ${
                                order.currentStatus === 'delivered' ? 'bg-emerald-500' : 'bg-amber-500 animate-ping'
                              }`}
                            ></span>
                            <h4 className="text-xs font-bold text-neutral-800 uppercase tracking-wide">
                              Live Status: {order.statusTitle}
                            </h4>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setExpandedOrderId(isExpanded ? null : order.orderId)}
                              className="text-xs font-bold bg-black text-white px-3 py-1.5 rounded-lg hover:bg-neutral-800 transition inline-flex items-center gap-1 shadow-2xs"
                            >
                              {isExpanded ? 'Hide Timeline' : 'View Timeline'} <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                            </button>
                          </div>
                        </div>

                        {/* EXPANDABLE TIMELINE */}
                        {isExpanded && (
                          <div className="mt-6 pt-4 border-t border-neutral-200 animate-fade-in">
                            <OrderTrackingTimeline timeline={order.timeline} currentStatus={order.currentStatus} />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* SIDEBAR COLUMN (1/3 width) */}
          <div className="space-y-6">
            <h2 className="text-lg sm:text-xl font-bold text-neutral-900 tracking-wide">ACCOUNT INFORMATION</h2>

            <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-3 pb-4 border-b border-neutral-100">
                <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center font-bold text-sm">
                  {currentUser.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-neutral-900">{currentUser.name}</h4>
                  <p className="text-[11px] text-neutral-400 font-light">{currentUser.email}</p>
                </div>
              </div>

              <div className="space-y-2.5 text-xs text-neutral-600">
                <div className="flex justify-between items-baseline">
                  <span className="font-light text-neutral-400">Account Type:</span>
                  <span className="font-bold text-neutral-900 bg-neutral-100 px-2 py-0.5 rounded text-[10px]">VERIFIED CUSTOMER</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="font-light text-neutral-400">Total Orders:</span>
                  <span className="font-bold text-neutral-900">{orders.length}</span>
                </div>
              </div>

              {/* CLAIM GUEST ORDERS BUTTON */}
              <div className="pt-3 border-t border-neutral-100">
                {!claimChallengeId ? <button onClick={handleRequestGuestOrderClaim} disabled={claiming} className="w-full text-xs font-bold bg-neutral-100 hover:bg-neutral-200 text-neutral-800 py-2.5 rounded-lg transition flex items-center justify-center gap-1.5 disabled:opacity-50">
                  {claiming ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <PlusCircle className="w-3.5 h-3.5" />} Claim Guest Orders
                </button> : <div className="space-y-2">
                  <p className="text-[10px] text-neutral-500">Enter the 6-digit code sent to {currentUser.email}.</p>
                  {debugClaimCode && <p className="text-[10px] font-mono bg-amber-50 text-amber-800 p-2 rounded">Development code: {debugClaimCode}</p>}
                  <input value={claimCode} onChange={event => setClaimCode(event.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" placeholder="6-digit code" className="w-full border rounded-lg px-3 py-2 text-sm font-mono tracking-widest" />
                  <div className="flex gap-2"><button onClick={handleVerifyGuestOrderClaim} disabled={claiming || claimCode.length !== 6} className="flex-1 bg-black text-white text-xs font-bold py-2 rounded-lg disabled:opacity-40">Verify & Claim</button><button onClick={() => { setClaimChallengeId(''); setClaimCode(''); }} className="px-3 border rounded-lg text-xs">Cancel</button></div>
                </div>}
              </div>
            </div>

            {/* SHOPPING POLICIES SUMMARY */}
            <div className="bg-stone-100/50 border border-neutral-200 rounded-xl p-5 shadow-sm">
              <h4 className="text-xs font-bold text-neutral-800 uppercase tracking-wider mb-2">Shopping Policies</h4>
              <ul className="space-y-2 text-[11px] text-neutral-500 leading-normal font-light">
                <li>• All placed orders are processed and handled within 24 working hours.</li>
                <li>• Cash on Delivery is verified via verification call prior to shipment.</li>
                <li>• Exchange claims can be filed within 7 days of package delivery.</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
