import { NextRequest, NextResponse } from 'next/server';
import { collection, getDocs, setDoc, doc, query, where, getDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { verifyFirebaseUser } from '../../../lib/serverAuth';
import { validateReviewInput, verifyPurchasedProduct } from '../../../lib/server/reviews';
import { ReviewDocument } from '../../../types/commerce';

// GET: Public fetch of APPROVED reviews for a product (and summary info)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get('productId');
    const requestedLimit = Number(searchParams.get('limit') || 10);
    const responseLimit = Math.min(50, Math.max(1, Number.isFinite(requestedLimit) ? Math.floor(requestedLimit) : 10));

    if (!productId) {
      return NextResponse.json({ success: false, message: 'productId parameter is required' }, { status: 400 });
    }

    // Load product to confirm it exists
    const prodRef = doc(db, 'products', productId);
    const prodSnap = await getDoc(prodRef);
    if (!prodSnap.exists()) {
      return NextResponse.json({ success: false, message: 'Product not found' }, { status: 404 });
    }

    const prodData = prodSnap.data();

    // Query approved reviews for the product
    const revCol = collection(db, 'reviews');
    const q = query(revCol, where('productId', '==', productId), where('status', '==', 'approved'));
    const snapshot = await getDocs(q);

    const reviews: any[] = [];
    let totalRating = 0;
    const ratingBreakdown: Record<1 | 2 | 3 | 4 | 5, number> = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0
    };

    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as ReviewDocument;
      totalRating += data.rating;
      ratingBreakdown[data.rating]++;
      
      // Omit private fields for public response
      reviews.push({
        id: data.id,
        productId: data.productId,
        productNameSnapshot: data.productNameSnapshot || prodData.name || '',
        productSlugSnapshot: data.productSlugSnapshot || '',
        customerName: data.customerName,
        rating: data.rating,
        title: data.title,
        body: data.body,
        verifiedPurchase: data.verifiedPurchase,
        images: Array.isArray(data.images) ? data.images : [],
        createdAt: data.createdAt,
      });
    });

    // Sort newest first
    reviews.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const reviewCount = reviews.length;
    const averageRating = reviewCount > 0 
      ? Number((totalRating / reviewCount).toFixed(1)) 
      : 0;

    return NextResponse.json({
      success: true,
      data: reviews.slice(0, responseLimit),
      hasMore: reviews.length > responseLimit,
      summary: {
        averageRating,
        reviewCount,
        ratingBreakdown,
      }
    });
  } catch (error: any) {
    console.error('[API GET /api/reviews] Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// POST: Public submission of a new customer review (Saves as 'pending')
export async function POST(req: NextRequest) {
  try {
    const contentLength = Number(req.headers.get('content-length') || 0);
    if (contentLength > 20_000) {
      return NextResponse.json({ success: false, message: 'Review submission is too large' }, { status: 413 });
    }
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
      title: String(rawReview.title || 'Customer Review'),
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

    // 3. Resolve user session securely
    const verifiedUser = await verifyFirebaseUser(req);
    const userId = verifiedUser?.uid || null;

    // Prevent accidental/repeated submissions for the same product and email.
    const duplicateQuery = query(collection(db, 'reviews'), where('productId', '==', validatedInput.productId));
    const duplicateSnapshot = await getDocs(duplicateQuery);
    const duplicateCutoff = Date.now() - 10 * 60 * 1000;
    const isDuplicate = duplicateSnapshot.docs.some((reviewSnap) => {
      const data = reviewSnap.data() as ReviewDocument;
      return data.customerEmail?.toLowerCase() === validatedInput.customerEmail.toLowerCase()
        && new Date(data.createdAt).getTime() >= duplicateCutoff;
    });
    if (isDuplicate) {
      return NextResponse.json({ success: false, message: 'A review from this email was already submitted recently.' }, { status: 429 });
    }

    // 4. Verify purchase status server-side
    let verifiedPurchase = false;
    if (validatedInput.orderId) {
      verifiedPurchase = await verifyPurchasedProduct(
        userId,
        validatedInput.orderId,
        validatedInput.productId
      );
    }

    // 5. Save review document with 'pending' status
    const reviewId = `rev_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const now = new Date().toISOString();

    const reviewDoc: ReviewDocument = {
      id: reviewId,
      productId: validatedInput.productId,
      productNameSnapshot: prodData.name || '',
      productSlugSnapshot: prodData.slug || '',
      userId,
      orderId: validatedInput.orderId,
      customerName: validatedInput.customerName,
      customerEmail: validatedInput.customerEmail,
      rating: validatedInput.rating,
      title: validatedInput.title,
      body: validatedInput.body,
      images: Array.isArray(rawReview.images) ? rawReview.images.slice(0, 5) : [],
      status: 'pending', // Public reviews start as pending moderation
      verifiedPurchase,
      source: 'customer',
      adminNote: '',
      moderatedBy: null,
      moderatedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(doc(db, 'reviews', reviewId), reviewDoc);

    return NextResponse.json({
      success: true,
      data: {
        id: reviewDoc.id,
        productId: reviewDoc.productId,
        customerName: reviewDoc.customerName,
        rating: reviewDoc.rating,
        title: reviewDoc.title,
        body: reviewDoc.body,
        verifiedPurchase: reviewDoc.verifiedPurchase,
        status: reviewDoc.status,
        createdAt: reviewDoc.createdAt,
      },
      message: 'Thank you! Your review has been submitted and will appear once approved by our moderation team.',
    });
  } catch (error: any) {
    console.error('[API POST /api/reviews] Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
