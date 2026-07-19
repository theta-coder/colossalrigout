import { NextRequest, NextResponse } from 'next/server';
import { collection, getDocs, setDoc, doc, deleteDoc, getDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

const PROMOTIONS_COL = 'promotions';

// GET: Fetch all promotions (Admin)
export async function GET(req: NextRequest) {
  try {
    const colRef = collection(db, PROMOTIONS_COL);
    const snap = await getDocs(colRef);
    const promotions: any[] = [];
    snap.forEach((d) => {
      promotions.push({
        ...d.data(),
        id: d.id,
      });
    });

    return NextResponse.json({ success: true, data: promotions });
  } catch (error: any) {
    console.error('[API GET /api/promotions] Error:', error);
    return NextResponse.json({ success: false, data: [], message: error.message }, { status: 500 });
  }
}

// POST: Create a new promotion
export async function POST(req: NextRequest) {
  try {
    const { promotion } = await req.json();
    if (!promotion || !promotion.name || !promotion.publicMessage)
      return NextResponse.json({ success: false, message: 'Name and Public Message are required' }, { status: 400 });

    if (!promotion.startsAt || !promotion.endsAt)
      return NextResponse.json({ success: false, message: 'Start and end dates are required' }, { status: 400 });
    if (new Date(promotion.endsAt) <= new Date(promotion.startsAt))
      return NextResponse.json({ success: false, message: 'End date must be after start date' }, { status: 400 });

    const now = new Date().toISOString();
    const id = promotion.id || `promo-${Date.now()}`;

    const promoDoc = {
      id,
      name: String(promotion.name).trim(),
      publicMessage: String(promotion.publicMessage).trim(),
      discountType: promotion.discountType || 'percentage',
      discountValue: Number(promotion.discountValue || 0),
      maximumDiscount: promotion.maximumDiscount !== undefined ? Number(promotion.maximumDiscount) : null,
      minimumOrder: Number(promotion.minimumOrder || 0),
      applicationMode: promotion.applicationMode || 'coupon',
      couponCode: String(promotion.couponCode || '').toUpperCase().trim(),
      stackable: !!promotion.stackable,
      targetType: promotion.targetType || 'all-products',
      productIds: Array.isArray(promotion.productIds) ? promotion.productIds : [],
      categoryIds: Array.isArray(promotion.categoryIds) ? promotion.categoryIds : [],
      collectionIds: Array.isArray(promotion.collectionIds) ? promotion.collectionIds : [],
      loginRequired: !!promotion.loginRequired,
      maxUsesPerUser: promotion.maxUsesPerUser !== undefined ? Number(promotion.maxUsesPerUser) : 1,
      globalUsageLimit: promotion.globalUsageLimit !== undefined ? Number(promotion.globalUsageLimit) : null,
      usedCount: Number(promotion.usedCount || 0),
      channel: promotion.channel || 'online',
      storeIds: Array.isArray(promotion.storeIds) ? promotion.storeIds : [],
      startsAt: promotion.startsAt,
      endsAt: promotion.endsAt,
      status: ['draft', 'active', 'inactive'].includes(promotion.status) ? promotion.status : 'draft',
      createdAt: promotion.createdAt || now,
      updatedAt: now,
    };

    await setDoc(doc(db, PROMOTIONS_COL, id), promoDoc);
    console.log(`[API POST /api/promotions] Created promotion "${promoDoc.name}" (${id})`);
    return NextResponse.json({ success: true, data: promoDoc });
  } catch (error: any) {
    console.error('[API POST /api/promotions] Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// PUT: Update an existing promotion
export async function PUT(req: NextRequest) {
  try {
    const { promotion } = await req.json();
    if (!promotion || !promotion.id)
      return NextResponse.json({ success: false, message: 'Promotion ID is required' }, { status: 400 });

    const existingRef = doc(db, PROMOTIONS_COL, promotion.id);
    const existingSnap = await getDoc(existingRef);
    if (!existingSnap.exists())
      return NextResponse.json({ success: false, message: 'Promotion not found' }, { status: 404 });

    const existing = existingSnap.data();
    const now = new Date().toISOString();

    const updatedDoc = {
      id: promotion.id,
      name: String(promotion.name ?? existing.name ?? '').trim(),
      publicMessage: String(promotion.publicMessage ?? existing.publicMessage ?? '').trim(),
      discountType: promotion.discountType ?? existing.discountType ?? 'percentage',
      discountValue: Number(promotion.discountValue ?? existing.discountValue ?? 0),
      maximumDiscount: promotion.maximumDiscount !== undefined ? (promotion.maximumDiscount !== null ? Number(promotion.maximumDiscount) : null) : (existing.maximumDiscount ?? null),
      minimumOrder: Number(promotion.minimumOrder ?? existing.minimumOrder ?? 0),
      applicationMode: promotion.applicationMode ?? existing.applicationMode ?? 'coupon',
      couponCode: String(promotion.couponCode ?? existing.couponCode ?? '').toUpperCase().trim(),
      stackable: promotion.stackable !== undefined ? !!promotion.stackable : !!existing.stackable,
      targetType: promotion.targetType ?? existing.targetType ?? 'all-products',
      productIds: Array.isArray(promotion.productIds) ? promotion.productIds : (existing.productIds || []),
      categoryIds: Array.isArray(promotion.categoryIds) ? promotion.categoryIds : (existing.categoryIds || []),
      collectionIds: Array.isArray(promotion.collectionIds) ? promotion.collectionIds : (existing.collectionIds || []),
      loginRequired: promotion.loginRequired !== undefined ? !!promotion.loginRequired : !!existing.loginRequired,
      maxUsesPerUser: promotion.maxUsesPerUser !== undefined ? Number(promotion.maxUsesPerUser) : (existing.maxUsesPerUser !== undefined ? Number(existing.maxUsesPerUser) : 1),
      globalUsageLimit: promotion.globalUsageLimit !== undefined ? (promotion.globalUsageLimit !== null ? Number(promotion.globalUsageLimit) : null) : (existing.globalUsageLimit ?? null),
      usedCount: Number(promotion.usedCount ?? existing.usedCount ?? 0),
      channel: promotion.channel ?? existing.channel ?? 'online',
      storeIds: Array.isArray(promotion.storeIds) ? promotion.storeIds : (existing.storeIds || []),
      startsAt: promotion.startsAt || existing.startsAt,
      endsAt: promotion.endsAt || existing.endsAt,
      status: ['draft', 'active', 'inactive'].includes(promotion.status) ? promotion.status : (existing.status || 'draft'),
      createdAt: existing.createdAt || now,
      updatedAt: now,
    };

    await setDoc(existingRef, updatedDoc);
    console.log(`[API PUT /api/promotions] Updated promotion ${promotion.id}`);
    return NextResponse.json({ success: true, data: updatedDoc });
  } catch (error: any) {
    console.error('[API PUT /api/promotions] Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// DELETE: Delete promotion
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id)
      return NextResponse.json({ success: false, message: 'Promotion ID is required' }, { status: 400 });

    await deleteDoc(doc(db, PROMOTIONS_COL, id));
    console.log(`[API DELETE /api/promotions] Deleted promotion ${id}`);
    return NextResponse.json({ success: true, message: 'Promotion deleted successfully' });
  } catch (error: any) {
    console.error('[API DELETE /api/promotions] Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
