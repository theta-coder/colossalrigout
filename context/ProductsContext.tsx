'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { catalog, Product } from '../lib/products';
import { auth } from '../lib/firebase';

interface ProductsContextType {
  products: Product[];
  loading: boolean;
  refreshProducts: () => Promise<void>;
  addProduct: (newProd: Omit<Product, 'id'>) => Promise<Product>;
  updateProduct: (updatedProd: Product) => Promise<void>;
  deleteProduct: (id: number) => Promise<void>;
  resetProducts: () => Promise<void>;
}

const ProductsContext = createContext<ProductsContextType | undefined>(undefined);

export function ProductsProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products');
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.statusText}`);
      }
      const data = await response.json();
      if (data.products) {
        setProducts(data.products);
      } else {
        setProducts([]);
      }
    } catch (e) {
      console.error("Error fetching products from API, using static fallback catalog:", e);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const addProduct = async (newProd: Omit<Product, 'id'>): Promise<Product> => {
    // Generate a new unique numeric ID
    const numericIds = products.map((p) => Number(p.id)).filter(Number.isFinite);
    const nextId = numericIds.length > 0 ? Math.max(...numericIds) + 1 : 1;
    const productWithId: Product = {
      ...newProd,
      id: nextId,
    };

    const token = await auth.currentUser?.getIdToken();
    const isLocalDemo = localStorage.getItem('cr_admin_session') === 'demo';
    const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(isLocalDemo ? { 'x-admin-demo': '1' } : {}) },
        body: JSON.stringify({ product: productWithId }),
      });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || `Failed to create product: ${response.statusText}`);
    const saved = payload.product || productWithId;
    setProducts((prev) => [...prev, saved]);
    return saved;
  };

  const updateProduct = async (updatedProd: Product): Promise<void> => {
    const token = await auth.currentUser?.getIdToken();
    const isLocalDemo = localStorage.getItem('cr_admin_session') === 'demo';
    const response = await fetch('/api/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(isLocalDemo ? { 'x-admin-demo': '1' } : {}) },
        body: JSON.stringify({ product: updatedProd }),
      });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || `Failed to update product: ${response.statusText}`);
    const saved = payload.product || updatedProd;
    setProducts((prev) =>
      prev.map((p) => (String(p.id) === String(updatedProd.id) ? saved : p))
    );
  };

  const deleteProduct = async (id: number): Promise<void> => {
    const token = await auth.currentUser?.getIdToken();
    const isLocalDemo = localStorage.getItem('cr_admin_session') === 'demo';
    const response = await fetch(`/api/products?id=${encodeURIComponent(String(id))}`, {
        method: 'DELETE',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(isLocalDemo ? { 'x-admin-demo': '1' } : {}) },
      });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || `Failed to delete product: ${response.statusText}`);
    setProducts((prev) => prev.filter((p) => String(p.id) !== String(id)));
  };

  const resetProducts = async (): Promise<void> => {
    setLoading(true);
    try {
      // Delete current products from API first
      for (const p of products) {
        await fetch(`/api/products?id=${p.id}`, {
          method: 'DELETE',
        });
      }

      setProducts([]);
    } catch (e) {
      console.error("Error resetting products in Firestore via API:", e);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProductsContext.Provider
      value={{
        products,
        loading,
        refreshProducts: fetchProducts,
        addProduct,
        updateProduct,
        deleteProduct,
        resetProducts,
      }}
    >
      {children}
    </ProductsContext.Provider>
  );
}

export function useProducts() {
  const context = useContext(ProductsContext);
  if (!context) {
    throw new Error('useProducts must be used within a ProductsProvider');
  }
  return context;
}
