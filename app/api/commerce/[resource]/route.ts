import { NextRequest, NextResponse } from 'next/server';
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import { db } from '../../../../lib/firebase';

const collections: Record<string, string> = {
  colors: 'colors', sizes: 'sizes', 'size-guides': 'size-guides', collections: 'collections',
  reviews: 'reviews', inventory: 'product-variants'
};

const cleanId = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9_-]+/g, '-').replace(/^-|-$/g, '');

export async function GET(_: NextRequest, context: { params: Promise<{ resource: string }> }) {
  const { resource } = await context.params;
  const collectionName = collections[resource];
  if (!collectionName) return NextResponse.json({ success: false, message: 'Unknown resource' }, { status: 404 });
  try {
    const snapshot = await getDocs(collection(db, collectionName));
    const data = snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
    data.sort((a: any, b: any) => Number(a.order || 0) - Number(b.order || 0));
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ resource: string }> }) {
  const { resource } = await context.params;
  const collectionName = collections[resource];
  if (!collectionName) return NextResponse.json({ success: false, message: 'Unknown resource' }, { status: 404 });
  try {
    const body = await request.json();
    const record = body.record || {};
    const id = cleanId(String(record.id || record.slug || record.code || record.name || `${resource}-${Date.now()}`));
    if (!id) return NextResponse.json({ success: false, message: 'A valid name/code is required' }, { status: 400 });
    const now = new Date().toISOString();
    const saved = { ...record, id, createdAt: record.createdAt || now, updatedAt: now };
    await setDoc(doc(db, collectionName, id), saved);
    return NextResponse.json({ success: true, data: saved });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context: { params: Promise<{ resource: string }> }) {
  const { resource } = await context.params;
  const collectionName = collections[resource];
  if (!collectionName) return NextResponse.json({ success: false, message: 'Unknown resource' }, { status: 404 });
  try {
    const body = await request.json();
    const record = body.record || {};
    if (!record.id) return NextResponse.json({ success: false, message: 'Record ID is required' }, { status: 400 });
    const current = await getDoc(doc(db, collectionName, record.id));
    const saved = { ...(current.exists() ? current.data() : {}), ...record, updatedAt: new Date().toISOString() };
    await setDoc(doc(db, collectionName, record.id), saved);
    if (resource === 'reviews' && saved.productId) {
      const reviewSnapshot = await getDocs(collection(db, 'reviews'));
      const approved = reviewSnapshot.docs.map(item => item.data()).filter(item => item.productId === saved.productId && item.status === 'approved');
      const aggregateRating = approved.length ? approved.reduce((total, item) => total + Number(item.rating || 0), 0) / approved.length : 0;
      await setDoc(doc(db, 'products', String(saved.productId)), { aggregateRating: Number(aggregateRating.toFixed(2)), approvedReviewCount: approved.length, updatedAt: new Date().toISOString() }, { merge: true });
    }
    return NextResponse.json({ success: true, data: saved });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ resource: string }> }) {
  const { resource } = await context.params;
  const collectionName = collections[resource];
  const id = new URL(request.url).searchParams.get('id');
  if (!collectionName || !id) return NextResponse.json({ success: false, message: 'Resource and ID are required' }, { status: 400 });
  try {
    await deleteDoc(doc(db, collectionName, id));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
