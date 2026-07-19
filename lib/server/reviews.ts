import { collection, doc, getDocs, getDoc, query, where, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

export interface ReviewInput {
  productId: string;
  customerName: string;
  customerEmail: string;
  rating: number;
  title: string;
  body: string;
  orderId?: string | null;
}

// 1. Validate and sanitize review inputs
export function validateReviewInput(input: ReviewInput) {
  if (!input.productId) {
    throw new Error('Product ID is required.');
  }

  const name = String(input.customerName || '').trim();
  if (name.length < 2 || name.length > 80) {
    throw new Error('Customer name must be between 2 and 80 characters.');
  }

  const email = String(input.customerEmail || '').trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error('A valid email address is required.');
  }

  const rating = Math.floor(Number(input.rating || 0));
  if (rating < 1 || rating > 5) {
    throw new Error('Rating must be an integer between 1 and 5.');
  }

  const title = String(input.title || '').trim().replace(/<[^>]*>/g, '');
  if (title.length < 3 || title.length > 120) {
    throw new Error('Title must be between 3 and 120 characters.');
  }

  const body = String(input.body || '').trim().replace(/<[^>]*>/g, '');
  if (body.length < 10 || body.length > 1500) {
    throw new Error('Review body must be between 10 and 1500 characters.');
  }

  return {
    productId: String(input.productId),
    customerName: name,
    customerEmail: email,
    rating: rating as 1 | 2 | 3 | 4 | 5,
    title,
    body,
    orderId: input.orderId ? String(input.orderId).trim() : null,
  };
}

// 2. Recalculate average rating, count, and breakdown for a product
export async function recalculateProductReviewSummary(productId: string): Promise<{
  aggregateRating: number;
  approvedReviewCount: number;
  ratingBreakdown: Record<1 | 2 | 3 | 4 | 5, number>;
}> {
  const revCol = collection(db, 'reviews');
  const q = query(revCol, where('productId', '==', productId), where('status', '==', 'approved'));
  const snap = await getDocs(q);

  let totalRating = 0;
  let approvedReviewCount = 0;
  const ratingBreakdown: Record<1 | 2 | 3 | 4 | 5, number> = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0
  };

  snap.forEach((d) => {
    const data = d.data();
    const rating = Math.min(Math.max(Math.floor(Number(data.rating || 0)), 1), 5) as 1 | 2 | 3 | 4 | 5;
    totalRating += rating;
    approvedReviewCount++;
    ratingBreakdown[rating]++;
  });

  const aggregateRating = approvedReviewCount > 0 
    ? Number((totalRating / approvedReviewCount).toFixed(1)) 
    : 0;

  // Update product document with dynamic reviews aggregation fields
  const prodRef = doc(db, 'products', productId);
  const prodSnap = await getDoc(prodRef);
  if (prodSnap.exists()) {
    await updateDoc(prodRef, {
      aggregateRating,
      approvedReviewCount,
      ratingBreakdown,
      rating: String(aggregateRating),
      reviews: String(approvedReviewCount),
      reviewsUpdatedAt: new Date().toISOString()
    });
  }

  return {
    aggregateRating,
    approvedReviewCount,
    ratingBreakdown
  };
}

// 3. Verify server-side if user/guest purchased this product in the given order
export async function verifyPurchasedProduct(
  userId: string | null,
  orderId: string | null,
  productId: string
): Promise<boolean> {
  if (!orderId) return false;

  try {
    const orderRef = doc(db, 'orders', orderId);
    const orderSnap = await getDoc(orderRef);
    if (!orderSnap.exists()) return false;

    const orderData = orderSnap.data();

    // Verify order owner matches userId if logged in
    if (userId && orderData.ownerId && orderData.ownerId !== userId) {
      return false;
    }

    // Verify product is in the order items list
    const items = Array.isArray(orderData.items) ? orderData.items : [];
    const hasProduct = items.some(
      (item: any) => String(item.productId || item.id) === String(productId)
    );

    return hasProduct;
  } catch (error) {
    console.error('[verifyPurchasedProduct] Error verifying purchase:', error);
    return false;
  }
}
