'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, setDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

export interface CartItem {
  id: number;
  name: string;
  size: string;
  color: string;
  price: number;
  qty: number;
  img: string;
  variantId?: string;
}

export interface Order {
  orderId: string;
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
  applyPromo: (code: string) => Promise<{ success: boolean; message: string }>;
  orders: Order[];
  placeOrder: (
    shippingInfo: { name: string; address: string; city: string; phone: string; email: string },
    shipCost: number,
    payMethod: string
  ) => Promise<Order>;
  trackOrder: (orderId: string) => Promise<Order | undefined>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<number[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [promoCodeApplied, setPromoCodeApplied] = useState('');
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
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex].qty += newItem.qty || 1;
        return updated;
      }
      return [...prev, { ...newItem, qty: newItem.qty || 1 }];
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
      return prev
        .map((item) => {
          if (item.id === id && item.size === size && item.color === color) {
            const nextQty = item.qty + delta;
            return { ...item, qty: nextQty < 1 ? 1 : nextQty };
          }
          return item;
        });
    });
  };

  const clearCart = () => {
    setCart([]);
    setPromoDiscount(0);
    setPromoCodeApplied('');
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
        const applyRes = await fetch('/api/promotions/apply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({
            items: cart,
            couponCode: promoCodeApplied || null,
            userId: auth.currentUser?.uid || ''
          })
        });
        const applyData = await applyRes.json();

        if (applyData.success && applyData.discountAmount > 0) {
          const subtotal = cart.reduce((acc, item) => acc + item.price * item.qty, 0);
          const computedDiscount = applyData.discountAmount;
          const discountPct = subtotal > 0 ? computedDiscount / subtotal : 0;
          setPromoDiscount(discountPct);
        } else {
          setPromoDiscount(0);
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
        const applyRes = await fetch('/api/promotions/apply', {
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
          const computedDiscount = applyData.discountAmount;
          const discountPct = subtotal > 0 ? computedDiscount / subtotal : 0;

          setPromoDiscount(discountPct);
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

    const uid = auth.currentUser?.uid || null;

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

  const trackOrder = async (orderId: string): Promise<Order | undefined> => {
    const cleanId = orderId.trim().toUpperCase();
    
    // Check placed orders in state first
    const found = orders.find((o) => o.orderId === cleanId);
    if (found) return found;

    // Check Firestore
    try {
      const docSnap = await getDoc(doc(db, 'orders', cleanId));
      if (docSnap.exists()) {
        return docSnap.data() as Order;
      }
    } catch (e) {
      console.error("Error looking up order from Firestore:", e);
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
        applyPromo,
        orders,
        placeOrder,
        trackOrder,
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
