'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  ClipboardList,
  AlertCircle,
  ShoppingBag,
  Truck,
  HelpCircle,
  Search,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  UserCheck,
  ArrowRight
} from 'lucide-react';
import { CustomerSafeTrackedOrder, STATUS_DISPLAY_MAP, CanonicalOrderStatus } from '../../lib/order-tracking';
import OrderTrackingTimeline from '../../components/OrderTrackingTimeline';
import { useAuth } from '../../context/AuthContext';
import { formatPkr } from '../../lib/utils';

function TrackOrderContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { currentUser } = useAuth();
  const [mounted, setMounted] = useState(false);

  const [orderIdInput, setOrderIdInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [activeOrder, setActiveOrder] = useState<CustomerSafeTrackedOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && currentUser) {
      router.replace('/order-history');
    }
  }, [mounted, currentUser, router]);

  const executeTracking = useCallback(async (cleanId: string, cleanEmail: string) => {
    const targetId = cleanId.trim().toUpperCase();
    const targetEmail = cleanEmail.trim().toLowerCase();

    if (!targetId || !targetEmail) {
      setErrorMsg('Please enter both your Order/Tracking ID and checkout email address.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setActiveOrder(null);

    try {
      const response = await fetch('/api/orders/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: targetId, email: targetEmail }),
      });

      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.message || 'Unable to locate order. Please verify details.');
      }

      const trackedOrder = (payload.order || payload.data) as CustomerSafeTrackedOrder;
      if (trackedOrder) {
        setActiveOrder(trackedOrder);
      } else {
        throw new Error('Unable to locate order. Please verify details.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Unable to search for order. Please check inputs.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const urlOrder = searchParams.get('order') || searchParams.get('trackingId');
    const targetEmail = currentUser?.email || emailInput;
    if (urlOrder) {
      const cleanUrlOrder = urlOrder.trim().toUpperCase();
      setOrderIdInput(cleanUrlOrder);
      if (targetEmail) {
        setEmailInput(targetEmail);
        executeTracking(cleanUrlOrder, targetEmail);
      }
    } else if (currentUser?.email && !emailInput) {
      setEmailInput(currentUser.email);
    }
  }, [searchParams, currentUser, executeTracking]);

  const handleTrackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    executeTracking(orderIdInput, emailInput);
  };

  const statusKey = activeOrder ? ((activeOrder.currentStatus || (activeOrder as any).status || 'placed') as CanonicalOrderStatus) : 'placed';
  const statusMeta = STATUS_DISPLAY_MAP[statusKey] || STATUS_DISPLAY_MAP['placed'];
  const activeStatusConfig = activeOrder
    ? { label: statusMeta.title, bg: 'bg-neutral-100', text: 'text-neutral-800' }
    : null;

  return (
    <div className="max-w-7xl mx-auto px-4 pb-16">
      <section className="relative h-40 sm:h-56 md:h-64 overflow-hidden -mx-4">
        <Image
          src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1920&q=80"
          alt="Order tracking background"
          fill
          priority
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-black/65" />
        <div className="relative z-10 max-w-7xl mx-auto h-full flex flex-col justify-center px-4">
          <h1 className="font-display text-white text-3xl sm:text-4xl font-extrabold tracking-tight">
            TRACK YOUR ORDER
          </h1>
          <p className="text-neutral-300 text-xs sm:text-sm mt-1 font-light">
            Enter your order reference &amp; email to check real-time courier updates.
          </p>
        </div>
      </section>

      <div className="py-4 text-xs sm:text-sm text-neutral-500">
        <Link href="/" className="hover:text-black">Home</Link> <span className="mx-1">/</span>{' '}
        <span className="text-neutral-900 font-medium">Track Order</span>
      </div>

      <section className="max-w-2xl mx-auto py-6 animate-fade-up">
        {currentUser && (
          <div className="mb-6 p-4 bg-neutral-900 text-white rounded-xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <UserCheck className="w-5 h-5 text-emerald-400 flex-none" />
              <div>
                <p className="text-xs font-semibold">Logged in as {currentUser.name} ({currentUser.email})</p>
                <p className="text-[11px] text-neutral-300">You can view your complete order history and real-time status in your account dashboard.</p>
              </div>
            </div>
            <Link
              href="/order-history"
              className="bg-white text-black text-xs font-bold px-4 py-2.5 rounded-lg hover:bg-neutral-200 transition whitespace-nowrap flex items-center gap-1.5 flex-none shadow"
            >
              GO TO MY ORDER HISTORY <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        <div className="bg-white border border-neutral-200 rounded-xl p-6 sm:p-8 shadow-sm">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-neutral-100">
            <Search className="w-5 h-5 text-neutral-800" />
            <h2 className="font-display text-base sm:text-lg font-bold text-neutral-900">
              Lookup Order Details
            </h2>
          </div>

          <form onSubmit={handleTrackSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-neutral-700 block uppercase tracking-wider">
                ORDER ID OR TRACKING CODE <span className="text-red-500">*</span>
              </label>
              <input
                required
                type="text"
                placeholder="e.g. CR-100482 or TRK-9872"
                value={orderIdInput}
                onChange={(e) => setOrderIdInput(e.target.value)}
                className="mt-1.5 w-full border border-neutral-300 rounded-lg px-3.5 py-2.5 text-sm font-mono outline-none focus:border-black bg-[#f4f4f3] transition text-neutral-900 uppercase"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-neutral-700 block uppercase tracking-wider">
                EMAIL ADDRESS USED AT CHECKOUT <span className="text-red-500">*</span>
              </label>
              <input
                required
                type="email"
                placeholder="you@example.com"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="mt-1.5 w-full border border-neutral-300 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-black bg-[#f4f4f3] transition text-neutral-900"
              />
            </div>

            {errorMsg && (
              <div className="text-xs text-red-700 bg-red-50 border border-red-200 p-3 rounded-lg flex items-center gap-2 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-black text-white text-xs font-bold py-3.5 rounded-lg hover:bg-neutral-800 transition tracking-wider uppercase active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:bg-neutral-400"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> SEARCHING ORDERS…
                </>
              ) : (
                <>
                  <Truck className="w-4 h-4" /> TRACK ORDER NOW
                </>
              )}
            </button>
          </form>

          {currentUser && (
            <div className="mt-6 pt-4 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-600">
              <span className="flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-emerald-600" /> Logged in as <strong className="text-neutral-900">{currentUser.email}</strong>
              </span>
              <Link href="/account" className="font-bold text-black hover:underline flex items-center gap-1">
                View All Past Orders <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          )}
        </div>
      </section>

      {activeOrder && (
        <section className="max-w-3xl mx-auto pt-6 animate-fade-up space-y-6">
          <div className="bg-white border border-neutral-200 rounded-xl p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-200">
              <div>
                <span className="text-[10px] font-extrabold tracking-widest text-neutral-400 uppercase">
                  ORDER REFERENCE
                </span>
                <h3 className="font-display text-2xl font-black text-neutral-900 tracking-tight">
                  {activeOrder.orderId}
                </h3>
                <p className="text-xs text-neutral-500 font-light mt-0.5">
                  Placed on {new Date(activeOrder.createdAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>

              {activeStatusConfig && (
                <div className="self-start sm:self-auto">
                  <span className={`inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-black tracking-wide uppercase ${activeStatusConfig.bg} ${activeStatusConfig.text}`}>
                    ● {activeStatusConfig.label}
                  </span>
                </div>
              )}
            </div>

            {activeOrder.courier && (
              <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div>
                  <p className="font-bold text-neutral-900 flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-black" /> Courier Partner: <span className="uppercase text-black font-extrabold">{activeOrder.courier.name || (activeOrder.courier as any).provider}</span>
                  </p>
                  <p className="text-neutral-600 font-mono mt-0.5">
                    Tracking ID: <strong>{activeOrder.courier.trackingNumber || (activeOrder.courier as any).trackingId}</strong>
                  </p>
                </div>
                {activeOrder.courier.trackingUrl && (
                  <a
                    href={activeOrder.courier.trackingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 bg-black text-white px-3.5 py-2 rounded-md font-bold hover:bg-neutral-800 transition shrink-0"
                  >
                    Track On {activeOrder.courier.name || (activeOrder.courier as any).provider} <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            )}

            <div>
              <p className="font-bold text-xs tracking-widest text-neutral-400 uppercase mb-4">
                DELIVERY TIMELINE
              </p>
              <OrderTrackingTimeline currentStatus={activeOrder.currentStatus} timeline={activeOrder.timeline} />
            </div>

            <div>
              <p className="font-bold text-xs tracking-widest text-neutral-400 uppercase mb-3">
                ORDER ITEMS ({activeOrder.items.length})
              </p>
              <div className="divide-y divide-neutral-100 border border-neutral-200 rounded-lg overflow-hidden bg-[#fafafa]">
                {activeOrder.items.map((item, idx) => (
                  <div key={idx} className="p-3.5 flex items-center gap-3 bg-white">
                    <div className="relative w-12 h-14 bg-neutral-200 rounded overflow-hidden shrink-0">
                      <Image
                        src={item.img || '/colossal-rigout-logo.png'}
                        alt={item.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-extrabold text-neutral-900 truncate">{item.name}</p>
                      <p className="text-[11px] text-neutral-500 font-light">
                        Qty: {item.qty} &bull; Size: {item.size} {item.color ? `&bull; Color: ${item.color}` : ''}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold text-neutral-900">{formatPkr(item.price * item.qty)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-neutral-100 flex flex-col sm:flex-row justify-between gap-4 text-xs text-neutral-600">
              <div>
                <p className="font-bold text-neutral-900">Destination City:</p>
                <p className="font-light">{activeOrder.shippingCity || 'Pakistan'}</p>
                <p className="font-light text-neutral-400">Payment: {activeOrder.payMethod} ({activeOrder.paymentStatus})</p>
              </div>
              <div className="sm:text-right space-y-1">
                <div className="flex justify-between sm:justify-end gap-6 text-neutral-600">
                  <span>Subtotal:</span>
                  <span>PKR {activeOrder.subtotal}</span>
                </div>
                <div className="flex justify-between sm:justify-end gap-6 text-neutral-600">
                  <span>Shipping:</span>
                  <span>{activeOrder.shippingCost === 0 ? 'FREE' : `PKR ${activeOrder.shippingCost}`}</span>
                </div>
                <div className="flex justify-between sm:justify-end gap-6 text-xs font-extrabold text-neutral-900 pt-2 border-t border-neutral-200">
                  <span>Total Paid:</span>
                  <span>PKR {activeOrder.total}</span>
                </div>
              </div>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row gap-3">
              <Link
                href="/shop"
                className="flex-1 text-center border border-black text-xs font-bold px-6 py-3 rounded-lg hover:bg-black hover:text-white transition active:scale-95 uppercase tracking-wider"
              >
                CONTINUE SHOPPING
              </Link>
              <Link
                href="/contact"
                className="flex-1 text-center bg-black text-white text-xs font-bold px-6 py-3 rounded-lg hover:bg-neutral-800 transition active:scale-95 uppercase tracking-wider"
              >
                NEED HELP? CONTACT SUPPORT
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

export default function TrackOrderClient() {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 py-20 text-center">
          <RefreshCw className="w-6 h-6 animate-spin text-neutral-400 mx-auto mb-2" />
          <p className="text-xs text-neutral-500">Loading order tracker…</p>
        </div>
      }
    >
      <TrackOrderContent />
    </Suspense>
  );
}
