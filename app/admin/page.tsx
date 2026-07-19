'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { useProducts } from '../../context/ProductsContext';
import { Product } from '../../lib/products';
import CommerceAdminModule from '../../components/admin/CommerceAdminModule';
import {
  LayoutDashboard,
  Package,
  PlusCircle,
  ShoppingBag,
  LogOut,
  Search,
  Filter,
  Trash2,
  Edit2,
  CheckCircle,
  RefreshCw,
  TrendingUp,
  DollarSign,
  Truck,
  Users,
  AlertCircle,
  Plus,
  X,
  FileText,
  Ticket,
  LayoutTemplate,
  Grid,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  Tag,
  Layers,
  Image as ImageIcon,
  Upload,
  Palette,
  Ruler,
  Layers3,
  Star,
  Boxes
} from 'lucide-react';
import { ShopCategory } from '../../lib/category';

interface HeroSlide {
  id: string;
  image: string;
  imagePath?: string;
  title: string;
  subtitle: string;
  btn1Text: string;
  btn1Link: string;
  btn2Text?: string;
  btn2Link?: string;
  order: number;
}

interface OrderItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  size: string;
  color: string;
  img: string;
}

interface Order {
  id: string;
  customerEmail: string;
  customerName: string;
  customerPhone?: string;
  shippingAddress: string;
  shippingCity: string;
  shippingPostalCode: string;
  items: OrderItem[];
  subtotal: number;
  shippingCost: number;
  promoApplied?: string;
  promoDiscount?: number;
  total: number;
  status: 'Placed' | 'Processed' | 'Shipped' | 'Out for Delivery' | 'Delivered';
  createdAt: any;
}

interface Promo {
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  minOrder: number;
  status: 'Active' | 'Inactive';
}

const colorClasses: Record<string, string> = {
  Black: 'bg-black',
  Stone: 'bg-stone-300 border border-neutral-300',
  Navy: 'bg-blue-900',
  Blue: 'bg-blue-600',
  White: 'bg-white border border-neutral-300',
  Grey: 'bg-neutral-500',
  Amber: 'bg-amber-800',
};

const defaultColors = ['Black', 'Stone', 'Navy', 'Blue', 'White', 'Grey', 'Amber'];
const defaultSizes = ['S', 'M', 'L', 'XL'];

function generateSlideId() {
  return `slide-${Date.now()}`;
}

async function optimizeCategoryImage(file: File): Promise<string> {
  const source = await createImageBitmap(file);
  const maxSize = 640;
  const scale = Math.min(1, maxSize / Math.max(source.width, source.height));
  const width = Math.max(1, Math.round(source.width * scale));
  const height = Math.max(1, Math.round(source.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) {
    source.close();
    throw new Error('Your browser could not prepare this image.');
  }
  context.drawImage(source, 0, 0, width, height);
  source.close();
  return canvas.toDataURL('image/webp', 0.78);
}

async function optimizeHeroImage(file: File): Promise<string> {
  const source = await createImageBitmap(file);
  const maxWidth = 1400;
  const maxHeight = 1000;
  const scale = Math.min(1, maxWidth / source.width, maxHeight / source.height);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(source.width * scale));
  canvas.height = Math.max(1, Math.round(source.height * scale));
  const context = canvas.getContext('2d');
  if (!context) {
    source.close();
    throw new Error('Your browser could not prepare this hero image.');
  }
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  source.close();
  const dataUrl = canvas.toDataURL('image/webp', 0.72);
  if (dataUrl.length > 750_000) {
    throw new Error('The optimized image is still too large. Please choose a simpler or smaller image.');
  }
  return dataUrl;
}

async function optimizeProductImage(file: File): Promise<string> {
  const source = await createImageBitmap(file);
  const scale = Math.min(1, 1000 / Math.max(source.width, source.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(source.width * scale));
  canvas.height = Math.max(1, Math.round(source.height * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Unable to process product image.');
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  source.close();
  const dataUrl = canvas.toDataURL('image/webp', 0.72);
  if (dataUrl.length > 750_000) throw new Error('Optimized product image is too large.');
  return dataUrl;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const { products, loading: productsLoading, addProduct, updateProduct, deleteProduct, resetProducts } = useProducts();
  
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'add-product' | 'orders' | 'promos' | 'hero' | 'categories' | 'colors' | 'sizes' | 'size-guides' | 'collections' | 'reviews' | 'inventory'>('overview');
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);

  // Shop Categories Management State
  const [categoriesList, setCategoriesList] = useState<ShopCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [editingCategory, setEditingCategory] = useState<ShopCategory | null>(null);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [categoryForm, setCategoryForm] = useState<{
    id: string;
    name: string;
    slug: string;
    imagePath: string;
    imageUrl: string;
    order: number;
    active: boolean;
    style: 'image' | 'sale';
  }>({
    id: '',
    name: '',
    slug: '',
    imagePath: '',
    imageUrl: '',
    order: 1,
    active: true,
    style: 'image'
  });

  const [categoryImageFile, setCategoryImageFile] = useState<File | null>(null);
  const [categoryImagePreview, setCategoryImagePreview] = useState<string>('');
  const [imageUploading, setImageUploading] = useState(false);

  const handleCategoryImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      triggerToast("File is too large. Max size is 5MB.", "error");
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      triggerToast("Only JPG, PNG and WebP formats are allowed.", "error");
      return;
    }

    setCategoryImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setCategoryImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Derived active product categories for dropdown selection (excluding promotional sale cards)
  const activeProductCategories = React.useMemo(() => {
    return categoriesList.filter(c => c.active && c.style !== 'sale');
  }, [categoriesList]);

  // Hero Carousel Management State
  const [heroSlidesList, setHeroSlidesList] = useState<HeroSlide[]>([]);
  const [heroLoading, setHeroLoading] = useState(true);
  const [editingHeroSlide, setEditingHeroSlide] = useState<HeroSlide | null>(null);
  const [heroSelectedFile, setHeroSelectedFile] = useState<File | null>(null);
  const [heroPreviewUrl, setHeroPreviewUrl] = useState<string>('');
  const [heroForm, setHeroForm] = useState({
    title: '',
    subtitle: '',
    btn1Text: 'SHOP NOW',
    btn1Link: '/shop',
    btn2Text: '',
    btn2Link: '',
    order: 0
  });

  // Search & Filter state for Inventory
  const [invSearch, setInvSearch] = useState('');
  const [invCategory, setInvCategory] = useState('All');

  // Orders State
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [orderFilter, setOrderFilter] = useState<'All' | 'Placed' | 'Processed' | 'Shipped' | 'Delivered'>('All');

  // Promos State
  const [promos, setPromos] = useState<Promo[]>([]);
  const [promosLoading, setPromosLoading] = useState(true);
  const [promoForm, setPromoForm] = useState({
    code: '',
    type: 'percentage' as 'percentage' | 'fixed',
    value: '',
    minOrder: '',
    status: 'Active' as 'Active' | 'Inactive'
  });

  // Add Product Form State
  const [prodForm, setProdForm] = useState({
    name: '',
    price: '',
    discountPrice: '',
    cat: '',
    img: '',
    images: [] as string[],
    colors: [] as string[],
    sizes: [] as string[],
    description: '',
    collections: [] as string[],
    isBestseller: false,
    sizeGuideId: ''
  });
  const [commerceColors, setCommerceColors] = useState<any[]>([]);
  const [commerceSizes, setCommerceSizes] = useState<any[]>([]);
  const [commerceCollections, setCommerceCollections] = useState<any[]>([]);
  const [commerceSizeGuides, setCommerceSizeGuides] = useState<any[]>([]);
  const [variantStocks, setVariantStocks] = useState<Record<string, number>>({});

  const fetchCommerceLibraries = async () => {
    const resources = ['colors', 'sizes', 'collections', 'size-guides'];
    const results = await Promise.all(resources.map(resource => fetch(`/api/commerce/${resource}`).then(response => response.json())));
    setCommerceColors((results[0].data || []).filter((item: any) => item.active !== false));
    setCommerceSizes((results[1].data || []).filter((item: any) => item.active !== false));
    setCommerceCollections((results[2].data || []).filter((item: any) => item.active !== false));
    setCommerceSizeGuides((results[3].data || []).filter((item: any) => item.active !== false));
  };

  // Edit Mode state
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Auto-set default product category when active categories load or change
  useEffect(() => {
    if (activeProductCategories.length > 0 && !editingProduct) {
      if (!prodForm.cat || !activeProductCategories.some(c => c.slug === prodForm.cat)) {
        setProdForm(prev => ({ ...prev, cat: activeProductCategories[0].slug }));
      }
    }
  }, [activeProductCategories, editingProduct]);

  const [newSecImg, setNewSecImg] = useState('');
  const [newCollection, setNewCollection] = useState('');

  // Feedback messages
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const triggerToast = (msg: string, type: 'success' | 'error' = 'success') => {
    if (type === 'success') {
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(null), 4000);
    } else {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(null), 4000);
    }
  };

  // Authentication check
  useEffect(() => {
    const checkAuth = async () => {
      const adminSession = localStorage.getItem('cr_admin_session');
      
      if (adminSession === 'demo') {
        setIsAdmin(true);
        setIsDemoMode(true);
        setLoading(false);
        return;
      }

      if (adminSession === 'true') {
        const user = auth.currentUser;
        if (user) {
          setIsAdmin(true);
          setLoading(false);
          return;
        }
      }

      // Fallback
      router.push('/admin/login');
    };

    checkAuth();
  }, [router]);

  // Load orders from Firestore (or seed mock ones if empty)
  const fetchOrders = async () => {
    setOrdersLoading(true);
    try {
      const colRef = collection(db, 'orders');
      const snapshot = await getDocs(colRef);
      
      if (snapshot.empty) {
        console.log("No orders found in Firestore. Seeding admin mock orders...");
        // Let's create some beautiful demo orders for the admin to manage!
        const demoOrders: Order[] = [
          {
            id: 'CR-9082',
            customerName: 'Danish Khan',
            customerEmail: 'who1sdanish011@gmail.com',
            customerPhone: '+92 312 3456789',
            shippingAddress: 'House 42, Block D, Model Town',
            shippingCity: 'Lahore',
            shippingPostalCode: '54700',
            items: [
              {
                id: 1,
                name: 'Premium Silk Resort Shirt',
                price: 45.00,
                quantity: 1,
                size: 'L',
                color: 'Navy',
                img: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=600&q=80'
              },
              {
                id: 3,
                name: 'Pleated Smart Trousers',
                price: 52.00,
                quantity: 1,
                size: '32',
                color: 'Stone',
                img: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&w=600&q=80'
              }
            ],
            subtotal: 97.00,
            shippingCost: 5.00,
            promoApplied: 'WELCOME10',
            promoDiscount: 9.70,
            total: 92.30,
            status: 'Placed',
            createdAt: '2026-07-18T06:14:42.000Z' // 2 hours ago
          },
          {
            id: 'CR-8941',
            customerName: 'Amna Ahmed',
            customerEmail: 'amna.ahmed@example.com',
            shippingAddress: 'Apartment 4B, Giga Heights, Clifton',
            shippingCity: 'Karachi',
            shippingPostalCode: '75600',
            items: [
              {
                id: 11,
                name: 'Oversized Waffle T-Shirt',
                price: 28.00,
                quantity: 2,
                size: 'M',
                color: 'Black',
                img: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=600&q=80'
              }
            ],
            subtotal: 56.00,
            shippingCost: 5.00,
            total: 61.00,
            status: 'Processed',
            createdAt: '2026-07-17T08:14:42.000Z' // 24 hours ago
          },
          {
            id: 'CR-8822',
            customerName: 'Zainab Fatima',
            customerEmail: 'zainab@example.com',
            shippingAddress: 'Villa 18, Street 5, Phase 6 DHA',
            shippingCity: 'Islamabad',
            shippingPostalCode: '44000',
            items: [
              {
                id: 14,
                name: 'Kids Smart Collar Shirt',
                price: 24.00,
                quantity: 1,
                size: 'S',
                color: 'Stone',
                img: 'https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?auto=format&fit=crop&w=600&q=80'
              }
            ],
            subtotal: 24.00,
            shippingCost: 0.00,
            total: 24.00,
            status: 'Shipped',
            createdAt: '2026-07-16T08:14:42.000Z' // 2 days ago
          }
        ];

        // Seed them to Firestore as well!
        for (const o of demoOrders) {
          await setDoc(doc(db, 'orders', o.id), o);
        }
        setOrders(demoOrders);
      } else {
        const loaded: Order[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const customer = data.customer || {};
          
          // Determine friendly string status based on either raw 'status' or numeric 'statusIndex' from checkouts
          let computedStatus: Order['status'] = data.status || 'Placed';
          if (!data.status && typeof data.statusIndex === 'number') {
            const index = data.statusIndex;
            computedStatus = 
              index === 0 ? 'Placed' :
              index === 1 ? 'Processed' :
              index === 2 ? 'Shipped' :
              index === 3 ? 'Out for Delivery' :
              index === 4 ? 'Delivered' : 'Placed';
          }

          loaded.push({
            id: docSnap.id,
            customerName: data.customerName || customer.name || 'Guest Customer',
            customerEmail: data.customerEmail || customer.email || 'guest@example.com',
            customerPhone: data.customerPhone || customer.phone || '',
            shippingAddress: data.shippingAddress || customer.address || 'Standard Address',
            shippingCity: data.shippingCity || customer.city || 'Standard City',
            shippingPostalCode: data.shippingPostalCode || customer.postalCode || '00000',
            items: data.items || [],
            subtotal: data.subtotal || data.total || 0,
            shippingCost: data.shippingCost || 0,
            promoApplied: data.promoApplied || '',
            promoDiscount: data.promoDiscount || 0,
            total: data.total || 0,
            status: computedStatus,
            createdAt: data.createdAt || new Date().toISOString()
          } as Order);
        });

        // Sort orders by date/id
        loaded.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        });

        setOrders(loaded);
      }
    } catch (e) {
      console.error("Error fetching orders from Firestore, using offline fallback:", e);
      // Fallback local list
    } finally {
      setOrdersLoading(false);
    }
  };

  // Load Promos from API
  const fetchPromos = async () => {
    setPromosLoading(true);
    try {
      const response = await fetch('/api/promos');
      if (!response.ok) {
        throw new Error("Failed to fetch promos");
      }
      const data = await response.json();
      if (data.promos) {
        setPromos(data.promos);
      }
    } catch (e) {
      console.error("Error fetching promos:", e);
    } finally {
      setPromosLoading(false);
    }
  };

  const handleCreatePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoForm.code || !promoForm.value) {
      triggerToast("Please provide promo code and discount value.", "error");
      return;
    }
    setActionLoading(true);
    try {
      const codeUpper = promoForm.code.toUpperCase().replace(/\s+/g, '');
      const formattedPromo = {
        code: codeUpper,
        type: promoForm.type,
        value: Number(promoForm.value),
        minOrder: Number(promoForm.minOrder || 0),
        status: promoForm.status
      };

      const response = await fetch('/api/promos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promo: formattedPromo })
      });

      if (!response.ok) {
        throw new Error("Failed to create promo");
      }

      triggerToast(`Promo code "${codeUpper}" created successfully!`);
      setPromoForm({
        code: '',
        type: 'percentage',
        value: '',
        minOrder: '',
        status: 'Active'
      });
      fetchPromos();
    } catch (err) {
      console.error(err);
      triggerToast("Failed to create promo code.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeletePromo = async (code: string) => {
    if (!confirm(`Are you sure you want to delete promo code "${code}"?`)) {
      return;
    }
    try {
      const response = await fetch(`/api/promos?code=${code}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        throw new Error("Failed to delete promo");
      }
      triggerToast(`Promo code "${code}" deleted successfully.`);
      fetchPromos();
    } catch (err) {
      console.error(err);
      triggerToast("Failed to delete promo code.", "error");
    }
  };

  // FETCH HERO SLIDES
  const fetchHeroSlides = async () => {
    setHeroLoading(true);
    try {
      const res = await fetch('/api/hero');
      const data = await res.json();
      if (data.slides && Array.isArray(data.slides)) {
        setHeroSlidesList(data.slides);
      } else {
        setHeroSlidesList([]);
      }
    } catch (err) {
      console.error("Error fetching hero slides: ", err);
      triggerToast("Failed to fetch custom hero slides from server.", "error");
    } finally {
      setActionLoading(false);
      setHeroLoading(false);
    }
  };

  // CREATE OR UPDATE HERO SLIDE
  const handleCreateOrUpdateHeroSlide = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingHeroSlide && !heroSelectedFile) {
      triggerToast("Please select an image file for the new hero slide.", "error");
      return;
    }
    if (!heroForm.title.trim() || !heroForm.subtitle.trim()) {
      triggerToast("Please provide slide title and subtitle.", "error");
      return;
    }

    setActionLoading(true);
    try {
      const formData = new FormData();
      if (editingHeroSlide) {
        formData.append('id', editingHeroSlide.id);
      }
      formData.append('title', heroForm.title);
      formData.append('subtitle', heroForm.subtitle);
      formData.append('btn1Text', heroForm.btn1Text || 'SHOP NOW');
      formData.append('btn1Link', heroForm.btn1Link || '/shop');
      formData.append('btn2Text', heroForm.btn2Text || '');
      formData.append('btn2Link', heroForm.btn2Link || '');
      formData.append('order', String(heroForm.order || 0));

      if (heroSelectedFile) {
        formData.append('imageData', await optimizeHeroImage(heroSelectedFile));
      }

      const res = await fetch('/api/hero', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to save hero slide");
      }

      triggerToast(editingHeroSlide ? "Hero slide updated successfully!" : "New hero slide added successfully!");
      setEditingHeroSlide(null);
      setHeroSelectedFile(null);
      setHeroPreviewUrl('');
      setHeroForm({
        title: '',
        subtitle: '',
        btn1Text: 'SHOP NOW',
        btn1Link: '/shop',
        btn2Text: '',
        btn2Link: '',
        order: 0
      });
      fetchHeroSlides();
    } catch (err: any) {
      console.error(err);
      triggerToast(err.message || "Failed to save hero slide.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // DELETE HERO SLIDE
  const handleDeleteHeroSlide = async (id: string) => {
    if (!confirm("Are you sure you want to delete this hero slide?")) {
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(`/api/hero?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to delete slide");
      }
      triggerToast("Hero slide deleted successfully!");
      fetchHeroSlides();
    } catch (err: any) {
      console.error(err);
      triggerToast(err.message || "Failed to delete hero slide.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // RESTORE DEFAULT HERO SLIDES
  const handleResetHeroSlides = async () => {
    if (!confirm("Are you sure you want to restore default slides? This will override your current custom carousel setup.")) {
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch('/api/hero?reset=true', {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to restore default slides");
      }
      triggerToast("Default hero slides restored successfully.");
      fetchHeroSlides();
    } catch (err: any) {
      console.error(err);
      triggerToast(err.message || "Failed to restore default hero slides.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // FETCH CATEGORIES
  const fetchCategories = async () => {
    setCategoriesLoading(true);
    try {
      const res = await fetch('/api/categories?all=true');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setCategoriesList(data.data);
      } else {
        triggerToast(data.message || "Failed to load categories.", "error");
      }
    } catch (err: any) {
      console.error("Error fetching categories:", err);
      triggerToast("Failed to fetch categories.", "error");
    } finally {
      setCategoriesLoading(false);
    }
  };

  // SAVE CATEGORY (CREATE / EDIT)
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryForm.name.trim()) {
      triggerToast("Category name is required.", "error");
      return;
    }

    setActionLoading(true);
    let finalImagePath = categoryForm.imagePath;
    let finalImageUrl = categoryForm.imageUrl;

    try {
      const generatedSlug = categoryForm.slug.trim() || categoryForm.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');

      if (categoryForm.style === 'image') {
        if (categoryImageFile) {
          try {
            setImageUploading(true);
            // Firebase Storage is not provisioned for this project. Store a compact,
            // optimized image in the Firestore category record instead of accepting URLs.
            finalImageUrl = await optimizeCategoryImage(categoryImageFile);
            finalImagePath = '';
          } catch (uploadErr: any) {
            console.error("Category image processing error:", uploadErr);
            triggerToast("Failed to process image: " + uploadErr.message, "error");
            setActionLoading(false);
            return;
          } finally {
            setImageUploading(false);
          }
        } else if (!editingCategory) {
          triggerToast("Please select a local image file for the category.", "error");
          setActionLoading(false);
          return;
        }
      }

      const payload = {
        category: {
          id: editingCategory ? editingCategory.id : (categoryForm.id || undefined),
          name: categoryForm.name.trim(),
          slug: generatedSlug,
          imagePath: finalImagePath,
          imageUrl: finalImageUrl,
          order: Number(categoryForm.order) || (categoriesList.length + 1),
          active: Boolean(categoryForm.active),
          style: categoryForm.style
        }
      };

      const method = editingCategory ? 'PUT' : 'POST';
      const res = await fetch('/api/categories', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || "Failed to save category");
      }

      triggerToast(data.message || (editingCategory ? "Category updated successfully!" : "Category created successfully!"));
      setShowCategoryForm(false);
      setEditingCategory(null);
      setCategoryForm({
        id: '',
        name: '',
        slug: '',
        imagePath: '',
        imageUrl: '',
        order: categoriesList.length + 1,
        active: true,
        style: 'image'
      });
      setCategoryImageFile(null);
      setCategoryImagePreview('');
      fetchCategories();
    } catch (err: any) {
      console.error(err);
      triggerToast(err.message || "Failed to save category.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // TOGGLE CATEGORY ACTIVE STATUS
  const handleToggleCategoryActive = async (category: ShopCategory) => {
    setActionLoading(true);
    try {
      const updated = { ...category, active: !category.active };
      const res = await fetch('/api/categories', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: updated })
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message);
      }
      triggerToast(`Category "${category.name}" set to ${updated.active ? 'Active' : 'Inactive'}`);
      fetchCategories();
    } catch (err: any) {
      console.error(err);
      triggerToast(err.message || "Failed to toggle status.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // DELETE CATEGORY
  const handleDeleteCategory = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete category "${name}"?`)) {
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(`/api/categories?id=${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message);
      }
      triggerToast(`Category "${name}" deleted successfully.`);
      fetchCategories();
    } catch (err: any) {
      console.error(err);
      triggerToast(err.message || "Failed to delete category.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // MOVE ORDER UP OR DOWN
  const handleMoveCategoryOrder = async (category: ShopCategory, direction: 'up' | 'down') => {
    const currentIndex = categoriesList.findIndex(c => c.id === category.id);
    if (currentIndex === -1) return;
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= categoriesList.length) return;

    const targetCategory = categoriesList[targetIndex];
    setActionLoading(true);
    try {
      const updatedCurr = { ...category, order: targetCategory.order };
      const updatedTarget = { ...targetCategory, order: category.order };

      await Promise.all([
        fetch('/api/categories', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ category: updatedCurr })
        }),
        fetch('/api/categories', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ category: updatedTarget })
        })
      ]);

      triggerToast("Category order updated!");
      fetchCategories();
    } catch (err: any) {
      console.error(err);
      triggerToast("Failed to re-order categories.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // SETUP EDIT CATEGORY
  const startEditCategory = (cat: ShopCategory) => {
    setEditingCategory(cat);
    setCategoryForm({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      imagePath: cat.imagePath || '',
      imageUrl: cat.imageUrl || '',
      order: cat.order || 1,
      active: cat.active !== undefined ? cat.active : true,
      style: cat.style || 'image'
    });
    setCategoryImageFile(null);
    setCategoryImagePreview(cat.imageUrl || '');
    setShowCategoryForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    if (isAdmin) {
      fetchOrders();
      fetchPromos();
      fetchHeroSlides();
      fetchCategories();
      fetchCommerceLibraries();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const handleSignOut = async () => {
    await auth.signOut();
    localStorage.removeItem('cr_admin_session');
    router.push('/admin/login');
  };

  // Create Product Submit Handler
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);

    if (!prodForm.name || !prodForm.price || prodForm.images.length === 0) {
      triggerToast("Please provide name, retail price, and at least one product image file.", "error");
      setActionLoading(false);
      return;
    }

    if (activeProductCategories.length === 0) {
      triggerToast("Please create and activate a shop category before adding products.", "error");
      setActionLoading(false);
      return;
    }

    try {
      const priceNum = parseFloat(prodForm.price);
      if (isNaN(priceNum)) {
        triggerToast("Price must be a valid number.", "error");
        setActionLoading(false);
        return;
      }

      const added = await addProduct({
        name: prodForm.name,
        price: priceNum,
        retailPrice: priceNum,
        discountPrice: prodForm.discountPrice ? Number(prodForm.discountPrice) : null,
        cat: prodForm.cat || activeProductCategories[0]?.slug || 'tops',
        img: prodForm.images[0],
        images: prodForm.images,
        colors: prodForm.colors,
        sizes: prodForm.sizes,
        description: prodForm.description || "Indulge in absolute luxury and impeccable tailoring with this premium piece from Colossal Rigout.",
        isBestseller: prodForm.isBestseller,
        collections: prodForm.collections,
        sizeGuideId: prodForm.sizeGuideId || null
      } as any);

      for (const colorId of prodForm.colors) {
        for (const sizeId of prodForm.sizes) {
          const key = `${colorId}_${sizeId}`;
          const stock = Number(variantStocks[key] || 0);
          await fetch('/api/commerce/inventory', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ record: { id: `${added.id}_${colorId}_${sizeId}`, productId: String(added.id), colorId, sizeId, sku: `${added.id}-${colorId}-${sizeId}`.toUpperCase(), stockOnHand: stock, reservedStock: 0, availableStock: stock, reorderLevel: 2, active: true } })
          });
        }
      }
      setVariantStocks({});

      triggerToast(`Successfully added dynamic product "${added.name}"!`);
      
      // Reset form
      setProdForm({
        name: '',
        price: '',
        discountPrice: '',
        cat: activeProductCategories[0]?.slug || '',
        img: '',
        images: [],
        colors: [],
        sizes: [],
        description: '',
        collections: [],
        isBestseller: false,
        sizeGuideId: ''
      });
      
      setActiveTab('products');
    } catch (err) {
      console.error("Error creating product:", err);
      triggerToast("Failed to create product. Check internet or security rules.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Edit Product setup
  const startEditProduct = (p: Product) => {
    setEditingProduct(p);
    setProdForm({
      name: p.name,
      price: String(p.retailPrice || p.price),
      discountPrice: p.discountPrice ? String(p.discountPrice) : '',
      cat: p.cat,
      img: p.img,
      images: p.images || [],
      colors: p.colors || [],
      sizes: p.sizes || [],
      description: p.description || '',
      collections: p.collections || [],
      isBestseller: p.isBestseller || false,
      sizeGuideId: p.sizeGuideId || ''
    });
    setActiveTab('add-product');
  };

  // Cancel edit mode
  const cancelEditProduct = () => {
    setEditingProduct(null);
    setProdForm({
      name: '',
      price: '',
      discountPrice: '',
      cat: activeProductCategories[0]?.slug || '',
      img: '',
      images: [],
      colors: [],
      sizes: [],
      description: '',
      collections: [],
      isBestseller: false,
      sizeGuideId: ''
    });
    setActiveTab('products');
  };

  // Handle Edit Save
  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    
    setActionLoading(true);

    try {
      const priceNum = parseFloat(prodForm.price);
      if (isNaN(priceNum)) {
        triggerToast("Price must be a valid number.", "error");
        setActionLoading(false);
        return;
      }

      await updateProduct({
        ...editingProduct,
        name: prodForm.name,
        price: priceNum,
        retailPrice: priceNum,
        discountPrice: prodForm.discountPrice ? Number(prodForm.discountPrice) : null,
        cat: prodForm.cat,
        img: prodForm.img,
        images: prodForm.images.length > 0 ? prodForm.images : [prodForm.img],
        colors: prodForm.colors,
        sizes: prodForm.sizes,
        description: prodForm.description,
        collections: prodForm.collections,
        isBestseller: prodForm.isBestseller,
        sizeGuideId: prodForm.sizeGuideId || null,
      });

      for (const colorId of prodForm.colors) {
        for (const sizeId of prodForm.sizes) {
          const key = `${colorId}_${sizeId}`;
          if (variantStocks[key] === undefined) continue;
          const stock = Number(variantStocks[key]);
          await fetch('/api/commerce/inventory', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ record: { id: `${editingProduct.id}_${colorId}_${sizeId}`, productId: String(editingProduct.id), colorId, sizeId, sku: `${editingProduct.id}-${colorId}-${sizeId}`.toUpperCase(), stockOnHand: stock, reservedStock: 0, availableStock: stock, reorderLevel: 2, active: true } })
          });
        }
      }

      triggerToast(`Product "${prodForm.name}" updated successfully!`);
      setEditingProduct(null);
      
      // Reset form
      setProdForm({
        name: '',
        price: '',
        discountPrice: '',
        cat: activeProductCategories[0]?.slug || '',
        img: '',
        images: [],
        colors: [],
        sizes: [],
        description: '',
        collections: [],
        isBestseller: false,
        sizeGuideId: ''
      });
      
      setActiveTab('products');
    } catch (err) {
      console.error("Error updating product:", err);
      triggerToast("Failed to update product. Try again.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Product Handler
  const handleDeleteProduct = async (id: number, name: string) => {
    if (!confirm(`Are you absolutely sure you want to delete "${name}" from the database?`)) {
      return;
    }

    try {
      await deleteProduct(id);
      triggerToast(`Successfully deleted "${name}" from catalog.`);
    } catch (e) {
      console.error(e);
      triggerToast("Error deleting product. Check internet/permissions.", "error");
    }
  };

  // Update Order Status Handler
  const handleUpdateOrderStatus = async (orderId: string, newStatus: Order['status']) => {
    setActionLoading(true);
    try {
      const docRef = doc(db, 'orders', orderId);
      
      // Compute statusIndex for customer track-order compatibility
      const statusIndex = 
        newStatus === 'Placed' ? 0 :
        newStatus === 'Processed' ? 1 :
        newStatus === 'Shipped' ? 2 :
        newStatus === 'Out for Delivery' ? 3 :
        newStatus === 'Delivered' ? 4 : 0;

      await updateDoc(docRef, { 
        status: newStatus,
        statusIndex: statusIndex
      });
      
      setOrders((prev) =>
        prev.map((ord) => (ord.id === orderId ? { ...ord, status: newStatus } : ord))
      );
      
      triggerToast(`Order ${orderId} marked as "${newStatus}"!`);
    } catch (err) {
      console.error("Error updating order status:", err);
      triggerToast("Failed to update order status.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Restore Default Seeding Handler
  const handleResetDatabase = async () => {
    if (!confirm("This will CLEAR all customized database products and restore the 19 default Colossal Rigout products. Proceed?")) {
      return;
    }
    setActionLoading(true);
    try {
      await resetProducts();
      triggerToast("Database seeded successfully! Original 19 items restored.");
      setActiveTab('products');
    } catch (e) {
      triggerToast("Seeding failed.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Helper toggle elements in list
  const toggleSelection = (listKey: 'colors' | 'sizes' | 'collections', item: string) => {
    setProdForm((prev) => {
      const current = prev[listKey] as string[];
      const exists = current.includes(item);
      const updated = exists ? current.filter((x) => x !== item) : [...current, item];
      return { ...prev, [listKey]: updated };
    });
  };

  // Inventory Filtering & Search
  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(invSearch.toLowerCase()) || 
                          p.cat.toLowerCase().includes(invSearch.toLowerCase()) || 
                          p.description?.toLowerCase().includes(invSearch.toLowerCase());
    const matchesCategory = invCategory === 'All' || p.cat === invCategory;
    return matchesSearch && matchesCategory;
  });

  // Order Filtering
  const filteredOrders = orders.filter((o) => {
    if (orderFilter === 'All') return true;
    return o.status === orderFilter;
  });

  // Calculate Overview Stats
  const stats = React.useMemo(() => {
    const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
    const totalOrdersCount = orders.length;
    const totalProductsCount = products.length;
    const pendingFulfill = orders.filter((o) => o.status === 'Placed' || o.status === 'Processed').length;
    
    return {
      revenue: totalRevenue,
      orders: totalOrdersCount,
      products: totalProductsCount,
      pending: pendingFulfill
    };
  }, [orders, products]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f4f4f3] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-sm text-neutral-500">Checking credentials...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f7f6] flex flex-col md:flex-row font-sans text-neutral-900">
      
      {/* SIDEBAR */}
      <aside className="w-full md:w-64 bg-black text-white shrink-0 flex flex-col border-r border-neutral-800">
        <div className="p-6 border-b border-neutral-800 flex items-center justify-between">
          <div>
            <h1 className="font-display font-extrabold text-sm tracking-widest text-white">COLOSSAL ADMIN</h1>
            <p className="text-[10px] text-amber-500 font-bold tracking-wider mt-0.5 uppercase">
              {isDemoMode ? '⚡ Sandbox Admin Mode' : '🔐 Fire-Auth Secured'}
            </p>
          </div>
          <div className="md:hidden">
            <button onClick={handleSignOut} className="text-neutral-400 hover:text-white">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          <button
            onClick={() => { setActiveTab('overview'); setEditingProduct(null); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-semibold uppercase tracking-wider transition ${
              activeTab === 'overview' ? 'bg-white text-black font-extrabold' : 'text-neutral-400 hover:bg-neutral-900 hover:text-white'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard Overview
          </button>

          <button
            onClick={() => { setActiveTab('products'); setEditingProduct(null); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-semibold uppercase tracking-wider transition ${
              activeTab === 'products' ? 'bg-white text-black font-extrabold' : 'text-neutral-400 hover:bg-neutral-900 hover:text-white'
            }`}
          >
            <Package className="w-4 h-4" />
            Manage Inventory
          </button>

          <button
            onClick={() => setActiveTab('add-product')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-semibold uppercase tracking-wider transition ${
              activeTab === 'add-product' ? 'bg-white text-black font-extrabold' : 'text-neutral-400 hover:bg-neutral-900 hover:text-white'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            {editingProduct ? 'Edit Selected Product' : 'Add New Product'}
          </button>

          <button
            onClick={() => { setActiveTab('orders'); setEditingProduct(null); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-semibold uppercase tracking-wider transition ${
              activeTab === 'orders' ? 'bg-white text-black font-extrabold' : 'text-neutral-400 hover:bg-neutral-900 hover:text-white'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            Order fulfillment
            {stats.pending > 0 && (
              <span className="ml-auto bg-amber-500 text-black text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0">
                {stats.pending}
              </span>
            )}
          </button>

          <button
            onClick={() => { setActiveTab('promos'); setEditingProduct(null); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-semibold uppercase tracking-wider transition ${
              activeTab === 'promos' ? 'bg-white text-black font-extrabold' : 'text-neutral-400 hover:bg-neutral-900 hover:text-white'
            }`}
          >
            <Ticket className="w-4 h-4" />
            Promo codes
          </button>

          <button
            onClick={() => { setActiveTab('hero'); setEditingProduct(null); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-semibold uppercase tracking-wider transition ${
              activeTab === 'hero' ? 'bg-white text-black font-extrabold' : 'text-neutral-400 hover:bg-neutral-900 hover:text-white'
            }`}
          >
            <LayoutTemplate className="w-4 h-4" />
            Hero Slides
          </button>

          <button
            onClick={() => { setActiveTab('categories'); setEditingProduct(null); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-semibold uppercase tracking-wider transition ${
              activeTab === 'categories' ? 'bg-white text-black font-extrabold' : 'text-neutral-400 hover:bg-neutral-900 hover:text-white'
            }`}
          >
            <Grid className="w-4 h-4" />
            Shop Categories
          </button>

          {([
            ['colors', 'Color Library', Palette],
            ['sizes', 'Sizes', Ruler],
            ['size-guides', 'Size Guides', Ruler],
            ['collections', 'Collections', Layers3],
            ['reviews', 'Reviews', Star],
            ['inventory', 'Stock Inventory', Boxes],
          ] as const).map(([tab, label, Icon]) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setEditingProduct(null); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-semibold uppercase tracking-wider transition ${
                activeTab === tab ? 'bg-white text-black font-extrabold' : 'text-neutral-400 hover:bg-neutral-900 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-neutral-800 hidden md:block">
          <div className="flex items-center gap-3 bg-neutral-950 p-3.5 rounded-xl border border-neutral-800 mb-4">
            <div className="w-7 h-7 rounded-full bg-neutral-800 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
              AD
            </div>
            <div className="overflow-hidden">
              <p className="text-[11px] font-bold text-neutral-200 truncate leading-none">Danish Khan</p>
              <p className="text-[9px] text-neutral-500 truncate mt-0.5">Primary Administrator</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-neutral-800 text-neutral-400 hover:text-white hover:bg-red-950/20 hover:border-red-900/45 text-xs font-bold uppercase transition"
          >
            <LogOut className="w-3.5 h-3.5" /> Sign Out Session
          </button>
        </div>
      </aside>

      {/* MAIN LAYOUT CONTENT */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        
        {/* TOAST SYSTEM */}
        {successMsg && (
          <div className="fixed top-4 right-4 z-50 bg-black text-white text-xs font-bold px-4 py-3 rounded-lg shadow-xl flex items-center gap-2 border border-neutral-800 animate-slide-in">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            {successMsg}
          </div>
        )}
        {errorMsg && (
          <div className="fixed top-4 right-4 z-50 bg-red-600 text-white text-xs font-bold px-4 py-3 rounded-lg shadow-xl flex items-center gap-2 animate-slide-in">
            <AlertCircle className="w-4 h-4" />
            {errorMsg}
          </div>
        )}

        {/* HEADER BAR */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-neutral-200 pb-5 mb-6 gap-3">
          <div>
            <h2 className="font-display font-extrabold text-2xl uppercase tracking-tight">
              {activeTab === 'overview' && 'Dashboard Overview'}
              {activeTab === 'products' && 'Inventory Catalog'}
              {activeTab === 'add-product' && (editingProduct ? 'Modify Product Specifications' : 'Add Brand New Product')}
              {activeTab === 'orders' && 'Fulfillment Hub'}
              {activeTab === 'promos' && 'Promotions & Coupons'}
              {activeTab === 'hero' && 'Homepage Carousel Management'}
              {activeTab === 'categories' && 'Shop Categories Management'}
              {activeTab === 'colors' && 'Color Library'}
              {activeTab === 'sizes' && 'Size Library'}
              {activeTab === 'size-guides' && 'Dynamic Size Guides'}
              {activeTab === 'collections' && 'Collections Management'}
              {activeTab === 'reviews' && 'Review Moderation'}
              {activeTab === 'inventory' && 'Stock Inventory'}
            </h2>
            <p className="text-xs text-neutral-500 mt-1">
              {activeTab === 'overview' && 'Real-time sales telemetry, shop parameters, and incoming logs'}
              {activeTab === 'products' && `Viewing ${filteredProducts.length} dynamic items within the inventory`}
              {activeTab === 'add-product' && 'Define metadata, pricing, image URLs, sizes, and collection tags'}
              {activeTab === 'orders' && `Manage, fulfill, and check status for ${filteredOrders.length} customer order requests`}
              {activeTab === 'promos' && `Manage, create, and inspect active customer checkout discount codes`}
              {activeTab === 'hero' && 'Customize, sequence, and manage background banners, CTA buttons, and promo slides'}
              {activeTab === 'categories' && `Create, edit, sequence, and control visibility for ${categoriesList.length} shop categories`}
              {activeTab === 'colors' && 'Create reusable named and HEX color swatches for products'}
              {activeTab === 'sizes' && 'Manage reusable clothing, shoe, kids, accessory, and custom sizes'}
              {activeTab === 'size-guides' && 'Manage reusable measurement guides for product pages'}
              {activeTab === 'collections' && 'Manage storefront collections and product associations'}
              {activeTab === 'reviews' && 'Approve or reject customer product reviews'}
              {activeTab === 'inventory' && 'Manage stock independently for every product color and size variant'}
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleResetDatabase}
              disabled={actionLoading}
              className="flex items-center gap-2 bg-white border border-neutral-300 text-neutral-800 hover:bg-neutral-100 transition px-4.5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider"
              title="Reset Firestore products catalog back to default 19 standard products"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${actionLoading ? 'animate-spin' : ''}`} />
              Reset Seeding
            </button>
          </div>
        </header>

        {/* 1. TAB: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-8 animate-fade-up">
            {/* STATS TILES */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border border-neutral-200/65 p-5 rounded-xl shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Gross Sales</p>
                  <p className="font-display font-extrabold text-2xl tracking-tight mt-1">${stats.revenue.toFixed(2)}</p>
                  <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-1 mt-1.5">
                    <TrendingUp className="w-3 h-3" /> +14.5% this week
                  </span>
                </div>
                <div className="w-12 h-12 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-800">
                  <DollarSign className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white border border-neutral-200/65 p-5 rounded-xl shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Volume Placed</p>
                  <p className="font-display font-extrabold text-2xl tracking-tight mt-1">{stats.orders} Orders</p>
                  <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-1 mt-1.5">
                    <TrendingUp className="w-3 h-3" /> +28% month-over-month
                  </span>
                </div>
                <div className="w-12 h-12 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-800">
                  <ShoppingBag className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white border border-neutral-200/65 p-5 rounded-xl shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Active Inventory</p>
                  <p className="font-display font-extrabold text-2xl tracking-tight mt-1">{stats.products} SKUs</p>
                  <span className="text-[10px] text-neutral-400 font-semibold flex items-center gap-1 mt-1.5">
                    Fully dynamic Firestore
                  </span>
                </div>
                <div className="w-12 h-12 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-800">
                  <Package className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white border border-neutral-200/65 p-5 rounded-xl shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Fulfillment Queue</p>
                  <p className="font-display font-extrabold text-2xl tracking-tight mt-1 text-amber-600">{stats.pending} Pending</p>
                  <span className="text-[10px] text-amber-500 font-bold flex items-center gap-1 mt-1.5">
                    Needs prompt processing
                  </span>
                </div>
                <div className="w-12 h-12 rounded-lg bg-amber-50 flex items-center justify-center text-amber-700">
                  <Truck className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* RECENT ORDERS CAROUSEL / TABLE */}
            <div className="bg-white border border-neutral-200/65 rounded-xl shadow-sm overflow-hidden">
              <div className="p-5 border-b border-neutral-200 flex items-center justify-between">
                <h3 className="font-display font-extrabold text-sm tracking-widest uppercase">Incoming Orders Pipeline</h3>
                <button
                  onClick={() => setActiveTab('orders')}
                  className="text-neutral-500 hover:text-black font-bold text-xs uppercase flex items-center gap-1 transition"
                >
                  View All Orders <FileText className="w-3.5 h-3.5" />
                </button>
              </div>

              {ordersLoading ? (
                <div className="text-center py-10 text-neutral-400">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-black mx-auto mb-2"></div>
                  <p className="text-xs">Streaming orders pipeline...</p>
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-12 text-neutral-500 text-sm">
                  No orders logged yet. Wait for customer checkout actions.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="bg-[#fcfcfb] border-b border-neutral-200 text-neutral-400 text-[10px] font-extrabold uppercase tracking-widest">
                        <th className="py-3 px-5">ID</th>
                        <th className="py-3 px-5">Customer</th>
                        <th className="py-3 px-5">City</th>
                        <th className="py-3 px-5">Items count</th>
                        <th className="py-3 px-5">Total Invoice</th>
                        <th className="py-3 px-5">Status</th>
                        <th className="py-3 px-5 text-right">Fulfillment</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 text-xs">
                      {orders.slice(0, 5).map((o) => (
                        <tr key={o.id} className="hover:bg-neutral-50/50 transition">
                          <td className="py-3.5 px-5 font-bold">{o.id}</td>
                          <td className="py-3.5 px-5">
                            <p className="font-semibold text-neutral-900">{o.customerName}</p>
                            <p className="text-[10px] text-neutral-500">{o.customerEmail}</p>
                          </td>
                          <td className="py-3.5 px-5 text-neutral-600 font-medium">{o.shippingCity}</td>
                          <td className="py-3.5 px-5 text-neutral-500 font-semibold">
                            {o.items?.reduce((sum, item) => sum + item.quantity, 0)} item(s)
                          </td>
                          <td className="py-3.5 px-5 font-bold text-neutral-900">${o.total?.toFixed(2)}</td>
                          <td className="py-3.5 px-5">
                            <span className={`inline-flex px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                              o.status === 'Placed' ? 'bg-blue-50 text-blue-600 border border-blue-200' :
                              o.status === 'Processed' ? 'bg-purple-50 text-purple-600 border border-purple-200' :
                              o.status === 'Shipped' ? 'bg-amber-50 text-amber-600 border border-amber-200' :
                              o.status === 'Out for Delivery' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {o.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-5 text-right whitespace-nowrap">
                            <select
                              value={o.status}
                              onChange={(e) => handleUpdateOrderStatus(o.id, e.target.value as any)}
                              className="text-[10px] font-bold bg-[#fbfbfb] border border-neutral-300 rounded px-2.5 py-1.5 focus:border-black outline-none transition cursor-pointer"
                            >
                              <option value="Placed">Mark Placed</option>
                              <option value="Processed">Mark Processed</option>
                              <option value="Shipped">Mark Shipped</option>
                              <option value="Out for Delivery">Mark Out for Delivery</option>
                              <option value="Delivered">Mark Delivered</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 2. TAB: INVENTORY CATALOG */}
        {activeTab === 'products' && (
          <div className="space-y-6 animate-fade-up">
            
            {/* SEARCH AND FILTERS BAR */}
            <div className="bg-white border border-neutral-200/65 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row gap-3 items-center">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-3 w-4 h-4 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Search products by name, category, or description..."
                  value={invSearch}
                  onChange={(e) => setInvSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm border border-neutral-200 bg-[#fafafa] rounded-lg focus:border-black outline-none transition"
                />
              </div>

              <div className="flex gap-2 w-full sm:w-auto self-start sm:self-center">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-500 whitespace-nowrap">
                  <Filter className="w-3.5 h-3.5" /> Category:
                </div>
                <select
                  value={invCategory}
                  onChange={(e) => setInvCategory(e.target.value)}
                  className="text-xs font-bold border border-neutral-200 bg-white rounded-lg px-3 py-2 outline-none focus:border-black transition cursor-pointer"
                >
                  <option value="All">All Categories</option>
                  {categoriesList.map((c) => (
                    <option key={c.id} value={c.slug}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* PRODUCT CATALOG TABLE */}
            <div className="bg-white border border-neutral-200/65 rounded-xl shadow-sm overflow-hidden">
              {productsLoading ? (
                <div className="text-center py-16 text-neutral-400">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto mb-3"></div>
                  <p className="text-xs">Loading Firestore inventory catalog...</p>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-20 text-neutral-500">
                  No products found. Add some or click &quot;Reset Seeding&quot; to restore defaults!
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="bg-[#fcfcfb] border-b border-neutral-200 text-neutral-400 text-[10px] font-extrabold uppercase tracking-widest">
                        <th className="py-3 px-5">ID</th>
                        <th className="py-3 px-5">Product Details</th>
                        <th className="py-3 px-5">Category</th>
                        <th className="py-3 px-5">Price</th>
                        <th className="py-3 px-5">Telemetry / Sold</th>
                        <th className="py-3 px-5">Colors & Sizes</th>
                        <th className="py-3 px-5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 text-xs">
                      {filteredProducts.map((p) => (
                        <tr key={p.id} className="hover:bg-neutral-50/50 transition">
                          <td className="py-3 px-5 font-bold text-neutral-500">#{p.id}</td>
                          <td className="py-3 px-5">
                            <div className="flex items-center gap-3">
                              <div className="relative w-10 h-13 bg-neutral-100 rounded overflow-hidden border border-neutral-200">
                                <Image
                                  src={p.img}
                                  alt={p.name}
                                  fill
                                  sizes="40px"
                                  className="object-cover"
                                />
                              </div>
                              <div>
                                <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">
                                  {p.cat}
                                </span>
                                <h4 className="font-bold text-neutral-900 leading-snug hover:underline">
                                  {p.name}
                                </h4>
                                {p.isBestseller && (
                                  <span className="inline-block bg-black text-white text-[8px] font-bold px-1.5 py-0.5 rounded tracking-wide mt-0.5 uppercase">
                                    BESTSELLER
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-5 text-neutral-600 font-semibold">{p.cat}</td>
                          <td className="py-3 px-5 font-bold text-neutral-900">${p.price.toFixed(2)}</td>
                          <td className="py-3 px-5">
                            <p className="font-semibold text-neutral-800">{p.sold || '0 sold'}</p>
                            <p className="text-[9px] text-amber-600 font-medium flex items-center gap-0.5 mt-0.5">
                              ★ {p.rating} ({(p as any).reviews || '0'} reviews)
                            </p>
                          </td>
                          <td className="py-3 px-5 space-y-1.5">
                            <div className="flex gap-1">
                              {p.colors?.map((c) => (
                                <span
                                  key={c}
                                  className={`w-2.5 h-2.5 rounded-full ${colorClasses[c] || 'bg-stone-300'} inline-block border border-black/5`}
                                  title={c}
                                />
                              ))}
                            </div>
                            <div className="flex gap-1 text-[9px] font-bold text-neutral-500">
                              {p.sizes?.map((sz) => (
                                <span key={sz} className="bg-neutral-100 px-1 py-0.5 border rounded uppercase">
                                  {sz}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="py-3 px-5 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => startEditProduct(p)}
                                className="w-8 h-8 rounded-lg border border-neutral-200 flex items-center justify-center hover:bg-neutral-100 transition text-neutral-600 hover:text-black cursor-pointer"
                                title="Edit specs"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(p.id, p.name)}
                                className="w-8 h-8 rounded-lg border border-red-100 flex items-center justify-center hover:bg-red-50 hover:border-red-200 transition text-red-500 cursor-pointer"
                                title="Delete from catalog"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3. TAB: ADD / EDIT PRODUCT FORM */}
        {activeTab === 'add-product' && (
          <div className="bg-white border border-neutral-200/65 rounded-xl shadow-sm p-6 sm:p-8 max-w-4xl mx-auto animate-fade-up">
            
            <div className="flex items-center justify-between border-b border-neutral-200 pb-4 mb-6">
              <div>
                <h3 className="font-display font-extrabold text-lg text-neutral-900 tracking-wide uppercase">
                  {editingProduct ? `EDIT PRODUCT: "${editingProduct.name}"` : 'CREATE NEW PRODUCT RECORD'}
                </h3>
                <p className="text-xs text-neutral-500 mt-1">
                  Configure visual assets, size mappings, pricing structure, and metadata parameters
                </p>
              </div>
              {editingProduct && (
                <button
                  onClick={cancelEditProduct}
                  className="text-neutral-500 hover:text-black text-xs font-bold uppercase flex items-center gap-1.5"
                >
                  <X className="w-4 h-4" /> Cancel Edit
                </button>
              )}
            </div>

            <form onSubmit={editingProduct ? handleUpdateProduct : handleCreateProduct} className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Product Title */}
                <div>
                  <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
                    Product Display Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Premium Linen Casual Blouson"
                    value={prodForm.name}
                    onChange={(e) => setProdForm({ ...prodForm, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm border border-neutral-300 rounded-lg outline-none focus:border-black transition"
                  />
                </div>

                {/* Price */}
                <div>
                  <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
                    Retail Price ($ USD) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 45.00"
                    value={prodForm.price}
                    onChange={(e) => setProdForm({ ...prodForm, price: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm border border-neutral-300 rounded-lg outline-none focus:border-black transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
                    Discount Price ($ USD)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Optional; must be lower than retail price"
                    value={prodForm.discountPrice}
                    onChange={(e) => setProdForm({ ...prodForm, discountPrice: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm border border-neutral-300 rounded-lg outline-none focus:border-black transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Category Selection */}
                <div>
                  <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
                    Macro Category Selector *
                  </label>
                  {categoriesLoading ? (
                    <div className="w-full px-3.5 py-2.5 text-sm border border-neutral-200 bg-neutral-50 rounded-lg text-neutral-400 flex items-center gap-2 font-medium">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-black" />
                      Loading active categories...
                    </div>
                  ) : activeProductCategories.length === 0 ? (
                    <div className="space-y-1.5">
                      <select
                        disabled
                        className="w-full px-3.5 py-2.5 text-sm border border-red-300 bg-red-50 text-red-500 rounded-lg outline-none cursor-not-allowed font-medium"
                      >
                        <option value="">No Active Categories Available</option>
                      </select>
                      <p className="text-[11px] font-bold text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Please create and activate a category in &quot;Shop Categories&quot; tab first.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <select
                        value={prodForm.cat}
                        onChange={(e) => setProdForm({ ...prodForm, cat: e.target.value })}
                        className="w-full px-3.5 py-2.5 text-sm border border-neutral-300 bg-white rounded-lg outline-none focus:border-black transition cursor-pointer font-medium"
                      >
                        {/* Fallback option for editing a product assigned to an archived/inactive category */}
                        {editingProduct && prodForm.cat && !activeProductCategories.some(c => c.slug === prodForm.cat || c.name.toLowerCase() === prodForm.cat.toLowerCase()) && (
                          <option value={prodForm.cat}>
                            ⚠️ Archived / Inactive Category: {prodForm.cat}
                          </option>
                        )}
                        {activeProductCategories.map((c) => (
                          <option key={c.id} value={c.slug}>
                            {c.name} ({c.slug})
                          </option>
                        ))}
                      </select>
                      {editingProduct && prodForm.cat && !activeProductCategories.some(c => c.slug === prodForm.cat || c.name.toLowerCase() === prodForm.cat.toLowerCase()) && (
                        <p className="text-[10px] font-bold text-amber-600 flex items-center gap-1 mt-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          This product is currently assigned to an archived/inactive category (&quot;{prodForm.cat}&quot;). Please select an active category above.
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Product Image Files */}
                <div>
                  <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
                    Product Image Files *
                  </label>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    onChange={async (e) => {
                      const files = Array.from(e.target.files || []);
                      try {
                        const prepared = await Promise.all(files.map(optimizeProductImage));
                        setProdForm(prev => ({ ...prev, img: prepared[0] || prev.img, images: [...prev.images.filter(image => image.startsWith('data:image/')), ...prepared] }));
                      } catch (error: any) {
                        triggerToast(error.message || 'Unable to process product images.', 'error');
                      }
                    }}
                    className="w-full px-3.5 py-2.5 text-sm border border-neutral-300 rounded-lg outline-none focus:border-black transition file:mr-3 file:border-0 file:bg-black file:text-white file:px-3 file:py-1.5 file:rounded"
                  />
                  <p className="text-[10px] text-neutral-400 mt-1 font-light">
                    Import JPG, PNG, or WebP files. First image is the primary thumbnail; all files appear in the gallery.
                  </p>
                </div>
              </div>

              {/* COLORS MULTI-SELECT */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
                  Select Colors Available
                </label>
                <div className="flex flex-wrap gap-2.5">
                  {commerceColors.map((col) => {
                    const isSelected = prodForm.colors.includes(col.id);
                    return (
                      <button
                        key={col.id}
                        type="button"
                        onClick={() => toggleSelection('colors', col.id)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition flex items-center gap-1.5 cursor-pointer ${
                          isSelected
                            ? 'bg-black text-white border-black'
                            : 'bg-white text-neutral-600 border-neutral-300 hover:border-black'
                        }`}
                      >
                        <span className="w-2.5 h-2.5 rounded-full inline-block border border-black/10" style={{ background: col.secondaryHex ? `linear-gradient(135deg, ${col.hex} 50%, ${col.secondaryHex} 50%)` : col.hex }} />
                        {col.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* SIZES MULTI-SELECT */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
                  Select Sizes Available
                </label>
                <div className="flex flex-wrap gap-2">
                  {commerceSizes.map((sz) => {
                    const isSelected = prodForm.sizes.includes(sz.id);
                    return (
                      <button
                        key={sz.id}
                        type="button"
                        onClick={() => toggleSelection('sizes', sz.id)}
                        className={`w-10 h-10 text-xs font-extrabold rounded-md border transition uppercase cursor-pointer ${
                          isSelected
                            ? 'bg-black text-white border-black shadow-sm'
                            : 'bg-white text-neutral-600 border-neutral-300 hover:border-black'
                        }`}
                      >
                        {sz.code}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* DESCRIPTION */}
              {prodForm.colors.length > 0 && prodForm.sizes.length > 0 && (
                <div className="border rounded-xl overflow-hidden">
                  <div className="bg-neutral-50 px-4 py-3 border-b"><h4 className="text-xs font-extrabold uppercase">Variant Stock Matrix</h4><p className="text-[10px] text-neutral-500">Stock is stored separately for every color and size.</p></div>
                  <div className="divide-y">
                    {prodForm.colors.flatMap(colorId => prodForm.sizes.map(sizeId => {
                      const color = commerceColors.find(item => item.id === colorId);
                      const size = commerceSizes.find(item => item.id === sizeId);
                      const key = `${colorId}_${sizeId}`;
                      return <div key={key} className="grid grid-cols-[1fr_1fr_120px] items-center gap-3 px-4 py-2 text-xs">
                        <span className="font-bold">{color?.name || colorId}</span><span>{size?.code || sizeId}</span>
                        <input type="number" min="0" value={variantStocks[key] ?? 0} onChange={e => setVariantStocks({...variantStocks,[key]:Number(e.target.value)})} className="border rounded px-2 py-1.5" aria-label={`Stock for ${colorId} ${sizeId}`} />
                      </div>;
                    }))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
                  Product Description / Creative Editorial Copy
                </label>
                <textarea
                  rows={4}
                  placeholder="Tell a compelling luxury story about this piece..."
                  value={prodForm.description}
                  onChange={(e) => setProdForm({ ...prodForm, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm border border-neutral-300 rounded-lg outline-none focus:border-black transition"
                />
              </div>

              {/* SECONDARY IMAGES ARRAY */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
                  Secondary Details Carousel Images ({prodForm.images.length})
                </label>
                <div className="flex gap-2 mb-3 overflow-x-auto pb-1.5">
                  {prodForm.images.map((imgUrl, i) => (
                    <div key={i} className="relative w-14 h-18 rounded border border-neutral-300 overflow-hidden shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imgUrl} alt={`Secondary product detail ${i + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setProdForm({ ...prodForm, images: prodForm.images.filter((_, idx) => idx !== i) })}
                        className="absolute inset-0 bg-red-600/70 text-white flex items-center justify-center opacity-0 hover:opacity-100 transition text-[9px] font-bold"
                      >
                        DELETE
                      </button>
                    </div>
                  ))}
                  {prodForm.images.length === 0 && (
                    <span className="text-xs text-neutral-400 italic">No secondary carousel images logged. Default is main image.</span>
                  )}
                </div>

                <p className="text-[11px] text-neutral-500">Use the Product Image Files selector above to import additional gallery images.</p>
              </div>

              {/* SPECIAL COLLECTIONS TAGS */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
                  Collection Association Tags ({prodForm.collections.length})
                </label>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {prodForm.collections.map((tag) => (
                    <span key={tag} className="inline-flex items-center gap-1 bg-[#f0f0ed] text-neutral-700 px-2.5 py-1 rounded text-xs font-semibold border">
                      {tag}
                      <button
                        type="button"
                        onClick={() => setProdForm({ ...prodForm, collections: prodForm.collections.filter((x) => x !== tag) })}
                        className="hover:text-red-500 font-bold ml-0.5"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  {prodForm.collections.length === 0 && (
                    <span className="text-xs text-neutral-400 italic">No collection tags associated. e.g. Weekend Vibes, The Everyday Edit</span>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  {commerceCollections.map(collection => {
                    const selected = prodForm.collections.includes(collection.id);
                    return <button key={collection.id} type="button" onClick={() => toggleSelection('collections', collection.id)} className={`px-3 py-2 rounded-lg border text-xs font-bold ${selected ? 'bg-black text-white border-black' : 'bg-white text-neutral-600'}`}>{collection.name}</button>;
                  })}
                  {commerceCollections.length === 0 && <span className="text-xs text-amber-600">Create collections from the Collections sidebar module first.</span>}
                </div>

                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mt-5 mb-2">Size Guide</label>
                <select value={prodForm.sizeGuideId} onChange={e => setProdForm({...prodForm, sizeGuideId:e.target.value})} className="w-full px-3.5 py-2.5 text-sm border rounded-lg">
                  <option value="">No size guide</option>
                  {commerceSizeGuides.map(guide => <option key={guide.id} value={guide.id}>{guide.name}</option>)}
                </select>
              </div>

              {/* BESTSELLER FLAG */}
              <div className="flex items-center gap-3 bg-neutral-50 p-4 border rounded-xl">
                <input
                  type="checkbox"
                  id="isBestseller"
                  checked={prodForm.isBestseller}
                  onChange={(e) => setProdForm({ ...prodForm, isBestseller: e.target.checked })}
                  className="w-4.5 h-4.5 accent-black cursor-pointer rounded"
                />
                <label htmlFor="isBestseller" className="text-xs font-bold text-neutral-800 uppercase tracking-wider cursor-pointer select-none">
                  Simulate Best Seller Badge (Pushes item to Bestsellers carousel)
                </label>
              </div>

              {/* FORM ACTIONS */}
              <div className="pt-4 border-t flex justify-end gap-3">
                {editingProduct ? (
                  <>
                    <button
                      type="button"
                      onClick={cancelEditProduct}
                      className="border border-neutral-300 hover:bg-neutral-100 text-neutral-700 font-bold text-xs uppercase px-6 py-3 rounded-lg transition"
                    >
                      Dismiss Changes
                    </button>
                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="bg-black text-white hover:bg-neutral-800 font-bold text-xs uppercase tracking-widest px-8 py-3 rounded-lg transition shadow-sm disabled:bg-neutral-400 cursor-pointer"
                    >
                      {actionLoading ? 'Saving Specs...' : 'CONFIRM SPECIFICATIONS SAVE'}
                    </button>
                  </>
                ) : (
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="w-full sm:w-auto bg-black text-white hover:bg-neutral-800 font-bold text-xs uppercase tracking-widest px-10 py-3.5 rounded-lg transition shadow-md disabled:bg-neutral-400 cursor-pointer"
                  >
                    {actionLoading ? 'Creating in Database...' : 'COMMIT SPECIFICATIONS TO FIRESTORE'}
                  </button>
                )}
              </div>

            </form>
          </div>
        )}

        {/* 4. TAB: ORDERS MANAGEMENT */}
        {activeTab === 'orders' && (
          <div className="space-y-6 animate-fade-up">
            
            {/* ORDERS FILTER TABS */}
            <div className="bg-white border border-neutral-200/65 rounded-xl p-4 shadow-sm flex flex-wrap gap-1.5">
              {(['All', 'Placed', 'Processed', 'Shipped', 'Delivered'] as const).map((flt) => {
                const count = flt === 'All' ? orders.length : orders.filter(o => o.status === flt).length;
                return (
                  <button
                    key={flt}
                    onClick={() => setOrderFilter(flt)}
                    className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition cursor-pointer ${
                      orderFilter === flt
                        ? 'bg-black text-white shadow-sm'
                        : 'bg-neutral-50 border text-neutral-600 hover:bg-neutral-100'
                    }`}
                  >
                    {flt} ({count})
                  </button>
                );
              })}
            </div>

            {/* ORDERS LIST */}
            <div className="space-y-4">
              {ordersLoading ? (
                <div className="text-center bg-white border rounded-xl py-16 text-neutral-400">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto mb-2"></div>
                  <p className="text-xs font-semibold">Syncing incoming customer orders...</p>
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="text-center bg-white border rounded-xl py-16 text-neutral-500 text-sm">
                  No orders matched the active filter selection.
                </div>
              ) : (
                filteredOrders.map((ord) => (
                  <div
                    key={ord.id}
                    className="bg-white border border-neutral-200/65 rounded-xl shadow-xs overflow-hidden"
                  >
                    {/* Header bar of card */}
                    <div className="bg-[#fcfcfb] border-b border-neutral-150 px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="flex items-center gap-3.5">
                        <span className="font-display font-extrabold text-neutral-900 text-sm">
                          ORDER {ord.id}
                        </span>
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-widest ${
                          ord.status === 'Placed' ? 'bg-blue-50 text-blue-600 border border-blue-200' :
                          ord.status === 'Processed' ? 'bg-purple-50 text-purple-600 border border-purple-200' :
                          ord.status === 'Shipped' ? 'bg-amber-50 text-amber-600 border border-amber-200' :
                          ord.status === 'Out for Delivery' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {ord.status}
                        </span>
                      </div>

                      <div className="flex items-center gap-2.5 self-start sm:self-center">
                        <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Update:</span>
                        <select
                          value={ord.status}
                          onChange={(e) => handleUpdateOrderStatus(ord.id, e.target.value as any)}
                          className="text-xs font-bold bg-white border border-neutral-300 rounded-md px-3 py-1.5 focus:border-black outline-none transition cursor-pointer"
                        >
                          <option value="Placed">Placed</option>
                          <option value="Processed">Processed</option>
                          <option value="Shipped">Shipped</option>
                          <option value="Out for Delivery">Out for Delivery</option>
                          <option value="Delivered">Delivered</option>
                        </select>
                      </div>
                    </div>

                    {/* Content inside card */}
                    <div className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-6 text-xs">
                      
                      {/* Products List inside order */}
                      <div className="lg:col-span-6 space-y-3">
                        <p className="font-bold text-[10px] text-neutral-400 uppercase tracking-widest pb-1 border-b">
                          Items Purchased ({ord.items?.reduce((sum, item) => sum + item.quantity, 0)})
                        </p>
                        <div className="space-y-3.5">
                          {ord.items?.map((item, idx) => (
                            <div key={idx} className="flex gap-3">
                              <div className="relative w-10 h-13 rounded bg-neutral-50 border border-neutral-200 overflow-hidden shrink-0">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={item.img} alt={item.name} className="w-full h-full object-cover" />
                              </div>
                              <div className="overflow-hidden">
                                <h5 className="font-bold text-neutral-900 truncate">{item.name}</h5>
                                <p className="text-[10px] text-neutral-500 mt-0.5">
                                  Size: <span className="font-bold text-neutral-800">{item.size}</span> | Color: <span className="font-bold text-neutral-800">{item.color}</span>
                                </p>
                                <p className="text-[10px] font-bold text-neutral-800 mt-0.5">
                                  {item.quantity} × ${item.price?.toFixed(2)}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Customer & Address Details */}
                      <div className="lg:col-span-3 space-y-2">
                        <p className="font-bold text-[10px] text-neutral-400 uppercase tracking-widest pb-1 border-b">
                          Customer Specs
                        </p>
                        <div className="space-y-1">
                          <p className="font-bold text-neutral-900">{ord.customerName}</p>
                          <p className="text-neutral-500 font-medium">{ord.customerEmail}</p>
                          {ord.customerPhone && (
                            <p className="text-neutral-500 font-medium">Cell: {ord.customerPhone}</p>
                          )}
                        </div>

                        <div className="pt-2">
                          <p className="font-bold text-[9px] text-neutral-400 uppercase tracking-wider">
                            Shipping Destination
                          </p>
                          <p className="text-neutral-600 mt-1 leading-relaxed font-semibold">
                            {ord.shippingAddress}, {ord.shippingCity}, {ord.shippingPostalCode}
                          </p>
                        </div>
                      </div>

                      {/* Invoice summary info */}
                      <div className="lg:col-span-3 bg-neutral-50 p-4.5 rounded-xl space-y-2 border">
                        <p className="font-bold text-[10px] text-neutral-400 uppercase tracking-widest pb-1 border-b">
                          Invoice Summary
                        </p>
                        <div className="space-y-1.5 text-neutral-600 font-medium">
                          <div className="flex justify-between">
                            <span>Subtotal:</span>
                            <span>${ord.subtotal?.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Fulfillment Shipping:</span>
                            <span>{ord.shippingCost === 0 ? 'FREE' : `$${ord.shippingCost?.toFixed(2)}`}</span>
                          </div>
                          {ord.promoApplied && (
                            <div className="flex justify-between text-emerald-600 font-semibold">
                              <span>Promo ({ord.promoApplied}):</span>
                              <span>-${ord.promoDiscount?.toFixed(2)}</span>
                            </div>
                          )}
                          <div className="border-t pt-1.5 flex justify-between font-bold text-neutral-900 text-sm">
                            <span>Total Charged:</span>
                            <span>${ord.total?.toFixed(2)}</span>
                          </div>
                        </div>

                        {ord.createdAt && (
                          <div className="pt-2 text-[9px] text-neutral-400 text-right">
                            Logged: {new Date(ord.createdAt).toLocaleString()}
                          </div>
                        )}
                      </div>

                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* 5. TAB: PROMO CODES MANAGEMENT */}
        {activeTab === 'promos' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-up">
            
            {/* Create Promo Code Form */}
            <div className="bg-white border border-neutral-200/65 rounded-xl shadow-sm p-6 lg:p-7 self-start">
              <h3 className="font-display font-extrabold text-xs tracking-wider uppercase mb-1">Create Promo Code</h3>
              <p className="text-[11px] text-neutral-500 mb-5">Define custom discounts and requirements for customer checkout systems.</p>
              
              <form onSubmit={handleCreatePromo} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-neutral-700 uppercase tracking-wider mb-1.5">Promo Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SPECIAL30"
                    value={promoForm.code}
                    onChange={(e) => setPromoForm({ ...promoForm, code: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg outline-none focus:border-black transition uppercase font-bold tracking-wider text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-neutral-700 uppercase tracking-wider mb-1.5">Discount Type</label>
                  <select
                    value={promoForm.type}
                    onChange={(e) => setPromoForm({ ...promoForm, type: e.target.value as any })}
                    className="w-full px-3 py-2 border rounded-lg bg-white outline-none focus:border-black transition cursor-pointer font-semibold text-xs"
                  >
                    <option value="percentage">Percentage Discount (%)</option>
                    <option value="fixed">Fixed Cash Discount ($ USD)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-neutral-700 uppercase tracking-wider mb-1.5">Discount Value *</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 10 or 25"
                    value={promoForm.value}
                    onChange={(e) => setPromoForm({ ...promoForm, value: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg outline-none focus:border-black transition font-semibold text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-neutral-700 uppercase tracking-wider mb-1.5">Minimum Order Amount ($ USD)</label>
                  <input
                    type="number"
                    placeholder="e.g. 50 (0 for none)"
                    value={promoForm.minOrder}
                    onChange={(e) => setPromoForm({ ...promoForm, minOrder: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg outline-none focus:border-black transition font-semibold text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-neutral-700 uppercase tracking-wider mb-1.5">Activation Status</label>
                  <select
                    value={promoForm.status}
                    onChange={(e) => setPromoForm({ ...promoForm, status: e.target.value as any })}
                    className="w-full px-3 py-2 border rounded-lg bg-white outline-none focus:border-black transition cursor-pointer font-semibold text-xs"
                  >
                    <option value="Active">Active & Enabled</option>
                    <option value="Inactive">Disabled</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={actionLoading}
                  className="w-full py-2.5 bg-black text-white hover:bg-neutral-800 transition rounded-lg font-bold uppercase tracking-wider shadow-sm text-[10px]"
                >
                  {actionLoading ? "CREATING..." : "COMMIT DISCOUNT CODE"}
                </button>
              </form>
            </div>

            {/* Active Promo Codes List */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white border border-neutral-200/65 rounded-xl shadow-sm overflow-hidden">
                <div className="p-5 border-b border-neutral-200">
                  <h3 className="font-display font-extrabold text-xs tracking-wider uppercase">Active Promotions Catalog</h3>
                </div>

                {promosLoading ? (
                  <div className="text-center py-12 text-neutral-400">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-black mx-auto mb-2"></div>
                    <p className="text-xs">Streaming discounts catalog...</p>
                  </div>
                ) : promos.length === 0 ? (
                  <div className="text-center py-16 text-neutral-500 text-sm">
                    No promo codes registered. Define some above to see them list!
                  </div>
                ) : (
                  <div className="overflow-x-auto text-xs">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-[#fcfcfb] border-b border-neutral-200 text-neutral-400 text-[10px] font-extrabold uppercase tracking-widest">
                          <th className="py-3 px-5">Code</th>
                          <th className="py-3 px-5">Discount Type</th>
                          <th className="py-3 px-5">Value</th>
                          <th className="py-3 px-5">Min. Order Limit</th>
                          <th className="py-3 px-5">Status</th>
                          <th className="py-3 px-5 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100 font-medium">
                        {promos.map((promo) => (
                          <tr key={promo.code} className="hover:bg-neutral-50/50 transition">
                            <td className="py-4 px-5 font-bold text-neutral-900 tracking-wider">
                              <span className="bg-stone-100 border px-2 py-1 rounded font-mono text-xs">
                                {promo.code}
                              </span>
                            </td>
                            <td className="py-4 px-5 capitalize">{promo.type} Discount</td>
                            <td className="py-4 px-5 font-bold text-neutral-900">
                              {promo.type === 'percentage' ? `${promo.value}%` : `$${promo.value.toFixed(2)}`}
                            </td>
                            <td className="py-4 px-5 font-bold text-neutral-500">
                              {promo.minOrder > 0 ? `$${promo.minOrder.toFixed(2)}` : 'None'}
                            </td>
                            <td className="py-4 px-5">
                              <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                                promo.status === 'Active'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-neutral-100 text-neutral-500 border'
                              }`}>
                                {promo.status}
                              </span>
                            </td>
                            <td className="py-4 px-5 text-right">
                              <button
                                onClick={() => handleDeletePromo(promo.code)}
                                className="w-7 h-7 rounded-lg border border-red-100 flex items-center justify-center hover:bg-red-50 hover:border-red-200 transition text-red-500 cursor-pointer ml-auto"
                                title="Delete promo code"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* 6. TAB: HERO SLIDES MANAGEMENT */}
        {activeTab === 'hero' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-up">
            
            {/* Create or Edit Hero Slide Form */}
            <div className="bg-white border border-neutral-200/65 rounded-xl shadow-sm p-6 lg:p-7 self-start">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-display font-extrabold text-xs tracking-wider uppercase">
                  {editingHeroSlide ? 'Modify Hero Slide' : 'Create Hero Slide'}
                </h3>
                {editingHeroSlide && (
                  <button
                    onClick={() => {
                      setEditingHeroSlide(null);
                      setHeroSelectedFile(null);
                      setHeroPreviewUrl('');
                      setHeroForm({
                        title: '',
                        subtitle: '',
                        btn1Text: 'SHOP NOW',
                        btn1Link: '/shop',
                        btn2Text: '',
                        btn2Link: '',
                        order: 0
                      });
                    }}
                    className="text-[10px] text-red-500 hover:underline font-bold"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>
              <p className="text-[11px] text-neutral-500 mb-5">
                Upload custom background images and customize hero taglines, order, and CTA buttons.
              </p>
              
              <form onSubmit={handleCreateOrUpdateHeroSlide} className="space-y-4 text-xs">
                {/* Hero Image File Selector & Preview */}
                <div>
                  <label className="block font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                    Hero Slide Image * {editingHeroSlide ? "(Leave empty to keep current image)" : ""}
                  </label>
                  <div className="border border-dashed border-neutral-300 rounded-xl p-3 bg-neutral-50/50 hover:bg-neutral-50 transition">
                    <input
                      type="file"
                      id="hero-image-file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 10 * 1024 * 1024) {
                            triggerToast("File size exceeds 10MB limit.", "error");
                            e.target.value = '';
                            return;
                          }
                          setHeroSelectedFile(file);
                          setHeroPreviewUrl(URL.createObjectURL(file));
                        }
                      }}
                      className="hidden"
                    />
                    <label
                      htmlFor="hero-image-file"
                      className="flex flex-col items-center justify-center cursor-pointer py-3 text-center"
                    >
                      <Upload className="w-5 h-5 text-neutral-400 mb-1.5" />
                      <span className="text-xs font-bold text-neutral-800">
                        {heroSelectedFile ? heroSelectedFile.name : "Click to select hero image file"}
                      </span>
                      <span className="text-[10px] text-neutral-400 mt-0.5">
                        JPEG, PNG, or WebP (Max size 10MB)
                      </span>
                    </label>
                  </div>

                  {/* Dual Viewport Crop Preview */}
                  {(heroPreviewUrl || (editingHeroSlide && editingHeroSlide.image)) && (
                    <div className="mt-3 p-3 bg-neutral-100/70 rounded-xl space-y-2 border border-neutral-200">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-neutral-600 uppercase tracking-wider">
                          Automatic Crop Preview
                        </span>
                        {heroSelectedFile && (
                          <button
                            type="button"
                            onClick={() => {
                              setHeroSelectedFile(null);
                              setHeroPreviewUrl('');
                            }}
                            className="text-[10px] text-red-500 font-bold hover:underline"
                          >
                            Remove Selected File
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="block text-[9px] font-bold text-neutral-400 mb-1">Desktop (Cover Center)</span>
                          <div className="relative aspect-video rounded-lg overflow-hidden bg-neutral-200 border border-neutral-300">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={heroPreviewUrl || editingHeroSlide?.image}
                              alt="Desktop Preview"
                              className="w-full h-full object-cover object-center"
                            />
                          </div>
                        </div>
                        <div>
                          <span className="block text-[9px] font-bold text-neutral-400 mb-1">Mobile (Cover Center)</span>
                          <div className="relative aspect-[4/5] rounded-lg overflow-hidden bg-neutral-200 border border-neutral-300 mx-auto max-h-24">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={heroPreviewUrl || editingHeroSlide?.image}
                              alt="Mobile Preview"
                              className="w-full h-full object-cover object-center"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-neutral-700 uppercase tracking-wider mb-1.5">Slide Title *</label>
                  <textarea
                    required
                    rows={2}
                    placeholder="e.g. WEAR YOUR&#10;CONFIDENCE (use new line for break)"
                    value={heroForm.title}
                    onChange={(e) => setHeroForm({ ...heroForm, title: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg outline-none focus:border-black transition font-semibold text-xs resize-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-neutral-700 uppercase tracking-wider mb-1.5">Slide Subtitle *</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Trendy pieces. Timeless style..."
                    value={heroForm.subtitle}
                    onChange={(e) => setHeroForm({ ...heroForm, subtitle: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg outline-none focus:border-black transition font-semibold text-xs resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-neutral-700 uppercase tracking-wider mb-1.5">CTA 1 Button Text *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. SHOP NEW"
                      value={heroForm.btn1Text}
                      onChange={(e) => setHeroForm({ ...heroForm, btn1Text: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg outline-none focus:border-black transition font-bold text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-neutral-700 uppercase tracking-wider mb-1.5">CTA 1 Button Link *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. /shop"
                      value={heroForm.btn1Link}
                      onChange={(e) => setHeroForm({ ...heroForm, btn1Link: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg outline-none focus:border-black transition font-semibold text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-neutral-700 uppercase tracking-wider mb-1.5">CTA 2 Button Text</label>
                    <input
                      type="text"
                      placeholder="e.g. VIEW ALL"
                      value={heroForm.btn2Text}
                      onChange={(e) => setHeroForm({ ...heroForm, btn2Text: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg outline-none focus:border-black transition font-bold text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-neutral-700 uppercase tracking-wider mb-1.5">CTA 2 Button Link</label>
                    <input
                      type="text"
                      placeholder="e.g. /shop"
                      value={heroForm.btn2Link}
                      onChange={(e) => setHeroForm({ ...heroForm, btn2Link: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg outline-none focus:border-black transition font-semibold text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-neutral-700 uppercase tracking-wider mb-1.5">Sequential Order *</label>
                  <input
                    type="number"
                    required
                    placeholder="0"
                    value={heroForm.order}
                    onChange={(e) => setHeroForm({ ...heroForm, order: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg outline-none focus:border-black transition font-bold text-xs"
                  />
                </div>

                <button
                  type="submit"
                  disabled={actionLoading}
                  className="w-full py-2.5 bg-black text-white hover:bg-neutral-800 transition rounded-lg font-bold uppercase tracking-wider shadow-sm text-[10px]"
                >
                  {actionLoading ? "UPLOADING & SAVING..." : editingHeroSlide ? "UPDATE SLIDE" : "CREATE NEW SLIDE"}
                </button>
              </form>
            </div>

            {/* Active Slides Grid */}
            <div className="lg:col-span-2 space-y-5">
              <div className="bg-white border border-neutral-200/65 rounded-xl shadow-sm overflow-hidden">
                <div className="p-5 border-b border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="font-display font-extrabold text-xs tracking-wider uppercase">Active Carousel Slides</h3>
                    <p className="text-[10px] text-neutral-400 mt-0.5">Slides display in order of ascending order index.</p>
                  </div>
                  <button
                    onClick={handleResetHeroSlides}
                    disabled={actionLoading}
                    className="flex items-center gap-1.5 border border-red-200 text-red-600 hover:bg-red-50 transition px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider self-start sm:self-center cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Restore Default Slides
                  </button>
                </div>

                {heroLoading ? (
                  <div className="text-center py-16 text-neutral-400">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-black mx-auto mb-2"></div>
                    <p className="text-xs">Fetching active carousel slides...</p>
                  </div>
                ) : heroSlidesList.length === 0 ? (
                  <div className="text-center py-16 text-neutral-500 text-xs">
                    No custom slides configured. The landing page is using fallback defaults. Click &quot;Restore Default Slides&quot; above to populate slide controls!
                  </div>
                ) : (
                  <div className="p-5 space-y-4">
                    {heroSlidesList.map((slide) => (
                      <div
                        key={slide.id}
                        className="border border-neutral-200 rounded-xl overflow-hidden bg-[#fafafa]/40 flex flex-col md:flex-row"
                      >
                        {/* Slide image preview */}
                        <div className="relative w-full md:w-44 h-28 bg-neutral-100 shrink-0 border-b md:border-b-0 md:border-r">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={slide.image}
                            alt="Slide preview"
                            className="w-full h-full object-cover object-center"
                          />
                          <div className="absolute top-2 left-2 bg-black text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded shadow">
                            Order {slide.order}
                          </div>
                        </div>

                        {/* Slide metadata text info */}
                        <div className="p-4 flex-1 text-xs space-y-2.5 overflow-hidden">
                          <div className="flex items-start justify-between gap-2.5">
                            <div className="overflow-hidden">
                              <h4 className="font-bold text-neutral-900 font-display text-sm tracking-tight truncate">
                                {slide.title.replace(/\n/g, ' ')}
                              </h4>
                              <p className="text-[11px] text-neutral-500 font-light truncate mt-0.5">
                                {slide.subtitle}
                              </p>
                            </div>
                            <div className="flex gap-1.5 shrink-0">
                              <button
                                onClick={() => {
                                  setEditingHeroSlide(slide);
                                  setHeroSelectedFile(null);
                                  setHeroPreviewUrl('');
                                  setHeroForm({
                                    title: slide.title,
                                    subtitle: slide.subtitle,
                                    btn1Text: slide.btn1Text,
                                    btn1Link: slide.btn1Link,
                                    btn2Text: slide.btn2Text || '',
                                    btn2Link: slide.btn2Link || '',
                                    order: slide.order
                                  });
                                  window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                className="w-7 h-7 rounded-lg border border-neutral-200 flex items-center justify-center hover:bg-white hover:text-black hover:border-black transition text-neutral-600 cursor-pointer"
                                title="Edit slide specifications"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleDeleteHeroSlide(slide.id)}
                                className="w-7 h-7 rounded-lg border border-red-100 flex items-center justify-center hover:bg-red-50 hover:border-red-200 transition text-red-500 cursor-pointer"
                                title="Delete slide"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-neutral-100 grid grid-cols-2 gap-y-1.5 text-[10px] text-neutral-500 font-semibold uppercase tracking-wider font-sans">
                            <div className="truncate">
                              CTA 1: <span className="font-extrabold text-neutral-800">{slide.btn1Text}</span> ({slide.btn1Link})
                            </div>
                            <div className="truncate">
                              CTA 2: <span className="font-extrabold text-neutral-800">{slide.btn2Text || 'None'}</span> {slide.btn2Link ? `(${slide.btn2Link})` : ''}
                            </div>
                            <div className="col-span-2 truncate">
                              Align: <span className="font-extrabold text-neutral-800 font-mono text-[9px] lowercase">Auto Center (Safe Responsive)</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* 7. TAB: SHOP CATEGORIES */}
        {activeTab === 'categories' && (
          <div className="space-y-8 animate-fade-up">
            {/* Action Bar & Stats */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-neutral-200 shadow-xs">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-black text-white flex items-center justify-center font-bold">
                  <Grid className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-extrabold text-sm tracking-wider uppercase text-neutral-900">
                    Category Operations
                  </h3>
                  <p className="text-xs text-neutral-500">
                    {categoriesList.filter(c => c.active).length} Active of {categoriesList.length} total categories
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setEditingCategory(null);
                    setCategoryForm({
                      id: '',
                      name: '',
                      slug: '',
                      imagePath: '',
                      imageUrl: '',
                      order: categoriesList.length + 1,
                      active: true,
                      style: 'image'
                    });
                    setShowCategoryForm(prev => !prev);
                  }}
                  className="flex items-center gap-2 bg-black text-white hover:bg-neutral-800 transition px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  {showCategoryForm && !editingCategory ? 'Close Form' : 'Add New Category'}
                </button>
              </div>
            </div>

            {/* ADD / EDIT CATEGORY FORM */}
            {showCategoryForm && (
              <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-sm space-y-5 animate-fade-in">
                <div className="flex items-center justify-between border-b border-neutral-200 pb-4">
                  <h3 className="font-display font-extrabold text-base uppercase tracking-tight text-neutral-900 flex items-center gap-2">
                    <Tag className="w-4 h-4 text-amber-500" />
                    {editingCategory ? `Edit Category: "${editingCategory.name}"` : 'Create New Shop Category'}
                  </h3>
                  <button
                    onClick={() => {
                      setShowCategoryForm(false);
                      setEditingCategory(null);
                    }}
                    className="text-neutral-400 hover:text-black transition cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSaveCategory} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Name */}
                    <div>
                      <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wider mb-1">
                        Category Display Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={categoryForm.name}
                        onChange={(e) => {
                          const name = e.target.value;
                          const slug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
                          setCategoryForm(prev => ({
                            ...prev,
                            name,
                            slug: editingCategory ? prev.slug : slug
                          }));
                        }}
                        placeholder="e.g. Outerwear, Activewear, Jackets"
                        className="w-full border border-neutral-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-black font-medium"
                      />
                    </div>

                    {/* Slug */}
                    <div>
                      <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wider mb-1">
                        Category Slug (Filter Identifier) *
                      </label>
                      <input
                        type="text"
                        required
                        value={categoryForm.slug}
                        onChange={(e) => setCategoryForm(prev => ({ ...prev, slug: e.target.value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-') }))}
                        placeholder="e.g. outerwear"
                        className="w-full border border-neutral-300 rounded-lg px-3.5 py-2.5 text-sm font-mono focus:outline-none focus:border-black"
                      />
                    </div>

                    {/* Card Style Selector */}
                    <div>
                      <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wider mb-1">
                        Card Display Style *
                      </label>
                      <select
                        value={categoryForm.style}
                        onChange={(e) => setCategoryForm(prev => ({ ...prev, style: e.target.value as 'image' | 'sale' }))}
                        className="w-full border border-neutral-300 rounded-lg px-3.5 py-2.5 text-sm font-medium focus:outline-none focus:border-black bg-white cursor-pointer"
                      >
                        <option value="image">Standard Image Card (Displays image thumbnail)</option>
                        <option value="sale">Special SALE Badge Card (Solid black card with white text)</option>
                      </select>
                    </div>

                    {/* Display Order */}
                    <div>
                      <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wider mb-1">
                        Display Sequence Order #
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={categoryForm.order}
                        onChange={(e) => setCategoryForm(prev => ({ ...prev, order: Number(e.target.value) || 1 }))}
                        className="w-full border border-neutral-300 rounded-lg px-3.5 py-2.5 text-sm font-medium focus:outline-none focus:border-black"
                      />
                    </div>

                    {/* Image File Selector (if style === 'image') */}
                    {categoryForm.style === 'image' && (
                      <div className="md:col-span-2">
                        <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wider mb-1">
                          Category Image File *
                        </label>
                        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                          <label className="flex items-center gap-2 px-4 py-2.5 bg-neutral-100 hover:bg-neutral-200 border border-neutral-300 rounded-lg text-xs font-bold text-neutral-700 cursor-pointer transition select-none">
                            <Upload className="w-4 h-4" />
                            {categoryImageFile ? 'Change Selected File' : 'Select Local Image'}
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              onChange={handleCategoryImageChange}
                              className="hidden"
                            />
                          </label>
                          
                          {categoryImageFile && (
                            <span className="text-xs font-medium text-neutral-500 truncate max-w-xs">
                              {categoryImageFile.name} ({(categoryImageFile.size / 1024 / 1024).toFixed(2)} MB)
                            </span>
                          )}
                          
                          {categoryImagePreview && (
                            <div className="w-16 h-16 rounded-xl bg-neutral-100 overflow-hidden relative shrink-0 border border-neutral-200 shadow-inner">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={categoryImagePreview} alt="Preview" className="w-full h-full object-cover" />
                            </div>
                          )}
                        </div>
                        <p className="text-[10px] text-neutral-400 font-medium mt-1">
                          Accepted formats: JPG, PNG, WebP. Maximum file size: 5MB.
                        </p>
                      </div>
                    )}

                    {/* Active Toggle */}
                    <div className="md:col-span-2 flex items-center gap-3 pt-2">
                      <input
                        type="checkbox"
                        id="cat-active-check"
                        checked={categoryForm.active}
                        onChange={(e) => setCategoryForm(prev => ({ ...prev, active: e.target.checked }))}
                        className="w-4 h-4 accent-black rounded cursor-pointer"
                      />
                      <label htmlFor="cat-active-check" className="text-xs font-bold text-neutral-800 cursor-pointer">
                        Active on Homepage (Visible to store visitors)
                      </label>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-200">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCategoryForm(false);
                        setEditingCategory(null);
                        setCategoryImageFile(null);
                        setCategoryImagePreview('');
                      }}
                      className="px-4 py-2.5 rounded-lg border border-neutral-300 text-neutral-700 hover:bg-neutral-100 text-xs font-bold uppercase transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="px-6 py-2.5 rounded-lg bg-black text-white hover:bg-neutral-800 text-xs font-bold uppercase transition flex items-center gap-2 cursor-pointer shadow-md"
                    >
                      {actionLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                      {editingCategory ? 'Update Category' : 'Save Category'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* CATEGORIES LIST TABLE / GRID */}
            <div className="bg-white border border-neutral-200 rounded-xl shadow-sm overflow-hidden">
              <div className="p-5 border-b border-neutral-200 flex items-center justify-between">
                <h3 className="font-display font-extrabold text-sm tracking-widest uppercase text-neutral-900">
                  Store Categories ({categoriesList.length})
                </h3>
                <button
                  onClick={fetchCategories}
                  disabled={categoriesLoading}
                  className="text-neutral-500 hover:text-black font-bold text-xs uppercase flex items-center gap-1.5 transition cursor-pointer"
                  title="Refresh categories"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${categoriesLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>

              {categoriesLoading ? (
                <div className="text-center py-16 text-neutral-400">
                  <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-black mx-auto mb-3"></div>
                  <p className="text-xs font-medium">Loading categories from Firestore...</p>
                </div>
              ) : categoriesList.length === 0 ? (
                <div className="text-center py-16 text-neutral-500 text-xs space-y-3">
                  <p>No categories found in Firestore.</p>
                  <button
                    onClick={fetchCategories}
                    className="px-4 py-2 bg-black text-white text-xs font-bold rounded-lg uppercase cursor-pointer"
                  >
                    Load Default Seed
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-neutral-200">
                  {categoriesList.map((cat, idx) => (
                    <div
                      key={cat.id}
                      className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition ${
                        !cat.active ? 'bg-neutral-50/70 opacity-75' : 'hover:bg-neutral-50/50'
                      }`}
                    >
                      {/* Left: Thumbnail & Details */}
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        {/* Sequence badge & Reorder controls */}
                        <div className="flex flex-col items-center justify-center shrink-0">
                          <button
                            onClick={() => handleMoveCategoryOrder(cat, 'up')}
                            disabled={idx === 0 || actionLoading}
                            className="text-neutral-400 hover:text-black disabled:opacity-20 cursor-pointer"
                            title="Move Order Up"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <span className="font-mono text-xs font-extrabold bg-neutral-100 text-neutral-800 px-2 py-0.5 rounded my-0.5">
                            #{cat.order}
                          </span>
                          <button
                            onClick={() => handleMoveCategoryOrder(cat, 'down')}
                            disabled={idx === categoriesList.length - 1 || actionLoading}
                            className="text-neutral-400 hover:text-black disabled:opacity-20 cursor-pointer"
                            title="Move Order Down"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Card visual preview */}
                        <div className="w-16 h-16 rounded-xl overflow-hidden relative shrink-0 border border-neutral-200 bg-neutral-100 flex items-center justify-center">
                          {cat.style === 'sale' ? (
                            <div className="w-full h-full bg-black text-white flex items-center justify-center font-display font-bold text-xs">
                              SALE
                            </div>
                          ) : cat.imageUrl ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={cat.imageUrl} alt={cat.name} className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon className="w-6 h-6 text-neutral-400" />
                          )}
                        </div>

                        {/* Category Metadata */}
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-neutral-900 font-display text-sm tracking-tight truncate">
                              {cat.name}
                            </h4>
                            <span className="font-mono text-[10px] bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded uppercase font-semibold">
                              {cat.slug}
                            </span>
                            <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded ${
                              cat.style === 'sale' ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-neutral-100 text-neutral-700'
                            }`}>
                              {cat.style}
                            </span>
                          </div>

                          <p className="text-[11px] text-neutral-500 font-mono truncate">
                            /shop?cat={cat.slug}
                          </p>
                        </div>
                      </div>

                      {/* Right: Actions & Active Toggle */}
                      <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                        {/* Active Toggle Button */}
                        <button
                          onClick={() => handleToggleCategoryActive(cat)}
                          disabled={actionLoading}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border ${
                            cat.active
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-neutral-100 text-neutral-500 border-neutral-300 hover:bg-neutral-200'
                          }`}
                        >
                          {cat.active ? <Eye className="w-3.5 h-3.5 text-emerald-600" /> : <EyeOff className="w-3.5 h-3.5" />}
                          {cat.active ? 'Active' : 'Hidden'}
                        </button>

                        {/* Edit Button */}
                        <button
                          onClick={() => startEditCategory(cat)}
                          className="w-8 h-8 rounded-lg border border-neutral-200 flex items-center justify-center hover:bg-black hover:text-white hover:border-black transition text-neutral-600 cursor-pointer"
                          title="Edit Category"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={() => handleDeleteCategory(cat.id, cat.name)}
                          className="w-8 h-8 rounded-lg border border-red-100 flex items-center justify-center hover:bg-red-50 hover:border-red-200 transition text-red-500 cursor-pointer"
                          title="Delete Category"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'colors' && <CommerceAdminModule module="colors" />}
        {activeTab === 'sizes' && <CommerceAdminModule module="sizes" />}
        {activeTab === 'size-guides' && <CommerceAdminModule module="size-guides" />}
        {activeTab === 'collections' && <CommerceAdminModule module="collections" />}
        {activeTab === 'reviews' && <CommerceAdminModule module="reviews" />}
        {activeTab === 'inventory' && <CommerceAdminModule module="inventory" />}

      </main>
    </div>
  );
}
