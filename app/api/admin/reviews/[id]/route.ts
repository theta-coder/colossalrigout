import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../../../../lib/firebase';
import { requireAdmin } from '../../../../../lib/serverAuth';
import { ReviewDocument } from '../../../../../types/commerce';
import { recalculateProductReviewSummary } from '../../../../../lib/server/reviews';

// PATCH: Update review moderation status and admin notes
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const adminCheck = await requireAdmin(req);
  if (adminCheck instanceof NextResponse) return adminCheck;

  try {
    const { id } = await context.params;
    const body = await req.json();
    const { status, adminNote } = body;

    if (!id) {
      return NextResponse.json({ success: false, message: 'Review ID is required' }, { status: 400 });
    }

    if (status && !['approved', 'rejected', 'pending'].includes(status)) {
      return NextResponse.json({ success: false, message: 'Invalid status value' }, { status: 400 });
    }

    const reviewRef = doc(db, 'reviews', id);
    const reviewSnap = await getDoc(reviewRef);

    if (!reviewSnap.exists()) {
      return NextResponse.json({ success: false, message: 'Review not found' }, { status: 404 });
    }

    const reviewData = reviewSnap.data() as ReviewDocument;
    const now = new Date().toISOString();

    const updates: Partial<ReviewDocument> = {
      updatedAt: now,
    };

    if (status) {
      updates.status = status;
      updates.moderatedBy = adminCheck.uid;
      updates.moderatedAt = now;
    }

    if (typeof adminNote === 'string') {
      updates.adminNote = adminNote.trim();
    }

    await updateDoc(reviewRef, updates);

    // Rebuild product review aggregates
    await recalculateProductReviewSummary(reviewData.productId);

    try {
      revalidatePath('/');
      if (reviewData.productSlugSnapshot) revalidatePath(`/product/${reviewData.productSlugSnapshot}`);
      revalidateTag('homepage');
      revalidateTag('homepage:reviews');
      revalidateTag(`product:${reviewData.productId}`);
    } catch {}

    return NextResponse.json({
      success: true,
      message: 'Review moderated successfully.',
      data: {
        id,
        status: status || reviewData.status,
      }
    });
  } catch (error: any) {
    console.error('[API PATCH /api/admin/reviews/[id]] Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// DELETE: Deletes a review and recalculates rating aggregates
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const adminCheck = await requireAdmin(req);
  if (adminCheck instanceof NextResponse) return adminCheck;

  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json({ success: false, message: 'Review ID is required' }, { status: 400 });
    }

    const reviewRef = doc(db, 'reviews', id);
    const reviewSnap = await getDoc(reviewRef);

    if (!reviewSnap.exists()) {
      return NextResponse.json({ success: false, message: 'Review not found' }, { status: 404 });
    }

    const reviewData = reviewSnap.data() as ReviewDocument;

    // Hard delete review
    await deleteDoc(reviewRef);

    // Rebuild aggregates
    await recalculateProductReviewSummary(reviewData.productId);

    try {
      revalidatePath('/');
      if (reviewData.productSlugSnapshot) revalidatePath(`/product/${reviewData.productSlugSnapshot}`);
      revalidateTag('homepage');
      revalidateTag('homepage:reviews');
      revalidateTag(`product:${reviewData.productId}`);
    } catch {}

    return NextResponse.json({
      success: true,
      message: 'Review deleted successfully.'
    });
  } catch (error: any) {
    console.error('[API DELETE /api/admin/reviews/[id]] Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
