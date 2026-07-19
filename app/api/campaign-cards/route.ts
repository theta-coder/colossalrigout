import { NextRequest, NextResponse } from 'next/server';
import { collection, getDocs, setDoc, doc, deleteDoc, getDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { requireAdmin } from '../../../lib/serverAuth';

const CARDS_COL = 'campaign-cards';
const IMAGES_COL = 'campaign-card-images';
const isManagedCardImage = (value: unknown): value is string =>
  typeof value === 'string' && /^data:image\/(webp|png|jpeg);base64,/.test(value) && value.length <= 900_000;
const isSafeInternalPath = (value: unknown) => typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') && !value.includes('\\');

// GET: Fetch all campaign cards with their background images (Admin & Public)
export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    if (admin instanceof NextResponse) return admin;
    const colRef = collection(db, CARDS_COL);
    const q = query(colRef, orderBy('order', 'asc'));
    const [cardsSnap, imagesSnap] = await Promise.all([
      getDocs(q),
      getDocs(collection(db, IMAGES_COL)),
    ]);

    const imageMap = new Map<string, string>();
    imagesSnap.forEach((d) => {
      const data = d.data();
      if (typeof data.dataUrl === 'string' && data.dataUrl.startsWith('data:image/'))
        imageMap.set(d.id, data.dataUrl);
    });

    const cards: any[] = [];
    cardsSnap.forEach((d) => {
      const data = d.data();
      cards.push({
        ...data,
        id: d.id,
        backgroundImageUrl: imageMap.get(d.id) || '',
      });
    });

    cards.sort((a, b) => (a.order || 0) - (b.order || 0));
    return NextResponse.json({ success: true, data: cards });
  } catch (error: any) {
    console.error('[API GET /api/campaign-cards] Error:', error);
    return NextResponse.json({ success: false, data: [], message: error.message }, { status: 500 });
  }
}

// POST: Create a new campaign card
export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    if (admin instanceof NextResponse) return admin;
    const { card } = await req.json();
    if (!card || !card.heading || !card.buttonText)
      return NextResponse.json({ success: false, message: 'Heading and Button text are required' }, { status: 400 });

    if (!card.startsAt || !card.endsAt)
      return NextResponse.json({ success: false, message: 'Start and end dates are required' }, { status: 400 });
    if (new Date(card.endsAt) <= new Date(card.startsAt))
      return NextResponse.json({ success: false, message: 'End date must be after start date' }, { status: 400 });

    const now = new Date().toISOString();
    const id = card.id || `card-${Date.now()}`;
    const bgImageUrl = isManagedCardImage(card.backgroundImageUrl) ? card.backgroundImageUrl : '';
    if (!bgImageUrl) return NextResponse.json({ success: false, message: 'An imported JPG, PNG, or WebP background image is required (maximum 900KB after compression).' }, { status: 400 });
    if (card.actionType === 'custom-page' && !isSafeInternalPath(card.internalPath))
      return NextResponse.json({ success: false, message: 'Custom destination must be a safe internal path beginning with /.' }, { status: 400 });

    const cardDoc = {
      id,
      internalName: String(card.internalName || card.heading || '').trim(),
      cardType: card.cardType || 'discount',
      eyebrowText: String(card.eyebrowText || '').trim(),
      heading: String(card.heading || '').trim(),
      description: String(card.description || '').trim(),
      buttonText: String(card.buttonText || '').trim(),
      imageId: id,
      overlayOpacity: Number(card.overlayOpacity ?? 0.4),
      textPosition: card.textPosition || 'bottom-left',
      actionType: card.actionType || 'campaign-products',
      productId: card.productId || '',
      collectionId: card.collectionId || '',
      storeId: card.storeId || '',
      internalPath: card.internalPath || '',
      hasDiscount: !!card.hasDiscount,
      promotionId: card.promotionId || '',
      startsAt: card.startsAt,
      endsAt: card.endsAt,
      timezone: card.timezone || 'Asia/Karachi',
      status: ['draft', 'active', 'inactive'].includes(card.status) ? card.status : 'draft',
      order: Number(card.order ?? 0),
      createdAt: card.createdAt || now,
      updatedAt: now,
    };

    const promises: Promise<void>[] = [setDoc(doc(db, CARDS_COL, id), cardDoc)];
    if (bgImageUrl) {
      promises.push(
        setDoc(doc(db, IMAGES_COL, id), {
          id,
          cardId: id,
          dataUrl: bgImageUrl,
          mimeType: 'image/webp',
          role: 'card-background',
          createdAt: card.createdAt || now,
          updatedAt: now,
        })
      );
    }
    await Promise.all(promises);

    console.log(`[API POST /api/campaign-cards] Created card "${cardDoc.heading}" (${id})`);
    return NextResponse.json({ success: true, data: { ...cardDoc, backgroundImageUrl: bgImageUrl } });
  } catch (error: any) {
    console.error('[API POST /api/campaign-cards] Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// PUT: Update an existing campaign card
export async function PUT(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    if (admin instanceof NextResponse) return admin;
    const { card } = await req.json();
    if (!card || !card.id)
      return NextResponse.json({ success: false, message: 'Card ID is required' }, { status: 400 });

    const existingRef = doc(db, CARDS_COL, card.id);
    const existingSnap = await getDoc(existingRef);
    if (!existingSnap.exists())
      return NextResponse.json({ success: false, message: 'Card not found' }, { status: 404 });

    const existing = existingSnap.data();
    const now = new Date().toISOString();
    const bgImageUrl = isManagedCardImage(card.backgroundImageUrl) ? card.backgroundImageUrl : '';
    if (card.actionType === 'custom-page' && !isSafeInternalPath(card.internalPath))
      return NextResponse.json({ success: false, message: 'Custom destination must be a safe internal path beginning with /.' }, { status: 400 });

    const existingImageSnap = await getDoc(doc(db, IMAGES_COL, card.id));
    const existingImageUrl = existingImageSnap.exists() ? String(existingImageSnap.data().dataUrl || '') : '';
    const finalImageUrl = bgImageUrl || existingImageUrl;

    const updatedDoc = {
      id: card.id,
      internalName: String(card.internalName ?? existing.internalName ?? '').trim(),
      cardType: card.cardType ?? existing.cardType ?? 'discount',
      eyebrowText: String(card.eyebrowText ?? existing.eyebrowText ?? '').trim(),
      heading: String(card.heading ?? existing.heading ?? '').trim(),
      description: String(card.description ?? existing.description ?? '').trim(),
      buttonText: String(card.buttonText ?? existing.buttonText ?? '').trim(),
      imageId: card.id,
      overlayOpacity: Number(card.overlayOpacity ?? existing.overlayOpacity ?? 0.4),
      textPosition: card.textPosition ?? existing.textPosition ?? 'bottom-left',
      actionType: card.actionType ?? existing.actionType ?? 'campaign-products',
      productId: card.productId ?? existing.productId ?? '',
      collectionId: card.collectionId ?? existing.collectionId ?? '',
      storeId: card.storeId ?? existing.storeId ?? '',
      internalPath: card.internalPath ?? existing.internalPath ?? '',
      hasDiscount: card.hasDiscount !== undefined ? !!card.hasDiscount : !!existing.hasDiscount,
      promotionId: card.promotionId ?? existing.promotionId ?? '',
      startsAt: card.startsAt || existing.startsAt,
      endsAt: card.endsAt || existing.endsAt,
      timezone: card.timezone || existing.timezone || 'Asia/Karachi',
      status: ['draft', 'active', 'inactive'].includes(card.status) ? card.status : (existing.status || 'draft'),
      order: Number(card.order ?? existing.order ?? 0),
      createdAt: existing.createdAt || now,
      updatedAt: now,
    };

    const promises: Promise<void>[] = [setDoc(existingRef, updatedDoc)];
    if (bgImageUrl) {
      promises.push(
        setDoc(doc(db, IMAGES_COL, card.id), {
          id: card.id,
          cardId: card.id,
          dataUrl: bgImageUrl,
          mimeType: 'image/webp',
          role: 'card-background',
          createdAt: existing.createdAt || now,
          updatedAt: now,
        })
      );
    }
    await Promise.all(promises);

    console.log(`[API PUT /api/campaign-cards] Updated card ${card.id}`);
    return NextResponse.json({ success: true, data: { ...updatedDoc, backgroundImageUrl: finalImageUrl } });
  } catch (error: any) {
    console.error('[API PUT /api/campaign-cards] Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// DELETE: Delete campaign card and its image
export async function DELETE(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    if (admin instanceof NextResponse) return admin;
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id)
      return NextResponse.json({ success: false, message: 'Card ID is required' }, { status: 400 });

    await Promise.all([
      deleteDoc(doc(db, CARDS_COL, id)),
      deleteDoc(doc(db, IMAGES_COL, id)),
    ]);

    console.log(`[API DELETE /api/campaign-cards] Deleted card ${id}`);
    return NextResponse.json({ success: true, message: 'Card deleted successfully' });
  } catch (error: any) {
    console.error('[API DELETE /api/campaign-cards] Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
