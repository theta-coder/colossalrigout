import { NextRequest, NextResponse } from 'next/server';
import { collection, getDocs, setDoc, doc, deleteDoc, getDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { requireAdmin } from '../../../lib/serverAuth';

const STORES_COL = 'stores';

// GET: Fetch all stores
export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    if (admin instanceof NextResponse) return admin;
    const colRef = collection(db, STORES_COL);
    const snap = await getDocs(colRef);
    const stores: any[] = [];
    snap.forEach((d) => {
      stores.push({
        ...d.data(),
        id: d.id,
      });
    });

    return NextResponse.json({ success: true, data: stores });
  } catch (error: any) {
    console.error('[API GET /api/stores] Error:', error);
    return NextResponse.json({ success: false, data: [], message: error.message }, { status: 500 });
  }
}

// POST: Create a new store
export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    if (admin instanceof NextResponse) return admin;
    const { store } = await req.json();
    if (!store || !store.name || !store.address || !store.city)
      return NextResponse.json({ success: false, message: 'Name, Address, and City are required' }, { status: 400 });

    const now = new Date().toISOString();
    const id = store.id || `store-${Date.now()}`;

    const storeDoc = {
      id,
      name: String(store.name).trim(),
      address: String(store.address).trim(),
      city: String(store.city).trim(),
      phone: String(store.phone || '').trim(),
      mapUrl: String(store.mapUrl || '').trim(),
      active: store.active !== undefined ? !!store.active : true,
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(doc(db, STORES_COL, id), storeDoc);
    console.log(`[API POST /api/stores] Created store "${storeDoc.name}" (${id})`);
    return NextResponse.json({ success: true, data: storeDoc });
  } catch (error: any) {
    console.error('[API POST /api/stores] Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// PUT: Update an existing store
export async function PUT(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    if (admin instanceof NextResponse) return admin;
    const { store } = await req.json();
    if (!store || !store.id)
      return NextResponse.json({ success: false, message: 'Store ID is required' }, { status: 400 });

    const existingRef = doc(db, STORES_COL, store.id);
    const existingSnap = await getDoc(existingRef);
    if (!existingSnap.exists())
      return NextResponse.json({ success: false, message: 'Store not found' }, { status: 404 });

    const existing = existingSnap.data();
    const now = new Date().toISOString();

    const updatedDoc = {
      id: store.id,
      name: String(store.name ?? existing.name ?? '').trim(),
      address: String(store.address ?? existing.address ?? '').trim(),
      city: String(store.city ?? existing.city ?? '').trim(),
      phone: String(store.phone ?? existing.phone ?? '').trim(),
      mapUrl: String(store.mapUrl ?? existing.mapUrl ?? '').trim(),
      active: store.active !== undefined ? !!store.active : (existing.active !== undefined ? !!existing.active : true),
      createdAt: existing.createdAt || now,
      updatedAt: now,
    };

    await setDoc(existingRef, updatedDoc);
    console.log(`[API PUT /api/stores] Updated store ${store.id}`);
    return NextResponse.json({ success: true, data: updatedDoc });
  } catch (error: any) {
    console.error('[API PUT /api/stores] Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// DELETE: Delete store
export async function DELETE(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    if (admin instanceof NextResponse) return admin;
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id)
      return NextResponse.json({ success: false, message: 'Store ID is required' }, { status: 400 });

    await deleteDoc(doc(db, STORES_COL, id));
    console.log(`[API DELETE /api/stores] Deleted store ${id}`);
    return NextResponse.json({ success: true, message: 'Store deleted successfully' });
  } catch (error: any) {
    console.error('[API DELETE /api/stores] Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
