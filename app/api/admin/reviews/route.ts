import { NextRequest, NextResponse } from 'next/server';
import { collection, getDocs, doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../../../../lib/firebase';
import { requireAdmin } from '../../../../lib/serverAuth';
import { ReviewDocument } from '../../../../types/commerce';
import { validateReviewInput, recalculateProductReviewSummary } from '../../../../lib/server/reviews';

// GET: List all reviews with filters for admin panel moderation
export async function GET(req: NextRequest) {
  const adminCheck = await requireAdmin(req);
  if (adminCheck instanceof NextResponse) return adminCheck;

  try {
    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get('status'); // 'pending' | 'approved' | 'rejected' | 'all'
    const productIdFilter = searchParams.get('productId');
    const searchFilter = searchParams.get('search'); // query matching customer name, title, body, or product snapshot

    // Pagination query parameters
    const page = Math.max(1, Number(searchParams.get('page') || 1));
    const limit = Math.max(1, Number(searchParams.get('limit') || 10));

    const revCol = collection(db, 'reviews');
    const snap = await getDocs(revCol);

    const allReviews: ReviewDocument[] = [];
    let pendingCount = 0;
    let approvedCount = 0;
    let rejectedCount = 0;

    snap.forEach((docSnap) => {
      const data = docSnap.data() as ReviewDocument;
      allReviews.push(data);

      if (data.status === 'pending') pendingCount++;
      else if (data.status === 'approved') approvedCount++;
      else if (data.status === 'rejected') rejectedCount++;
    });

    // 1. Sort reviews newest first
    allReviews.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // 2. Apply filters
    let filteredReviews = allReviews;

    // Filter by status
    if (statusFilter && statusFilter !== 'all') {
      filteredReviews = filteredReviews.filter(r => r.status === statusFilter);
    }

    // Filter by product ID
    if (productIdFilter && productIdFilter !== 'All') {
      filteredReviews = filteredReviews.filter(r => r.productId === productIdFilter);
    }

    // Filter by search text
    if (searchFilter) {
      const q = searchFilter.toLowerCase().trim();
      filteredReviews = filteredReviews.filter(
        r =>
          (r.customerName || '').toLowerCase().includes(q) ||
          (r.customerEmail || '').toLowerCase().includes(q) ||
          (r.title || '').toLowerCase().includes(q) ||
          (r.body || '').toLowerCase().includes(q) ||
          (r.productNameSnapshot || '').toLowerCase().includes(q)
      );
    }

    // 3. Slice for page pagination
    const totalCount = filteredReviews.length;
    const startIndex = (page - 1) * limit;
    const paginatedReviews = filteredReviews.slice(startIndex, startIndex + limit);

    return NextResponse.json({
      success: true,
      data: paginatedReviews,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      },
      stats: {
        pending: pendingCount,
        approved: approvedCount,
        rejected: rejectedCount,
        total: allReviews.length
      }
    });
  } catch (error: any) {
    console.error('[API GET /api/admin/reviews] Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// POST: Add review manually from admin (useful for testing or support)
export async function POST(req: NextRequest) {
  const adminCheck = await requireAdmin(req);
  if (adminCheck instanceof NextResponse) return adminCheck;

  try {
    const body = await req.json();
    const { review: rawReview } = body;

    if (!rawReview) {
      return NextResponse.json({ success: false, message: 'Review data is required' }, { status: 400 });
    }

    // 1. Sanitize and validate inputs
    const validatedInput = validateReviewInput({
      productId: String(rawReview.productId || ''),
      customerName: String(rawReview.customerName || ''),
      customerEmail: String(rawReview.customerEmail || ''),
      rating: Number(rawReview.rating || 0),
      title: String(rawReview.title || 'Admin Review'),
      body: String(rawReview.body || ''),
      orderId: rawReview.orderId || null,
    });

    // 2. Verify product exists
    const prodRef = doc(db, 'products', validatedInput.productId);
    const prodSnap = await getDoc(prodRef);
    if (!prodSnap.exists()) {
      return NextResponse.json({ success: false, message: 'Selected product does not exist' }, { status: 404 });
    }

    const prodData = prodSnap.data();

    // 3. Save review document with custom status, source: 'admin-seed'
    const reviewId = `rev_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const now = new Date().toISOString();

    const reviewDoc: ReviewDocument = {
      id: reviewId,
      productId: validatedInput.productId,
      productNameSnapshot: prodData.name || '',
      productSlugSnapshot: prodData.slug || '',
      userId: null,
      orderId: validatedInput.orderId,
      customerName: validatedInput.customerName,
      customerEmail: validatedInput.customerEmail,
      rating: validatedInput.rating,
      title: validatedInput.title,
      body: validatedInput.body,
      status: ['approved', 'rejected', 'pending'].includes(rawReview.status) ? rawReview.status : 'approved',
      verifiedPurchase: validatedInput.orderId ? true : false,
      source: 'admin-seed',
      adminNote: String(rawReview.adminNote || '').trim(),
      moderatedBy: adminCheck.uid,
      moderatedAt: now,
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(doc(db, 'reviews', reviewId), reviewDoc);

    // 4. If approved, update product aggregate rating
    if (reviewDoc.status === 'approved') {
      await recalculateProductReviewSummary(reviewDoc.productId);
    }

    return NextResponse.json({
      success: true,
      data: reviewDoc,
      message: 'Review created successfully.',
    });
  } catch (error: any) {
    console.error('[API POST /api/admin/reviews] Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
