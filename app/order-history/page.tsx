'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCart, Order } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { 
  Package, 
  MapPin, 
  Clock, 
  CheckCircle, 
  ChevronRight, 
  User as UserIcon, 
  ShoppingBag, 
  ArrowRight,
  Sparkles,
  Search,
  Lock,
  LogOut,
  Calendar,
  CreditCard
} from 'lucide-react';

export default function OrderHistoryPage() {
  const { orders, placeOrder } = useCart();
  const { currentUser, logout, isLoaded } = useAuth();
  const [demoLoaded, setDemoLoaded] = useState(false);
  const [trackingId, setTrackingId] = useState<string | null>(null);

  // Status mapping
  const statusSteps = [
    { label: 'Order Placed', desc: 'We have received your order' },
    { label: 'Processing', desc: 'Preparing and packing your items' },
    { label: 'Shipped', desc: 'Handed over to carrier partner' },
    { label: 'In Transit', desc: 'On its way to your city' },
    { label: 'Delivered', desc: 'Successfully delivered to your doorstep' },
  ];

  // Load a beautiful demo order so they immediately see the visual tracking if they are new
  const handleLoadDemoOrder = () => {
    if (!currentUser) return;
    
    // Check if demo order already exists
    const hasDemo = orders.some(o => o.customer.email === currentUser.email);
    if (hasDemo) {
      alert('Demo order is already present in your order history!');
      return;
    }

    // Place a mock demo order using CartContext's helper or manually injecting (we can place it directly)
    // To keep it simple, we simulate placing an order under their email
    const demoShipping = {
      name: currentUser.name,
      address: 'Suite 404, Fashion Boulevard, Block C',
      city: 'Karachi',
      phone: '0300-9876543',
      email: currentUser.email
    };

    // We can directly trigger a custom mock order placement
    // We will simulate it using localStorage to not pollute active cart
    try {
      const savedOrdersRaw = localStorage.getItem('cr_orders');
      const currentOrdersList: Order[] = savedOrdersRaw ? JSON.parse(savedOrdersRaw) : [];
      
      const demoId = `CR-${Math.floor(100000 + Math.random() * 900000)}`;
      const deliveryDate = new Date();
      deliveryDate.setDate(deliveryDate.getDate() + 3);
      const deliveryStr = deliveryDate.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });

      const newDemo: Order = {
        orderId: demoId,
        statusIndex: 2, // Shipped
        delivery: deliveryStr,
        total: 104.80,
        payMethod: 'Cash on Delivery',
        items: [
          {
            id: 1,
            name: 'Casual Cotton Shirt',
            size: 'M',
            color: 'Stone',
            price: 29.90,
            qty: 2,
            img: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=300&q=80'
          },
          {
            id: 5,
            name: 'Slim Fit Denim Pants',
            size: '32',
            color: 'Blue',
            price: 45.00,
            qty: 1,
            img: 'https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=300&q=80'
          }
        ],
        customer: demoShipping
      };

      const updated = [newDemo, ...currentOrdersList];
      localStorage.setItem('cr_orders', JSON.stringify(updated));
      setDemoLoaded(true);
      // Reload page to reflect context updates smoothly
      window.location.reload();
    } catch (e) {
      console.error(e);
    }
  };

  // Filter orders matching logged-in user email
  const userOrders = currentUser 
    ? orders.filter(o => o.customer.email.toLowerCase() === currentUser.email.toLowerCase())
    : [];

  if (!isLoaded) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <span className="w-8 h-8 border-3 border-black/20 border-t-black rounded-full animate-spin inline-block"></span>
        <p className="text-xs text-neutral-400 mt-2">Loading your wardrobe details...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 pb-20 pt-6" id="order-history-container">
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
            Track active shipments, view order details, and check previous receipts.
          </p>
        </div>
      </section>

      {/* BREADCRUMB / AUTH STATE BAR */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between mb-8 pb-4 border-b border-neutral-200">
        <div className="text-xs sm:text-sm text-neutral-500 flex items-center gap-1.5 font-medium">
          <Link href="/" className="hover:text-black transition">Home</Link>
          <span>/</span>
          <span className="text-neutral-900 font-semibold">Order History</span>
        </div>

        {currentUser && (
          <div className="flex items-center gap-3 bg-white border border-neutral-200 rounded-full px-4 py-1.5 shadow-sm text-xs" id="auth-status-badge">
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
        <div className="max-w-2xl mx-auto bg-white border border-neutral-200 rounded-xl p-6 sm:p-10 text-center shadow-sm" id="auth-required-view">
          <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="w-8 h-8 text-neutral-400 stroke-[1.5]" />
          </div>
          <h3 className="font-display text-xl sm:text-2xl font-bold text-neutral-900">Sign In Required</h3>
          <p className="text-neutral-500 text-xs sm:text-sm max-w-md mx-auto mt-2 leading-relaxed font-light">
            Please log in or create an account to view and manage your order history, trace delivery progress, and store purchase records.
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

          {/* Quick Info Tip */}
          <p className="text-[10px] text-neutral-400 mt-6 italic">
            Tip: You can use our dummy test credentials: <strong>test@example.com</strong> / <strong>password</strong>
          </p>
        </div>
      ) : (
        /* IF LOGGED IN */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* ORDERS LIST COLUMN (2/3 width) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-baseline justify-between mb-2">
              <h2 className="text-lg sm:text-xl font-bold text-neutral-900 tracking-wide">
                YOUR ORDERS ({userOrders.length})
              </h2>
            </div>

            {userOrders.length === 0 ? (
              <div className="text-center py-16 px-4 bg-white rounded-xl border border-neutral-200 shadow-sm">
                <div className="w-14 h-14 bg-neutral-50 rounded-full flex items-center justify-center mx-auto mb-5">
                  <Package className="w-7 h-7 text-neutral-400 stroke-[1.2]" />
                </div>
                <h4 className="font-display text-lg font-bold text-neutral-900">No Orders Found</h4>
                <p className="text-neutral-500 text-xs sm:text-sm max-w-sm mx-auto mt-2 leading-relaxed font-light">
                  You haven&apos;t placed any orders with this account yet. Tap below to check out our premium wardrobe items!
                </p>
                <div className="mt-6">
                  <Link
                    href="/shop"
                    className="bg-black text-white text-xs sm:text-sm font-bold px-6 py-3 rounded hover:bg-neutral-800 transition active:scale-95 inline-flex items-center gap-1.5 shadow"
                  >
                    START SHOPPING <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-6" id="orders-items-list">
                {userOrders.map((order) => {
                  const isTrackingThis = trackingId === order.orderId;
                  
                  return (
                    <div 
                      key={order.orderId} 
                      className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm hover:shadow transition duration-200"
                      id={`order-card-${order.orderId}`}
                    >
                      {/* Order Card Header */}
                      <div className="bg-neutral-50 border-b border-neutral-100 px-5 py-4 flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="bg-black text-white text-[10px] sm:text-xs font-bold px-3 py-1 rounded tracking-wide">
                            {order.orderId}
                          </div>
                          <span className="text-[11px] text-neutral-400 flex items-center gap-1 font-light">
                            <Calendar className="w-3 h-3" /> placed recently
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs sm:text-sm">
                          <span className="text-neutral-500 font-light">
                            Total amount:
                          </span>
                          <span className="font-extrabold text-neutral-900">
                            ${order.total.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Order Card Items List */}
                      <div className="p-5 border-b border-neutral-100 space-y-4">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="flex gap-4 items-center justify-between">
                            <div className="flex gap-3 items-center">
                              <div className="relative w-12 h-16 bg-neutral-100 rounded overflow-hidden flex-none">
                                <Image
                                  src={item.img}
                                  alt={item.name}
                                  fill
                                  sizes="48px"
                                  referrerPolicy="no-referrer"
                                  className="object-cover"
                                />
                              </div>
                              <div>
                                <h5 className="text-xs sm:text-sm font-bold text-neutral-900 line-clamp-1">
                                  {item.name}
                                </h5>
                                <p className="text-[10px] sm:text-xs text-neutral-500 mt-0.5 font-light">
                                  Size: <span className="font-medium text-neutral-800">{item.size}</span> &nbsp;|&nbsp; Color: <span className="font-medium text-neutral-800">{item.color}</span>
                                </p>
                              </div>
                            </div>
                            <div className="text-right text-xs">
                              <p className="font-bold text-neutral-900">${item.price.toFixed(2)}</p>
                              <p className="text-[10px] text-neutral-400 mt-0.5 font-light">Qty: {item.qty}</p>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Interactive Tracking Section */}
                      <div className="p-5 bg-neutral-50/50">
                        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping inline-block"></span>
                            <h4 className="text-xs font-bold text-neutral-800 uppercase tracking-wide">
                              Live Status: {statusSteps[order.statusIndex].label}
                            </h4>
                          </div>
                          
                          <button
                            onClick={() => setTrackingId(isTrackingThis ? null : order.orderId)}
                            className="text-xs font-bold text-black underline hover:text-neutral-600 transition inline-flex items-center gap-1"
                          >
                            {isTrackingThis ? 'Hide Tracker' : 'Track Package'} <ChevronRight className="w-3.5 h-3.5 rotate-90" />
                          </button>
                        </div>

                        {/* Tracker Progress Bar */}
                        {isTrackingThis && (
                          <div className="mt-6 pt-2 pb-4 border-t border-neutral-200 animate-fade-in" id={`tracker-visual-${order.orderId}`}>
                            {/* Horizontal tracking steps */}
                            <div className="relative flex items-center justify-between mb-8">
                              {/* Background progress line */}
                              <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 bg-neutral-200 z-0"></div>
                              {/* Filled active line */}
                              <div 
                                className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-black z-0 transition-all duration-700"
                                style={{ width: `${(order.statusIndex / (statusSteps.length - 1)) * 100}%` }}
                              ></div>

                              {statusSteps.map((step, idx) => {
                                const isCompleted = idx <= order.statusIndex;
                                const isCurrent = idx === order.statusIndex;
                                return (
                                  <div key={idx} className="relative z-10 flex flex-col items-center">
                                    <div 
                                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition duration-300 ${
                                        isCurrent 
                                          ? 'bg-black border-black text-white scale-110 shadow' 
                                          : isCompleted 
                                            ? 'bg-emerald-500 border-emerald-500 text-white' 
                                            : 'bg-white border-neutral-300 text-neutral-400'
                                      }`}
                                    >
                                      {isCompleted && !isCurrent ? (
                                        <CheckCircle className="w-3.5 h-3.5" />
                                      ) : (
                                        idx + 1
                                      )}
                                    </div>
                                    <span 
                                      className={`absolute -bottom-6 text-[9px] sm:text-[10px] font-bold whitespace-nowrap tracking-tight transition ${
                                        isCurrent ? 'text-black' : 'text-neutral-400'
                                      }`}
                                    >
                                      {step.label}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Current Step Description Card */}
                            <div className="bg-white border border-neutral-200/80 rounded-lg p-4 flex items-start gap-3 mt-4 shadow-sm">
                              <Package className="w-5 h-5 text-neutral-700 flex-none mt-0.5" />
                              <div>
                                <h6 className="text-xs font-bold text-neutral-900">{statusSteps[order.statusIndex].label}</h6>
                                <p className="text-[11px] text-neutral-500 mt-0.5 leading-relaxed font-light">
                                  {statusSteps[order.statusIndex].desc}. Est. delivery date: <strong>{order.delivery}</strong>
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Delivery Method and Customer Receipt info snippet */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-neutral-100 text-[11px] text-neutral-500 font-light">
                          <div className="flex items-start gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-neutral-400 flex-none" />
                            <div>
                              <strong className="font-bold text-neutral-800">Shipping Address:</strong>
                              <p className="mt-0.5">{order.customer.address}, {order.customer.city}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-1.5">
                            <CreditCard className="w-3.5 h-3.5 text-neutral-400 flex-none" />
                            <div>
                              <strong className="font-bold text-neutral-800">Payment:</strong>
                              <p className="mt-0.5">{order.payMethod} &nbsp;|&nbsp; Standard delivery cost included</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* CUSTOMER ACCOUNT INFORMATION COLUMN (1/3 width) */}
          <div className="space-y-6">
            <h2 className="text-lg sm:text-xl font-bold text-neutral-900 tracking-wide">
              ACCOUNT INFORMATION
            </h2>

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
                  <span className="font-light text-neutral-400">Default City:</span>
                  <span className="font-semibold text-neutral-900">Karachi / Lahore / Islamabad</span>
                </div>
              </div>
            </div>

            {/* POLICY SUMMARY */}
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
