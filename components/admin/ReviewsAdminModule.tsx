import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { 
  Star, 
  Search, 
  Filter, 
  Check, 
  X, 
  Trash2, 
  RotateCcw, 
  FileText, 
  User, 
  Mail, 
  ShoppingBag, 
  Layers, 
  Database,
  Plus,
  ChevronsUpDown,
  BookOpen
} from 'lucide-react';
import { auth } from '../../lib/firebase';
import { ReviewDocument } from '../../types/commerce';
import { Product } from '../../lib/products';

async function adminHeaders(includeJson = false): Promise<HeadersInit> {
  const token = await auth.currentUser?.getIdToken();
  const isLocalDemo = typeof window !== 'undefined' && localStorage.getItem('cr_admin_session') === 'demo';
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(isLocalDemo ? { 'X-Admin-Demo': '1' } : {}),
    ...(includeJson ? { 'Content-Type': 'application/json' } : {})
  };
}

export default function ReviewsAdminModule() {
  const [reviews, setReviews] = useState<ReviewDocument[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter & Search states
  const [statusTab, setStatusTab] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [productFilter, setProductFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  
  // Stats
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0, total: 0 });

  // Creation form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchProductQuery, setSearchProductQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productDropdownOpen, setProductDropdownOpen] = useState(false);
  
  const [reviewForm, setReviewForm] = useState({
    customerName: '',
    customerEmail: '',
    rating: 5,
    title: '',
    body: '',
    status: 'approved',
    orderId: '',
    adminNote: ''
  });

  // Action states
  const [modifyingId, setModifyingId] = useState<string | null>(null);
  const [noteEditId, setNoteEditId] = useState<string | null>(null);
  const [tempNote, setTempNote] = useState('');
  const [seeding, setSeeding] = useState(false);

  // Fetch products for dropdowns
  useEffect(() => {
    fetch('/api/products')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setProducts(data.data || []);
        }
      })
      .catch(err => console.error('Failed to load products list:', err));
  }, []);

  // Fetch reviews whenever filters change
  const fetchReviews = async () => {
    setLoading(true);
    try {
      const headers = await adminHeaders();
      const params = new URLSearchParams({
        status: statusTab,
        productId: productFilter,
        search: searchQuery,
        page: String(page),
        limit: '10'
      });

      const res = await fetch(`/api/admin/reviews?${params.toString()}`, { headers });
      const data = await res.json();

      if (data.success) {
        setReviews(data.data || []);
        setStats(data.stats || { pending: 0, approved: 0, rejected: 0, total: 0 });
        setTotalCount(data.pagination?.total || 0);
        setTotalPages(data.pagination?.totalPages || 1);
        setError(null);
      } else {
        setError(data.message || 'Failed to fetch reviews.');
      }
    } catch (err: any) {
      setError(err.message || 'Network error fetching reviews.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [statusTab, productFilter, page]);

  // Handle manual trigger search
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchReviews();
  };

  // Reset filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setProductFilter('All');
    setPage(1);
    setStatusTab('pending');
  };

  // Handle seed reviews
  const handleSeedReviews = async () => {
    if (!confirm('Are you sure you want to seed the 5 standard mock reviews? Existing reviews with duplicate IDs will be updated.')) return;
    setSeeding(true);
    try {
      const headers = await adminHeaders();
      const res = await fetch('/api/admin/reviews/seed', {
        method: 'POST',
        headers
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message || 'Seeded reviews successfully!');
        fetchReviews();
      } else {
        alert(data.message || 'Failed to seed reviews.');
      }
    } catch (err: any) {
      alert(err.message || 'Error occurred while seeding.');
    } finally {
      setSeeding(false);
    }
  };

  // Handle moderation status change
  const handleUpdateStatus = async (reviewId: string, newStatus: 'approved' | 'rejected' | 'pending') => {
    setModifyingId(reviewId);
    try {
      const headers = await adminHeaders(true);
      const res = await fetch(`/api/admin/reviews/${reviewId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        fetchReviews();
      } else {
        alert(data.message || 'Failed to update review status.');
      }
    } catch (err: any) {
      alert(err.message || 'Error updating status.');
    } finally {
      setModifyingId(null);
    }
  };

  // Save admin note
  const handleSaveNote = async (reviewId: string) => {
    setModifyingId(reviewId);
    try {
      const headers = await adminHeaders(true);
      const res = await fetch(`/api/admin/reviews/${reviewId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ adminNote: tempNote })
      });
      const data = await res.json();
      if (data.success) {
        setNoteEditId(null);
        fetchReviews();
      } else {
        alert(data.message || 'Failed to save admin note.');
      }
    } catch (err: any) {
      alert(err.message || 'Error saving note.');
    } finally {
      setModifyingId(null);
    }
  };

  // Delete review
  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm('Are you sure you want to permanently delete this review? This action cannot be undone.')) return;
    setModifyingId(reviewId);
    try {
      const headers = await adminHeaders();
      const res = await fetch(`/api/admin/reviews/${reviewId}`, {
        method: 'DELETE',
        headers
      });
      const data = await res.json();
      if (data.success) {
        fetchReviews();
      } else {
        alert(data.message || 'Failed to delete review.');
      }
    } catch (err: any) {
      alert(err.message || 'Error deleting review.');
    } finally {
      setModifyingId(null);
    }
  };

  // Create review manually from admin
  const handleCreateReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) {
      alert('Please select a product first.');
      return;
    }

    try {
      const headers = await adminHeaders(true);
      const res = await fetch('/api/admin/reviews', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          review: {
            ...reviewForm,
            productId: selectedProduct.id
          }
        })
      });
      const data = await res.json();
      if (data.success) {
        alert('Review created successfully!');
        setShowAddForm(false);
        setSelectedProduct(null);
        setSearchProductQuery('');
        setReviewForm({
          customerName: '',
          customerEmail: '',
          rating: 5,
          title: '',
          body: '',
          status: 'approved',
          orderId: '',
          adminNote: ''
        });
        fetchReviews();
      } else {
        alert(data.message || 'Failed to create review.');
      }
    } catch (err: any) {
      alert(err.message || 'Error creating review.');
    }
  };

  // Filter products for dropdown matching search query
  const filteredProductDropdown = products.filter(p => 
    p.name.toLowerCase().includes(searchProductQuery.toLowerCase()) ||
    p.id.toString().includes(searchProductQuery)
  );

  return (
    <div className="space-y-6">
      
      {/* 1. STATS BANNER / CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-neutral-200/60 rounded-xl p-4 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <RotateCcw className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-neutral-400">Pending Review</span>
            <h4 className="text-xl font-extrabold text-neutral-800">{stats.pending}</h4>
          </div>
        </div>

        <div className="bg-white border border-neutral-200/60 rounded-xl p-4 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Check className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-neutral-400">Approved Reviews</span>
            <h4 className="text-xl font-extrabold text-neutral-800">{stats.approved}</h4>
          </div>
        </div>

        <div className="bg-white border border-neutral-200/60 rounded-xl p-4 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
            <X className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-neutral-400">Rejected Reviews</span>
            <h4 className="text-xl font-extrabold text-neutral-800">{stats.rejected}</h4>
          </div>
        </div>

        {/* DEMO / SEEDING WORKSPACE */}
        <div className="bg-[#fcfcfb] border border-neutral-200 rounded-xl p-4 shadow-sm flex flex-col justify-between gap-2">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-neutral-500" />
            <span className="text-[10px] uppercase font-bold text-neutral-500">Seed Simulation</span>
          </div>
          <button
            onClick={handleSeedReviews}
            disabled={seeding}
            className="w-full bg-black text-white hover:bg-neutral-900 transition rounded-lg py-2 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Database className="w-3.5 h-3.5" />
            {seeding ? 'Seeding...' : 'Seed 5 Test Reviews'}
          </button>
        </div>
      </div>

      {/* 2. SUBMISSION FORM OVERLAY */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-extrabold text-neutral-900 uppercase tracking-wider">
          Reviews Moderation System
        </h3>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-black text-white hover:bg-neutral-800 transition text-xs font-bold uppercase py-2 px-4 rounded-lg flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          {showAddForm ? 'Hide Form' : 'Write Admin Review'}
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleCreateReview} className="bg-white border border-neutral-200 rounded-xl p-6 shadow-sm space-y-4 animate-fade-up max-w-2xl">
          <h4 className="font-extrabold text-sm text-neutral-800 uppercase tracking-wide border-b pb-2">
            Add Manual/Seed Review
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Searchable Product Dropdown */}
            <div className="relative">
              <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">
                Target Product *
              </label>
              <div 
                onClick={() => setProductDropdownOpen(!productDropdownOpen)}
                className="border border-neutral-300 rounded-lg px-3 py-2 text-sm flex items-center justify-between cursor-pointer bg-white"
              >
                <span className="truncate">
                  {selectedProduct ? selectedProduct.name : 'Select a live product...'}
                </span>
                <ChevronsUpDown className="w-4 h-4 text-neutral-400 shrink-0" />
              </div>

              {productDropdownOpen && (
                <div className="absolute left-0 right-0 mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg z-30 max-h-60 overflow-y-auto p-2 space-y-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-neutral-400" />
                    <input
                      type="text"
                      placeholder="Search product..."
                      value={searchProductQuery}
                      onChange={(e) => setSearchProductQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs border border-neutral-200 rounded outline-none focus:border-black"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  <div className="divide-y divide-neutral-100">
                    {filteredProductDropdown.length === 0 ? (
                      <div className="text-center py-3 text-xs text-neutral-400">No products found</div>
                    ) : (
                      filteredProductDropdown.map((p) => (
                        <div
                          key={p.id}
                          onClick={() => {
                            setSelectedProduct(p);
                            setProductDropdownOpen(false);
                          }}
                          className="flex items-center gap-2.5 p-2 hover:bg-neutral-50 rounded cursor-pointer transition text-xs"
                        >
                          <div className="relative w-8 h-10 bg-neutral-100 border rounded overflow-hidden shrink-0">
                            <Image src={p.img} alt={p.name} fill className="object-cover" />
                          </div>
                          <div className="truncate">
                            <h5 className="font-bold text-neutral-800 truncate">{p.name}</h5>
                            <span className="text-[9px] text-neutral-400 font-mono">#{p.id} · {p.cat}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Customer Name */}
            <div>
              <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">
                Customer Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Danish Khan"
                value={reviewForm.customerName}
                onChange={(e) => setReviewForm({ ...reviewForm, customerName: e.target.value })}
                className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-black"
              />
            </div>

            {/* Customer Email */}
            <div>
              <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">
                Customer Email *
              </label>
              <input
                type="email"
                required
                placeholder="e.g. danish@example.com"
                value={reviewForm.customerEmail}
                onChange={(e) => setReviewForm({ ...reviewForm, customerEmail: e.target.value })}
                className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-black"
              />
            </div>

            {/* Order ID */}
            <div>
              <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">
                Order ID (Optional - triggers verified purchase)
              </label>
              <input
                type="text"
                placeholder="e.g. CR-123456"
                value={reviewForm.orderId}
                onChange={(e) => setReviewForm({ ...reviewForm, orderId: e.target.value })}
                className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-black"
              />
            </div>

            {/* Rating */}
            <div>
              <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">
                Rating Star *
              </label>
              <select
                value={reviewForm.rating}
                onChange={(e) => setReviewForm({ ...reviewForm, rating: Number(e.target.value) })}
                className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm outline-none bg-white cursor-pointer"
              >
                <option value={5}>★★★★★ (5 Stars)</option>
                <option value={4}>★★★★☆ (4 Stars)</option>
                <option value={3}>★★★☆☆ (3 Stars)</option>
                <option value={2}>★★☆☆☆ (2 Stars)</option>
                <option value={1}>★☆☆☆☆ (1 Star)</option>
              </select>
            </div>

            {/* Moderation Status */}
            <div>
              <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">
                Review Status
              </label>
              <select
                value={reviewForm.status}
                onChange={(e) => setReviewForm({ ...reviewForm, status: e.target.value })}
                className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm outline-none bg-white cursor-pointer"
              >
                <option value="approved">Approved (Immediate Public)</option>
                <option value="pending">Pending Review</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">
              Review Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. High quality materials, very soft"
              value={reviewForm.title}
              onChange={(e) => setReviewForm({ ...reviewForm, title: e.target.value })}
              className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-black"
            />
          </div>

          {/* Body */}
          <div>
            <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">
              Review Body Content *
            </label>
            <textarea
              required
              rows={3}
              placeholder="Detailed description of the customer experience..."
              value={reviewForm.body}
              onChange={(e) => setReviewForm({ ...reviewForm, body: e.target.value })}
              className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-black resize-none"
            />
          </div>

          {/* Admin Note */}
          <div>
            <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">
              Internal Admin Note (Admin Only)
            </label>
            <input
              type="text"
              placeholder="Notes on verified customer authenticity..."
              value={reviewForm.adminNote}
              onChange={(e) => setReviewForm({ ...reviewForm, adminNote: e.target.value })}
              className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-black"
            />
          </div>

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setSelectedProduct(null);
              }}
              className="px-4 py-2 border border-neutral-300 rounded-lg text-xs font-bold uppercase text-neutral-600 hover:bg-neutral-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-black text-white rounded-lg text-xs font-bold uppercase hover:bg-neutral-800 transition cursor-pointer"
            >
              Submit Record
            </button>
          </div>
        </form>
      )}

      {/* 3. FILTERS BAR */}
      <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row items-center gap-3 justify-between">
        
        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Search className="absolute left-3 top-3 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Search customer, email, text..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-neutral-200 rounded-lg text-xs bg-neutral-50 focus:bg-white focus:border-black outline-none transition"
          />
        </form>

        {/* Product Filter */}
        <div className="flex items-center gap-2 w-full md:w-auto self-start md:self-auto">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-500 whitespace-nowrap">
            <Filter className="w-3.5 h-3.5" /> Product:
          </div>
          <select
            value={productFilter}
            onChange={(e) => {
              setProductFilter(e.target.value);
              setPage(1);
            }}
            className="text-xs font-bold border border-neutral-200 bg-white rounded-lg px-3 py-2 outline-none focus:border-black transition cursor-pointer w-full md:w-60"
          >
            <option value="All">All Products</option>
            {products.map(p => (
              <option key={p.id} value={p.id}>{p.name} (#{p.id})</option>
            ))}
          </select>

          <button
            onClick={handleResetFilters}
            className="text-xs font-bold text-neutral-500 hover:text-black border border-neutral-200 px-3 py-2 rounded-lg hover:bg-neutral-50 cursor-pointer"
          >
            Reset
          </button>
        </div>
      </div>

      {/* 4. MODERATION TAB SELECTOR */}
      <div className="flex border-b border-neutral-200 gap-1.5 overflow-x-auto pb-px">
        {(['pending', 'approved', 'rejected', 'all'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => {
              setStatusTab(tab);
              setPage(1);
            }}
            className={`py-2.5 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition whitespace-nowrap cursor-pointer ${
              statusTab === tab 
                ? 'border-black text-black font-extrabold' 
                : 'border-transparent text-neutral-400 hover:text-neutral-700'
            }`}
          >
            {tab} reviews ({
              tab === 'pending' ? stats.pending :
              tab === 'approved' ? stats.approved :
              tab === 'rejected' ? stats.rejected : stats.total
            })
          </button>
        ))}
      </div>

      {/* 5. REVIEWS LIST */}
      {loading ? (
        <div className="text-center py-16 bg-white border border-neutral-200/60 rounded-xl shadow-sm">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto mb-3"></div>
          <p className="text-xs text-neutral-400">Loading moderation records...</p>
        </div>
      ) : error ? (
        <div className="text-center py-16 bg-white border border-red-100 rounded-xl text-red-500 text-xs">
          {error}
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-20 bg-white border border-neutral-200/60 rounded-xl text-neutral-400 text-xs shadow-sm">
          No reviews found in this queue.
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((rev) => {
            const starCount = Math.min(Math.max(Number(rev.rating), 1), 5);
            const isEditingNote = noteEditId === rev.id;

            return (
              <div 
                key={rev.id} 
                className={`bg-white border rounded-xl p-5 shadow-sm space-y-4 transition ${
                  modifyingId === rev.id ? 'opacity-50 pointer-events-none' : ''
                }`}
              >
                
                {/* Header row: Star, Date, Status */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-100 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="flex text-amber-500">
                      {Array.from({ length: starCount }).map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 fill-current" />
                      ))}
                      {Array.from({ length: 5 - starCount }).map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 text-neutral-200" />
                      ))}
                    </div>
                    {rev.verifiedPurchase && (
                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[8px] font-extrabold px-1.5 py-0.5 rounded tracking-wide uppercase">
                        Verified Buyer
                      </span>
                    )}
                    <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded tracking-wide uppercase ${
                      rev.source === 'admin-seed' 
                        ? 'bg-purple-50 text-purple-700 border border-purple-100' 
                        : 'bg-blue-50 text-blue-700 border border-blue-100'
                    }`}>
                      {rev.source === 'admin-seed' ? 'Seed' : 'Customer'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[10px] text-neutral-400">
                    <span>{new Date(rev.createdAt).toLocaleDateString()}</span>
                    <span className="font-mono text-[9px] bg-neutral-100 px-1 py-0.5 rounded text-neutral-500">
                      #{rev.id}
                    </span>
                  </div>
                </div>

                {/* Main section: review details + product summary */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                  
                  {/* Left Column: Product Info */}
                  <div className="lg:col-span-1 border-r border-neutral-100 pr-4 space-y-2">
                    <span className="text-[8px] font-bold text-neutral-400 uppercase tracking-widest block">
                      Target Product
                    </span>
                    <div className="flex items-center gap-2.5">
                      <div className="relative w-10 h-13 bg-neutral-50 border rounded overflow-hidden shrink-0">
                        {/* Fallback image */}
                        <Image 
                          src={`/product-placeholder.png`} 
                          alt="Product" 
                          fill 
                          className="object-cover" 
                        />
                      </div>
                      <div className="min-w-0">
                        <h5 className="font-bold text-neutral-800 text-xs truncate" title={rev.productNameSnapshot}>
                          {rev.productNameSnapshot || 'Unknown Product'}
                        </h5>
                        <span className="text-[9px] text-neutral-400 font-mono">
                          ID: {rev.productId}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Middle Column: Review Details */}
                  <div className="lg:col-span-2 space-y-1.5">
                    <h4 className="font-bold text-sm text-neutral-800">{rev.title}</h4>
                    <p className="text-xs text-neutral-600 leading-relaxed font-sans">{rev.body}</p>

                    {/* Parcel Photos */}
                    {Array.isArray(rev.images) && rev.images.length > 0 && (
                      <div className="flex gap-2 pt-2 overflow-x-auto">
                        {rev.images.map((imgUrl: string, idx: number) => (
                          <a
                            key={idx}
                            href={imgUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block relative w-12 h-12 rounded-lg border border-neutral-300 overflow-hidden bg-white shrink-0 hover:opacity-90 transition shadow-2xs"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={imgUrl} alt={`Parcel photo ${idx + 1}`} className="w-full h-full object-cover" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right Column: Reviewer Info */}
                  <div className="lg:col-span-1 pl-0 lg:pl-4 border-t lg:border-t-0 border-neutral-100 pt-3 lg:pt-0 space-y-1.5 text-xs text-neutral-500">
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-neutral-400" />
                      <span className="font-bold text-neutral-800">{rev.customerName}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-neutral-400" />
                      <span className="truncate">{rev.customerEmail}</span>
                    </div>
                    {rev.orderId && (
                      <div className="flex items-center gap-1.5">
                        <ShoppingBag className="w-3.5 h-3.5 text-neutral-400" />
                        <span className="font-mono text-[10px] text-neutral-600 bg-neutral-50 border px-1.5 py-0.5 rounded">
                          Order: {rev.orderId}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Audit Moderation Notes */}
                <div className="bg-[#fafafa] border border-neutral-150 rounded-lg p-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                      Internal Admin Note
                    </span>
                    {!isEditingNote && (
                      <button
                        onClick={() => {
                          setNoteEditId(rev.id);
                          setTempNote(rev.adminNote || '');
                        }}
                        className="text-[10px] font-bold text-neutral-500 hover:text-black uppercase cursor-pointer"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                  {isEditingNote ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Add moderation auditing info..."
                        value={tempNote}
                        onChange={(e) => setTempNote(e.target.value)}
                        className="flex-1 text-xs border border-neutral-300 rounded px-2.5 py-1 outline-none bg-white focus:border-black"
                      />
                      <button
                        onClick={() => handleSaveNote(rev.id)}
                        className="bg-black text-white hover:bg-neutral-800 rounded px-3 text-[10px] font-bold uppercase cursor-pointer"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setNoteEditId(null)}
                        className="border border-neutral-300 text-neutral-600 rounded px-3 text-[10px] font-bold uppercase hover:bg-neutral-50 cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-neutral-600 italic">
                      {rev.adminNote || 'No administrative notes added to this review record.'}
                    </p>
                  )}
                </div>

                {/* Bottom Actions Row */}
                <div className="flex items-center justify-between border-t border-neutral-100 pt-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-neutral-400 uppercase mr-1">Status:</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                      rev.status === 'approved' ? 'bg-emerald-50 text-emerald-700' :
                      rev.status === 'rejected' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'
                    }`}>
                      {rev.status}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    {rev.status !== 'approved' && (
                      <button
                        onClick={() => handleUpdateStatus(rev.id, 'approved')}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold uppercase tracking-wide cursor-pointer flex items-center gap-1 shadow-sm transition"
                      >
                        <Check className="w-3.5 h-3.5" /> Approve
                      </button>
                    )}
                    {rev.status !== 'rejected' && (
                      <button
                        onClick={() => handleUpdateStatus(rev.id, 'rejected')}
                        className="px-3.5 py-1.5 border border-rose-200 hover:bg-rose-50 text-rose-600 rounded-lg text-xs font-bold uppercase tracking-wide cursor-pointer flex items-center gap-1 transition"
                      >
                        <X className="w-3.5 h-3.5" /> Reject
                      </button>
                    )}
                    {rev.status !== 'pending' && (
                      <button
                        onClick={() => handleUpdateStatus(rev.id, 'pending')}
                        className="px-3.5 py-1.5 border border-neutral-350 hover:bg-neutral-50 text-neutral-600 rounded-lg text-xs font-bold uppercase tracking-wide cursor-pointer flex items-center gap-1 transition"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Pending
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteReview(rev.id)}
                      className="w-8 h-8 rounded-lg border border-red-150 flex items-center justify-center hover:bg-red-50 hover:border-red-200 text-red-500 transition cursor-pointer"
                      title="Permanently Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* 6. PAGINATION NAVIGATION */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-neutral-200 bg-[#fcfcfb] px-4 py-3 sm:px-6 rounded-xl shadow-sm">
          <div className="flex flex-1 justify-between sm:hidden">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="relative inline-flex items-center rounded-md border border-neutral-300 bg-white px-4 py-2 text-xs font-bold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 transition cursor-pointer"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="relative ml-3 inline-flex items-center rounded-md border border-neutral-300 bg-white px-4 py-2 text-xs font-bold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 transition cursor-pointer"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-xs text-neutral-500">
                Showing <span className="font-bold text-neutral-900">{(page - 1) * 10 + 1}</span> to{' '}
                <span className="font-bold text-neutral-900">
                  {Math.min(page * 10, totalCount)}
                </span>{' '}
                of <span className="font-bold text-neutral-900">{totalCount}</span> records
              </p>
            </div>
            <div>
              <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm gap-1" aria-label="Pagination">
                {Array.from({ length: totalPages }).map((_, idx) => {
                  const pageNum = idx + 1;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`relative inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer border ${
                        page === pageNum
                          ? 'bg-black text-white border-black'
                          : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
