'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { catalog, Product } from '../lib/products';

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
    const nextId = products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1;
    const productWithId: Product = {
      ...newProd,
      id: nextId,
    };

    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product: productWithId }),
      });
      if (!response.ok) {
        throw new Error(`Failed to create product via API: ${response.statusText}`);
      }
    } catch (e) {
      console.error("Error adding product via API:", e);
    }

    // Update state optimistically
    setProducts((prev) => [...prev, productWithId]);
    return productWithId;
  };

  const updateProduct = async (updatedProd: Product): Promise<void> => {
    try {
      const response = await fetch('/api/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product: updatedProd }),
      });
      if (!response.ok) {
        throw new Error(`Failed to update product via API: ${response.statusText}`);
      }
    } catch (e) {
      console.error("Error updating product via API:", e);
    }

    // Update state optimistically
    setProducts((prev) =>
      prev.map((p) => (p.id === updatedProd.id ? updatedProd : p))
    );
  };

  const deleteProduct = async (id: number): Promise<void> => {
    try {
      const response = await fetch(`/api/products?id=${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error(`Failed to delete product via API: ${response.statusText}`);
      }
    } catch (e) {
      console.error("Error deleting product via API:", e);
    }

    // Update state optimistically
    setProducts((prev) => prev.filter((p) => p.id !== id));
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
