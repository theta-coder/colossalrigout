import { NextRequest, NextResponse } from 'next/server';
import { collection, getDocs, setDoc, doc, query, where, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { ReviewDocument } from '../../../types/commerce';

// GET: Fetch reviews for a product (or all reviews for admin)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get('productId');
    const status = searchParams.get('status');

    const revCol = collection(db, 'reviews');
    let snapshot;

    if (productId && status) {
      const q = query(revCol, where('productId', '==', productId), where('status', '==', status));
      snapshot = await getDocs(q);
    } else if (productId) {
      const q = query(revCol, where('productId', '==', productId));
      snapshot = await getDocs(q);
    } else if (status) {
      const q = query(revCol, where('status', '==', status));
      snapshot = await getDocs(q);
    } else {
      snapshot = await getDocs(revCol);
    }

    const reviews: ReviewDocument[] = [];
    snapshot.forEach((docSnap) => {
      reviews.push(docSnap.data() as ReviewDocument);
    });

    reviews.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return NextResponse.json({ reviews });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Submit a new customer review (Status defaults to 'pending')
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { review } = body;

    if (!review || !review.productId || !review.customerName || !review.customerEmail || !review.rating || !review.body) {
      return NextResponse.json({ error: 'Missing required review fields' }, { status: 400 });
    }

    const ratingNum = Math.min(Math.max(Number(review.rating), 1), 5) as 1 | 2 | 3 | 4 | 5;
    const reviewId = `rev_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    const newReview: ReviewDocument = {
      id: reviewId,
      productId: String(review.productId),
      userId: review.userId || null,
      orderId: review.orderId || null,
      customerName: review.customerName.trim(),
      customerEmail: review.customerEmail.trim(),
      rating: ratingNum,
      title: review.title ? review.title.trim() : 'Customer Review',
      body: review.body.trim(),
      status: 'pending', // Public approval required
      verifiedPurchase: !!review.orderId,
      createdAt: new Date().toISOString(),
    };

    await setDoc(doc(db, 'reviews', reviewId), newReview);
    return NextResponse.json({ 
      success: true, 
      review: newReview,
      message: 'Thank you! Your review has been submitted and will appear once approved by our team.'
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT: Admin Moderation (Approve or Reject review)
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { reviewId, status, adminNote } = body;

    if (!reviewId || !['approved', 'rejected', 'pending'].includes(status)) {
      return NextResponse.json({ error: 'Valid reviewId and status (approved/rejected) required' }, { status: 400 });
    }

    const revRef = doc(db, 'reviews', reviewId);
    const revSnap = await getDoc(revRef);

    if (!revSnap.exists()) {
      return NextResponse.json({ error: 'Review document not found' }, { status: 404 });
    }

    const existingRev = revSnap.data() as ReviewDocument;

    await updateDoc(revRef, {
      status,
      adminNote: adminNote || '',
      moderatedAt: new Date().toISOString(),
    });

    // If status changed to approved, recalculate product aggregate rating
    if (status === 'approved' && existingRev.productId) {
      try {
        const prodRef = doc(db, 'products', existingRev.productId);
        const prodSnap = await getDoc(prodRef);
        if (prodSnap.exists()) {
          // Query all approved reviews for this product
          const approvedQ = query(collection(db, 'reviews'), where('productId', '==', existingRev.productId), where('status', '==', 'approved'));
          const approvedSnap = await getDocs(approvedQ);

          let totalRating = 0;
          let count = 0;
          approvedSnap.forEach((d) => {
            totalRating += Number(d.data().rating || 0);
            count++;
          });

          // Add the newly approved review if query didn't capture it yet
          if (count === 0) {
            totalRating = existingRev.rating;
            count = 1;
          }

          const avgRating = Number((totalRating / count).toFixed(1));

          await updateDoc(prodRef, {
            aggregateRating: avgRating,
            approvedReviewCount: count,
            rating: String(avgRating),
            reviews: `${count}`,
          });
        }
      } catch (e) {
        console.warn('Failed to update product aggregate rating:', e);
      }
    }

    return NextResponse.json({ success: true, reviewId, status });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
