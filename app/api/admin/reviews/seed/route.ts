import { NextRequest, NextResponse } from 'next/server';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from '../../../../../lib/firebase';
import { requireAdmin } from '../../../../../lib/serverAuth';
import { ReviewDocument } from '../../../../../types/commerce';
import { recalculateProductReviewSummary } from '../../../../../lib/server/reviews';

// POST: Idempotently seed 5 mock reviews attached to real database products
export async function POST(req: NextRequest) {
  const adminCheck = await requireAdmin(req);
  if (adminCheck instanceof NextResponse) return adminCheck;

  try {
    // 1. Fetch available products in the database
    const productsSnap = await getDocs(collection(db, 'products'));
    const products: any[] = [];
    productsSnap.forEach(d => {
      products.push({ id: d.id, ...d.data() });
    });

    if (products.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No products exist in the database. Please seed products first before seeding reviews.'
      }, { status: 400 });
    }

    const now = new Date().toISOString();
    const affectedProductIds = new Set<string>();

    const fakeReviewsData = [
      {
        id: 'mock-rev-1',
        customerName: 'Ayesha K.',
        customerEmail: 'ayesha.k@example.com',
        rating: 5 as const,
        title: 'Premium Quality Fabric',
        body: 'The fabric quality is absolutely amazing and it fits true to size. Delivery was swift. Definitely ordering again!',
      },
      {
        id: 'mock-rev-2',
        customerName: 'Hamza R.',
        customerEmail: 'hamza.r@example.com',
        rating: 5 as const,
        title: 'Superb Product & Sizing',
        body: 'Extremely fast delivery and the jacket looks even better in real life than the pictures. Material is thick and premium.',
      },
      {
        id: 'mock-rev-3',
        customerName: 'Sana M.',
        customerEmail: 'sana.m@example.com',
        rating: 4 as const,
        title: 'Lovely Purchase',
        body: 'Loved the dress, exactly like the photos. The checkout was smooth and customer support was very helpful.',
      },
      {
        id: 'mock-rev-4',
        customerName: 'Bilal A.',
        customerEmail: 'bilal.a@example.com',
        rating: 5 as const,
        title: 'Extremely Comfortable',
        body: 'These are hands down the most comfortable everyday shoes I own. Great value for money and sizing is perfect.',
      },
      {
        id: 'mock-rev-5',
        customerName: 'Mahnoor S.',
        customerEmail: 'mahnoor.s@example.com',
        rating: 5 as const,
        title: 'Stunning Packaging!',
        body: 'Very impressive packaging and prompt delivery. Sizing fits like a glove and the tailoring is top-notch.',
      }
    ];

    const writePromises: Promise<void>[] = [];

    // Distribute fake reviews among real products
    fakeReviewsData.forEach((fake, index) => {
      // Pick a product sequentially or cycle if there are fewer than 5 products
      const product = products[index % products.length];
      const productId = String(product.id);
      affectedProductIds.add(productId);

      const reviewDoc: ReviewDocument = {
        id: fake.id,
        productId,
        productNameSnapshot: product.name || '',
        productSlugSnapshot: product.slug || '',
        userId: null,
        orderId: null,
        customerName: fake.customerName,
        customerEmail: fake.customerEmail,
        rating: fake.rating,
        title: fake.title,
        body: fake.body,
        status: 'approved', // Seeded reviews are approved by default
        verifiedPurchase: true,
        source: 'admin-seed',
        adminNote: 'Idempotent seed review',
        moderatedBy: adminCheck.uid,
        moderatedAt: now,
        createdAt: now,
        updatedAt: now,
      };

      writePromises.push(setDoc(doc(db, 'reviews', fake.id), reviewDoc));
    });

    // Save all seed review documents
    await Promise.all(writePromises);

    // Recalculate aggregates for all affected products
    const recalculatePromises: Promise<any>[] = [];
    affectedProductIds.forEach((prodId) => {
      recalculatePromises.push(recalculateProductReviewSummary(prodId));
    });
    await Promise.all(recalculatePromises);

    return NextResponse.json({
      success: true,
      message: `Successfully seeded 5 idempotent reviews across ${affectedProductIds.size} products.`,
      seededIds: fakeReviewsData.map(f => f.id),
      affectedProductIds: Array.from(affectedProductIds)
    });
  } catch (error: any) {
    console.error('[API POST /api/admin/reviews/seed] Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
