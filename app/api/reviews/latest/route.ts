import { NextResponse } from 'next/server';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../../../../lib/firebase';
import { ReviewDocument } from '../../../../types/commerce';

// GET: Fetch latest 5 approved reviews for homepage testimonials
export async function GET() {
  try {
    const revCol = collection(db, 'reviews');
    const snap = await getDocs(revCol);

    const approvedReviews: any[] = [];

    for (const docSnap of snap.docs) {
      const data = docSnap.data() as ReviewDocument;

      // Filter: approved only
      if (data.status !== 'approved') continue;

      // Verify product exists to exclude reviews of deleted products
      try {
        const prodRef = doc(db, 'products', data.productId);
        const prodSnap = await getDoc(prodRef);
        if (!prodSnap.exists()) continue;
      } catch {
        continue;
      }

      approvedReviews.push({
        id: data.id,
        productId: data.productId,
        productNameSnapshot: data.productNameSnapshot || '',
        productSlugSnapshot: data.productSlugSnapshot || '',
        customerName: data.customerName,
        rating: data.rating,
        title: data.title,
        body: data.body,
        verifiedPurchase: data.verifiedPurchase,
        createdAt: data.createdAt,
        moderatedAt: data.moderatedAt || null,
      });
    }

    // Sort: moderatedAt desc, fallback to createdAt desc
    approvedReviews.sort((a, b) => {
      const timeA = new Date(a.moderatedAt || a.createdAt).getTime();
      const timeB = new Date(b.moderatedAt || b.createdAt).getTime();
      return timeB - timeA;
    });

    // Cap at 5 reviews maximum
    const latestReviews = approvedReviews.slice(0, 5);

    return NextResponse.json({
      success: true,
      data: latestReviews,
    });
  } catch (error: any) {
    console.error('[API GET /api/reviews/latest] Error:', error);
    return NextResponse.json({ success: false, data: [], message: error.message }, { status: 500 });
  }
}
