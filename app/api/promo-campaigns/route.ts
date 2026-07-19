import { NextRequest, NextResponse } from 'next/server';
import { collection, getDocs, setDoc, doc, deleteDoc, getDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

const CAMPAIGNS_COL = 'promo-campaigns';
const IMAGES_COL = 'promo-campaign-images';

// GET: Fetch all campaigns with their background images
export async function GET() {
  try {
    const colRef = collection(db, CAMPAIGNS_COL);
    const q = query(colRef, orderBy('order', 'asc'));
    const [campaignsSnap, imagesSnap] = await Promise.all([
      getDocs(q),
      getDocs(collection(db, IMAGES_COL)),
    ]);

    const imageMap = new Map<string, string>();
    imagesSnap.forEach((d) => {
      const data = d.data();
      if (typeof data.dataUrl === 'string' && data.dataUrl.startsWith('data:image/'))
        imageMap.set(d.id, data.dataUrl);
    });

    const campaigns: any[] = [];
    campaignsSnap.forEach((d) => {
      const data = d.data();
      campaigns.push({
        ...data,
        id: d.id,
        backgroundImageUrl: imageMap.get(d.id) || '',
      });
    });

    campaigns.sort((a, b) => (a.order || 0) - (b.order || 0));
    return NextResponse.json({ success: true, data: campaigns });
  } catch (error: any) {
    console.error('[API GET /api/promo-campaigns] Error:', error);
    return NextResponse.json({ success: false, data: [], message: error.message }, { status: 500 });
  }
}

// POST: Create a new campaign
export async function POST(req: NextRequest) {
  try {
    const { campaign } = await req.json();
    if (!campaign || !campaign.heading || !campaign.ctaText)
      return NextResponse.json({ success: false, message: 'Heading and CTA text are required' }, { status: 400 });

    // Validate dates
    if (!campaign.startsAt || !campaign.endsAt)
      return NextResponse.json({ success: false, message: 'Start and end dates are required' }, { status: 400 });
    if (new Date(campaign.endsAt) <= new Date(campaign.startsAt))
      return NextResponse.json({ success: false, message: 'End date must be after start date' }, { status: 400 });

    // Validate discount
    const discountValue = Number(campaign.discountValue || 0);
    if (discountValue <= 0)
      return NextResponse.json({ success: false, message: 'Discount value must be greater than 0' }, { status: 400 });
    if (campaign.discountType === 'percentage' && discountValue > 100)
      return NextResponse.json({ success: false, message: 'Percentage discount cannot exceed 100%' }, { status: 400 });

    // Validate targets
    if (campaign.targetType === 'selected-products' && (!Array.isArray(campaign.productIds) || campaign.productIds.length === 0))
      return NextResponse.json({ success: false, message: 'Select at least one product' }, { status: 400 });
    if (campaign.targetType === 'selected-categories' && (!Array.isArray(campaign.categoryIds) || campaign.categoryIds.length === 0))
      return NextResponse.json({ success: false, message: 'Select at least one category' }, { status: 400 });

    const now = new Date().toISOString();
    const id = campaign.id || `camp-${Date.now()}`;
    const bgImageUrl = typeof campaign.backgroundImageUrl === 'string' && campaign.backgroundImageUrl.startsWith('data:image/') ? campaign.backgroundImageUrl : '';

    const campaignDoc = {
      id,
      internalName: String(campaign.internalName || campaign.heading || '').trim(),
      badgeText: String(campaign.badgeText || '').trim(),
      heading: String(campaign.heading || '').trim(),
      description: String(campaign.description || '').trim(),
      highlightText: String(campaign.highlightText || '').trim(),
      ctaText: String(campaign.ctaText || 'Shop Now').trim(),
      discountMode: campaign.discountMode === 'coupon' ? 'coupon' : 'automatic',
      discountType: campaign.discountType === 'fixed' ? 'fixed' : 'percentage',
      discountValue,
      couponCode: String(campaign.couponCode || '').toUpperCase().trim(),
      minimumOrder: Number(campaign.minimumOrder || 0),
      targetType: ['all-products', 'selected-products', 'selected-categories'].includes(campaign.targetType) ? campaign.targetType : 'all-products',
      productIds: Array.isArray(campaign.productIds) ? campaign.productIds : [],
      categoryIds: Array.isArray(campaign.categoryIds) ? campaign.categoryIds : [],
      startsAt: campaign.startsAt,
      endsAt: campaign.endsAt,
      status: ['draft', 'active', 'inactive'].includes(campaign.status) ? campaign.status : 'draft',
      backgroundOverlayOpacity: Number(campaign.backgroundOverlayOpacity ?? 0.55),
      textAlignment: campaign.textAlignment === 'center' ? 'center' : 'left',
      order: Number(campaign.order ?? 0),
      createdAt: campaign.createdAt || now,
      updatedAt: now,
    };

    const promises: Promise<void>[] = [setDoc(doc(db, CAMPAIGNS_COL, id), campaignDoc)];
    if (bgImageUrl) {
      promises.push(
        setDoc(doc(db, IMAGES_COL, id), {
          id,
          campaignId: id,
          dataUrl: bgImageUrl,
          mimeType: 'image/webp',
          role: 'background',
          createdAt: campaign.createdAt || now,
          updatedAt: now,
        })
      );
    }
    await Promise.all(promises);

    console.log(`[API POST /api/promo-campaigns] Created campaign "${campaignDoc.heading}" (${id})`);
    return NextResponse.json({ success: true, data: { ...campaignDoc, backgroundImageUrl: bgImageUrl } });
  } catch (error: any) {
    console.error('[API POST /api/promo-campaigns] Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// PUT: Update existing campaign
export async function PUT(req: NextRequest) {
  try {
    const { campaign } = await req.json();
    if (!campaign || !campaign.id)
      return NextResponse.json({ success: false, message: 'Campaign ID is required' }, { status: 400 });

    const existingRef = doc(db, CAMPAIGNS_COL, campaign.id);
    const existingSnap = await getDoc(existingRef);
    if (!existingSnap.exists())
      return NextResponse.json({ success: false, message: 'Campaign not found' }, { status: 404 });

    const existing = existingSnap.data();
    const now = new Date().toISOString();
    const bgImageUrl = typeof campaign.backgroundImageUrl === 'string' && campaign.backgroundImageUrl.startsWith('data:image/') ? campaign.backgroundImageUrl : '';

    // If no new image, keep existing image reference
    const existingImageSnap = await getDoc(doc(db, IMAGES_COL, campaign.id));
    const existingImageUrl = existingImageSnap.exists() ? String(existingImageSnap.data().dataUrl || '') : '';
    const finalImageUrl = bgImageUrl || existingImageUrl;

    const updatedDoc = {
      id: campaign.id,
      internalName: String(campaign.internalName ?? existing.internalName ?? '').trim(),
      badgeText: String(campaign.badgeText ?? existing.badgeText ?? '').trim(),
      heading: String(campaign.heading ?? existing.heading ?? '').trim(),
      description: String(campaign.description ?? existing.description ?? '').trim(),
      highlightText: String(campaign.highlightText ?? existing.highlightText ?? '').trim(),
      ctaText: String(campaign.ctaText ?? existing.ctaText ?? 'Shop Now').trim(),
      discountMode: campaign.discountMode === 'coupon' ? 'coupon' : (campaign.discountMode ?? existing.discountMode ?? 'automatic'),
      discountType: campaign.discountType === 'fixed' ? 'fixed' : (campaign.discountType ?? existing.discountType ?? 'percentage'),
      discountValue: Number(campaign.discountValue ?? existing.discountValue ?? 0),
      couponCode: String(campaign.couponCode ?? existing.couponCode ?? '').toUpperCase().trim(),
      minimumOrder: Number(campaign.minimumOrder ?? existing.minimumOrder ?? 0),
      targetType: ['all-products', 'selected-products', 'selected-categories'].includes(campaign.targetType) ? campaign.targetType : (existing.targetType || 'all-products'),
      productIds: Array.isArray(campaign.productIds) ? campaign.productIds : (existing.productIds || []),
      categoryIds: Array.isArray(campaign.categoryIds) ? campaign.categoryIds : (existing.categoryIds || []),
      startsAt: campaign.startsAt || existing.startsAt,
      endsAt: campaign.endsAt || existing.endsAt,
      status: ['draft', 'active', 'inactive'].includes(campaign.status) ? campaign.status : (existing.status || 'draft'),
      backgroundOverlayOpacity: Number(campaign.backgroundOverlayOpacity ?? existing.backgroundOverlayOpacity ?? 0.55),
      textAlignment: campaign.textAlignment === 'center' ? 'center' : (campaign.textAlignment ?? existing.textAlignment ?? 'left'),
      order: Number(campaign.order ?? existing.order ?? 0),
      createdAt: existing.createdAt || now,
      updatedAt: now,
    };

    const promises: Promise<void>[] = [setDoc(existingRef, updatedDoc)];
    if (bgImageUrl) {
      promises.push(
        setDoc(doc(db, IMAGES_COL, campaign.id), {
          id: campaign.id,
          campaignId: campaign.id,
          dataUrl: bgImageUrl,
          mimeType: 'image/webp',
          role: 'background',
          createdAt: existing.createdAt || now,
          updatedAt: now,
        })
      );
    }
    await Promise.all(promises);

    console.log(`[API PUT /api/promo-campaigns] Updated campaign ${campaign.id}`);
    return NextResponse.json({ success: true, data: { ...updatedDoc, backgroundImageUrl: finalImageUrl } });
  } catch (error: any) {
    console.error('[API PUT /api/promo-campaigns] Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// DELETE: Delete campaign and its image
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id)
      return NextResponse.json({ success: false, message: 'Campaign ID is required' }, { status: 400 });

    await Promise.all([
      deleteDoc(doc(db, CAMPAIGNS_COL, id)),
      deleteDoc(doc(db, IMAGES_COL, id)),
    ]);

    console.log(`[API DELETE /api/promo-campaigns] Deleted campaign ${id}`);
    return NextResponse.json({ success: true, message: 'Campaign deleted successfully' });
  } catch (error: any) {
    console.error('[API DELETE /api/promo-campaigns] Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
