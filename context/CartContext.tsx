'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, setDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { useAuth } from './AuthContext';

export interface CartItem {
  id: number;
  name: string;
  size: string;
  color: string;
  price: number;
  qty: number;
  img: string;
  variantId?: string;
  colorId?: string;
  sizeId?: string;
  slug?: string;
  availableStock?: number;
}

export interface AppliedPromotionSummary {
  id: string;
  name: string;
  mode: 'automatic' | 'coupon';
  code: string | null;
  discountType: 'percentage' | 'fixed' | 'free-shipping';
  discountValue: number;
  discountAmount: number;
  minimumOrder: number;
  maximumDiscount: number | null;
}

export interface Order {
  orderId: string;
  publicTrackingId?: string;
  statusIndex: number;
  delivery: string;
  total: number;
  payMethod: string;
  items: CartItem[];
  customer: {
    name: string;
    address: string;
    city: string;
    phone: string;
    email: string;
  };
  ownerId?: string | null;
  createdAt?: string;
  currentStatus?: string;
  subtotal?: number;
  shippingCost?: number;
  discountAmount?: number;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (item: Omit<CartItem, 'qty'> & { qty?: number }) => void;
  removeFromCart: (id: number, size: string, color: string) => void;
  changeQty: (id: number, size: string, color: string, delta: number) => void;
  clearCart: () => void;
  wishlist: number[];
  toggleWishlist: (id: number) => void;
  promoDiscount: number;
  promoCodeApplied: string;
  promoDiscountAmount: number;
  quotedSubtotal: number | null;
  quotedItems: CartItem[];
  appliedPromotions: AppliedPromotionSummary[];
  applyPromo: (code: string) => Promise<{ success: boolean; message: string }>;
  removePromo: () => void;
  orders: Order[];
  placeOrder: (
    shippingInfo: { name: string; address: string; city: string; phone: string; email: string },
    shipCost: number,
    payMethod: string
  ) => Promise<Order>;
  trackOrder: (orderId: string, email?: string) => Promise<any>;
  isLoaded: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAuth();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<number[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [promoCodeApplied, setPromoCodeApplied] = useState('');
  const [promoDiscountAmount, setPromoDiscountAmount] = useState(0);
  const [quotedSubtotal, setQuotedSubtotal] = useState<number | null>(null);
  const [quotedItems, setQuotedItems] = useState<CartItem[]>([]);
  const [appliedPromotions, setAppliedPromotions] = useState<AppliedPromotionSummary[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // 1. Initial Load of cart & wishlist from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        try {
          const savedCart = localStorage.getItem('cr_cart');
          const savedWishlist = localStorage.getItem('cr_wishlist');
          
          if (savedCart) setCart(JSON.parse(savedCart));
          if (savedWishlist) setWishlist(JSON.parse(savedWishlist));
        } catch (e) {
          console.error('Error loading local data from localStorage:', e);
        }
        setIsLoaded(true);
      }, 0);
    }
  }, []);

  // 2. Synchronize user-specific orders with Firestore on Auth state changes
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const q = query(collection(db, 'orders'), where('ownerId', '==', firebaseUser.uid));
          const querySnapshot = await getDocs(q);
          const loadedOrders: Order[] = [];
          
          querySnapshot.forEach((docSnap) => {
            loadedOrders.push(docSnap.data() as Order);
          });

          // Sort loaded orders by createdAt descending if present, otherwise by ID
          loadedOrders.sort((a, b) => {
            const timeA = a.createdAt || '';
            const timeB = b.createdAt || '';
            return timeB.localeCompare(timeA);
          });

          setOrders(loadedOrders);
        } catch (e) {
          console.error("Error loading user orders from Firestore:", e);
        }
      } else {
        // Logged out: fallback to guest orders from localstorage
        try {
          const savedOrders = localStorage.getItem('cr_orders');
          if (savedOrders) {
            setOrders(JSON.parse(savedOrders));
          } else {
            setOrders([]);
          }
        } catch (e) {
          console.error("Error resetting guest orders on signout:", e);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // 3. Persist local states to localStorage
  useEffect(() => {
    if (isLoaded && typeof window !== 'undefined') {
      localStorage.setItem('cr_cart', JSON.stringify(cart));
    }
  }, [cart, isLoaded]);

  useEffect(() => {
    if (isLoaded && typeof window !== 'undefined') {
      localStorage.setItem('cr_wishlist', JSON.stringify(wishlist));
    }
  }, [wishlist, isLoaded]);

  // Save guest orders to localstorage as fallback
  useEffect(() => {
    if (isLoaded && typeof window !== 'undefined' && !auth.currentUser) {
      localStorage.setItem('cr_orders', JSON.stringify(orders));
    }
  }, [orders, isLoaded]);

  const addToCart = (newItem: Omit<CartItem, 'qty'> & { qty?: number }) => {
    setCart((prev) => {
      const existingIndex = prev.findIndex(
        (item) =>
          item.id === newItem.id &&
          item.size === newItem.size &&
          item.color === newItem.color
      );
      const stock = Number(
        newItem.availableStock ?? (existingIndex > -1 ? prev[existingIndex].availableStock : null) ?? Number.MAX_SAFE_INTEGER
      );
      const addAmount = newItem.qty || 1;

      if (existingIndex > -1) {
        const updated = [...prev];
        const currentQty = updated[existingIndex].qty;
        const newQty = Math.min(currentQty + addAmount, stock);
        updated[existingIndex] = {
          ...updated[existingIndex],
          ...newItem,
          qty: newQty,
          availableStock: stock === Number.MAX_SAFE_INTEGER ? updated[existingIndex].availableStock : stock,
        };
        return updated;
      }
      return [
        ...prev,
        {
          ...newItem,
          qty: Math.min(addAmount, stock),
        },
      ];
    });
  };

  const removeFromCart = (id: number, size: string, color: string) => {
    setCart((prev) =>
      prev.filter(
        (item) => !(item.id === id && item.size === size && item.color === color)
      )
    );
  };

  const changeQty = (id: number, size: string, color: string, delta: number) => {
    setCart((prev) => {
      return prev.map((item) => {
        if (item.id === id && item.size === size && item.color === color) {
          const stock = Number(item.availableStock ?? Number.MAX_SAFE_INTEGER);
          const rawQty = item.qty + delta;
          const nextQty = Math.min(Math.max(1, rawQty), stock);
          return { ...item, qty: nextQty };
        }
        return item;
      });
    });
  };

  const clearCart = () => {
    setCart([]);
    setPromoDiscount(0);
    setPromoCodeApplied('');
    setPromoDiscountAmount(0);
    setQuotedSubtotal(null);
    setQuotedItems([]);
    setAppliedPromotions([]);
  };

  const toggleWishlist = (id: number) => {
    setWishlist((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Recalculate promo discount when cart or authentication changes
  useEffect(() => {
    if (!isLoaded) return;

    const reapplyPromo = async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        const applyRes = await fetch('/api/cart/quote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({
            items: cart,
            couponCode: promoCodeApplied || null,
            userId: auth.currentUser?.uid || ''
          })
        });
        const applyData = await applyRes.json();

        if (applyData.success) {
          const subtotal = cart.reduce((acc, item) => acc + item.price * item.qty, 0);
          const finalSubtotal = Number(applyData.finalSubtotal ?? subtotal);
          const computedDiscount = Math.max(0, subtotal - finalSubtotal);
          const discountPct = subtotal > 0 ? computedDiscount / subtotal : 0;

          // Auto-clamp cart items if cart quantity exceeds live available stock
          if (Array.isArray(applyData.items) && applyData.items.length > 0) {
            setCart((prevCart) => {
              let updated = false;
              const clampedCart = prevCart.map((cItem) => {
                const qItem = applyData.items.find(
                  (q: any) =>
                    (q.variantId && q.variantId === cItem.variantId) ||
                    (String(q.productId || q.id) === String(cItem.id) &&
                      q.color === cItem.color &&
                      q.size === cItem.size)
                );
                if (qItem && typeof qItem.availableStock === 'number') {
                  const stock = Number(qItem.availableStock);
                  const clampedQty = Math.min(cItem.qty, Math.max(1, stock));
                  if (cItem.qty !== clampedQty || cItem.availableStock !== stock) {
                    updated = true;
                    return { ...cItem, availableStock: stock, qty: clampedQty };
                  }
                }
                return cItem;
              });
              return updated ? clampedCart : prevCart;
            });
          }

          setPromoDiscount(discountPct);
          setPromoDiscountAmount(computedDiscount);
          setQuotedSubtotal(finalSubtotal);
          setQuotedItems(Array.isArray(applyData.items) ? applyData.items : []);
          setAppliedPromotions(Array.isArray(applyData.appliedPromotions) ? applyData.appliedPromotions : []);
        } else {
          setPromoDiscount(0);
          setPromoDiscountAmount(0);
          setQuotedSubtotal(null);
          setQuotedItems([]);
          setAppliedPromotions([]);
          if (promoCodeApplied) setPromoCodeApplied('');
        }
      } catch (err) {
        console.error("Error updating promo calculation:", err);
      }
    };

    reapplyPromo();
  }, [cart, isLoaded, promoCodeApplied]);

  const applyPromo = async (code: string) => {
    const sanitized = code.trim().toUpperCase();
    if (!sanitized) {
      return { success: false, message: 'Please enter a coupon code.' };
    }

    if (appliedPromotions.length > 0 || Boolean(promoCodeApplied)) {
      return {
        success: false,
        message: 'An offer has already been applied. Only one promotion can be used at a time.',
      };
    }
    
    try {
      // 1. Verify eligibility first
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/promotions/eligibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          couponCode: sanitized,
          cartItems: cart.map(item => ({
            productId: item.id,
            price: item.price,
            qty: item.qty
          }))
        })
      });

      const data = await res.json();
      if (data.success && data.eligible) {
        // 2. Compute discount amount
        const applyRes = await fetch('/api/cart/quote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({
            items: cart,
            couponCode: sanitized,
            userId: auth.currentUser?.uid || ''
          })
        });
        const applyData = await applyRes.json();

        if (applyData.success) {
          const subtotal = cart.reduce((acc, item) => acc + item.price * item.qty, 0);
          const finalSubtotal = Number(applyData.finalSubtotal ?? subtotal);
          const computedDiscount = Math.max(0, subtotal - finalSubtotal);
          const discountPct = subtotal > 0 ? computedDiscount / subtotal : 0;

          setPromoDiscount(discountPct);
          setPromoDiscountAmount(computedDiscount);
          setQuotedSubtotal(finalSubtotal);
          setQuotedItems(Array.isArray(applyData.items) ? applyData.items : []);
          setAppliedPromotions(Array.isArray(applyData.appliedPromotions) ? applyData.appliedPromotions : []);
          setPromoCodeApplied(sanitized);
          return { success: true, message: `${sanitized}: Coupon applied successfully!` };
        }
      } else {
        return { success: false, message: data.reason || 'Invalid or expired coupon code.' };
      }
    } catch (e: any) {
      console.error("Error verifying promo code via API:", e);
    }

    return { success: false, message: 'Invalid or expired promo code.' };
  };

  const removePromo = () => {
    setPromoCodeApplied('');
    setPromoDiscount(0);
    setPromoDiscountAmount(0);
    setQuotedSubtotal(null);
    setQuotedItems([]);
    setAppliedPromotions([]);
  };

  const placeOrder = async (
    shippingInfo: { name: string; address: string; city: string; phone: string; email: string },
    shipCost: number,
    payMethod: string
  ) => {
    const subtotal = cart.reduce((acc, item) => acc + item.price * item.qty, 0);
    const discount = subtotal * promoDiscount;
    const finalTotal = Math.max(subtotal + shipCost - discount, 0);

    const orderId = `CR-${Math.floor(100000 + Math.random() * 900000)}`;
    const isExpress = shipCost === 12.00;
    const deliveryDays = isExpress ? 2 : 6;
    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + deliveryDays);
    const deliveryStr = deliveryDate.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });

    const uid = currentUser?.uid || auth.currentUser?.uid || null;

    const newOrder: Order = {
      orderId,
      statusIndex: 0, // Placed
      delivery: deliveryStr,
      total: finalTotal,
      payMethod,
      items: [...cart],
      customer: shippingInfo,
      ownerId: uid,
      createdAt: new Date().toISOString()
    };

    const token = await auth.currentUser?.getIdToken();
    const response = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({
        shippingInfo,
        shipCost,
        payMethod,
        items: cart,
        ownerId: uid,
        promoCodeApplied: promoCodeApplied || null,
      })
    });
    const checkoutData = await response.json();
    if (!response.ok || !checkoutData.order) throw new Error(checkoutData.error || 'Checkout failed.');
    const confirmedOrder = checkoutData.order as Order;

    // Update state synchronously for seamless UI transition
    setOrders((prev) => [confirmedOrder, ...prev]);
    clearCart();
    return confirmedOrder;
  };

  const trackOrder = async (orderId: string, email?: string): Promise<any> => {
    const cleanId = orderId.trim().toUpperCase();
    const cleanEmail = (email || '').trim().toLowerCase();

    try {
      const response = await fetch('/api/orders/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackingId: cleanId, email: cleanEmail }),
      });
      const data = await response.json();
      if (response.ok && data.success && data.order) {
        return data.order;
      }
    } catch (e) {
      console.error("Error looking up order from API:", e);
    }

    return undefined;
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        changeQty,
        clearCart,
        wishlist,
        toggleWishlist,
        promoDiscount,
        promoCodeApplied,
        promoDiscountAmount,
        quotedSubtotal,
        quotedItems,
        appliedPromotions,
        applyPromo,
        removePromo,
        orders,
        placeOrder,
        trackOrder,
        isLoaded,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
