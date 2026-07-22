import { NextRequest, NextResponse } from 'next/server';
import { collection, deleteDoc, doc, getDocs, setDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { requireAdmin } from '../../../lib/serverAuth';

const COLLECTION = 'trust-benefits';
const ICONS = ['truck', 'returns', 'shield', 'store', 'support', 'gift'] as const;
const defaults = [
  { id: 'free-shipping', title: 'Free Shipping', subtitle: 'On orders over PKR 5,000', icon: 'truck', order: 1, active: true },
  { id: 'easy-returns', title: 'Easy Returns', subtitle: '30-day return policy', icon: 'returns', order: 2, active: true },
  { id: 'secure-payment', title: 'Secure Payment', subtitle: '100% secure checkout', icon: 'shield', order: 3, active: true },
  { id: 'our-store', title: 'Our Store', subtitle: 'Gulberg, Lahore & more', icon: 'store', order: 4, active: true },
];

const cleanId = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

async function ensureDefaults() {
  const snapshot = await getDocs(collection(db, COLLECTION));
  if (!snapshot.empty) return snapshot;
  const now = new Date().toISOString();
  await Promise.all(defaults.map(item => setDoc(doc(db, COLLECTION, item.id), { ...item, createdAt: now, updatedAt: now })));
  return getDocs(collection(db, COLLECTION));
}

export async function GET(request: NextRequest) {
  try {
    const adminView = new URL(request.url).searchParams.get('admin') === 'true';
    if (adminView) {
      const admin = await requireAdmin(request);
      if (admin instanceof NextResponse) return admin;
    }
    const snapshot = await ensureDefaults();
    const data = snapshot.docs
      .map(item => ({ id: item.id, ...item.data() }) as any)
      .filter(item => adminView || item.active !== false)
      .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, data: [], message: error.message }, { status: 500 });
  }
}

async function save(request: NextRequest, update: boolean) {
  const admin = await requireAdmin(request);
  if (admin instanceof NextResponse) return admin;
  const { record = {} } = await request.json();
  const title = String(record.title || '').trim();
  const subtitle = String(record.subtitle || '').trim();
  if (!title || !subtitle) return NextResponse.json({ success: false, message: 'Title and subtitle are required.' }, { status: 400 });
  const id = update ? String(record.id || '') : cleanId(String(record.id || title));
  if (!id) return NextResponse.json({ success: false, message: 'Valid benefit ID is required.' }, { status: 400 });
  const now = new Date().toISOString();
  const saved = {
    id,
    title: title.slice(0, 60),
    subtitle: subtitle.slice(0, 120),
    icon: ICONS.includes(record.icon) ? record.icon : 'shield',
    order: Math.max(0, Number(record.order || 0)),
    active: record.active !== false,
    createdAt: record.createdAt || now,
    updatedAt: now,
  };
  await setDoc(doc(db, COLLECTION, id), saved, { merge: update });
  return NextResponse.json({ success: true, data: saved });
}

export async function POST(request: NextRequest) { try { return await save(request, false); } catch (error: any) { return NextResponse.json({ success: false, message: error.message }, { status: 500 }); } }
export async function PUT(request: NextRequest) { try { return await save(request, true); } catch (error: any) { return NextResponse.json({ success: false, message: error.message }, { status: 500 }); } }

export async function DELETE(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (admin instanceof NextResponse) return admin;
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ success: false, message: 'Benefit ID is required.' }, { status: 400 });
  await deleteDoc(doc(db, COLLECTION, id));
  return NextResponse.json({ success: true });
}
