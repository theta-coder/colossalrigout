import { NextRequest, NextResponse } from 'next/server';
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import { db } from '../../../../lib/firebase';

const collections: Record<string, string> = {
  colors: 'colors', sizes: 'sizes', 'size-guides': 'size-guides', collections: 'collections',
  inventory: 'product-variants'
};

const cleanId = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9_-]+/g, '-').replace(/^-|-$/g, '');

const DEFAULT_SIZE_GUIDES = [
  {
    id: 'sg-tops',
    name: 'Standard Tops & Shirts Size Guide',
    unit: 'in',
    columns: [
      { key: 'chest', label: 'Chest (inches)', order: 1 },
      { key: 'length', label: 'Body Length (inches)', order: 2 },
      { key: 'shoulder', label: 'Shoulder (inches)', order: 3 },
    ],
    rows: [
      { sizeId: 'sz-s', sizeName: 'S', values: { chest: '36 - 38', length: '27.5', shoulder: '17.0' }, order: 1 },
      { sizeId: 'sz-m', sizeName: 'M', values: { chest: '38 - 40', length: '28.5', shoulder: '18.0' }, order: 2 },
      { sizeId: 'sz-l', sizeName: 'L', values: { chest: '40 - 42', length: '29.5', shoulder: '19.0' }, order: 3 },
      { sizeId: 'sz-xl', sizeName: 'XL', values: { chest: '42 - 44', length: '30.5', shoulder: '20.0' }, order: 4 },
    ],
    instructions: 'Measure around the fullest part of your chest, keeping the tape horizontal.',
    active: true,
  },
  {
    id: 'sg-bottoms',
    name: 'Standard Pants & Bottoms Size Guide',
    unit: 'in',
    columns: [
      { key: 'waist', label: 'Waist (inches)', order: 1 },
      { key: 'hip', label: 'Hip (inches)', order: 2 },
      { key: 'inseam', label: 'Inseam (inches)', order: 3 },
    ],
    rows: [
      { sizeId: 'sz-s', sizeName: 'S (30)', values: { waist: '30.0', hip: '38.0', inseam: '31.0' }, order: 1 },
      { sizeId: 'sz-m', sizeName: 'M (32)', values: { waist: '32.0', hip: '40.0', inseam: '32.0' }, order: 2 },
      { sizeId: 'sz-l', sizeName: 'L (34)', values: { waist: '34.0', hip: '42.0', inseam: '32.5' }, order: 3 },
    ],
    instructions: 'Measure around your natural waistline, keeping the tape comfortably loose.',
    active: true,
  },
  {
    id: 'sg-outerwear',
    name: 'Outerwear & Jackets Size Guide',
    unit: 'in',
    columns: [
      { key: 'chest', label: 'Chest (inches)', order: 1 },
      { key: 'sleeve', label: 'Sleeve Length (inches)', order: 2 },
      { key: 'length', label: 'Jacket Length (inches)', order: 3 },
    ],
    rows: [
      { sizeId: 'sz-s', sizeName: 'S', values: { chest: '38 - 40', sleeve: '33.5', length: '28.0' }, order: 1 },
      { sizeId: 'sz-m', sizeName: 'M', values: { chest: '40 - 42', sleeve: '34.5', length: '29.0' }, order: 2 },
      { sizeId: 'sz-l', sizeName: 'L', values: { chest: '42 - 44', sleeve: '35.5', length: '30.0' }, order: 3 },
      { sizeId: 'sz-xl', sizeName: 'XL', values: { chest: '44 - 46', sleeve: '36.5', length: '31.0' }, order: 4 },
    ],
    instructions: 'Measure around chest with a light sweater under tape.',
    active: true,
  },
];

export async function GET(_: NextRequest, context: { params: Promise<{ resource: string }> }) {
  const { resource } = await context.params;
  const collectionName = collections[resource];
  if (!collectionName) return NextResponse.json({ success: false, message: 'Unknown resource' }, { status: 404 });
  try {
    const snapshot = await getDocs(collection(db, collectionName));
    if (snapshot.empty && resource === 'size-guides') {
      try {
        for (const sg of DEFAULT_SIZE_GUIDES) {
          await setDoc(doc(db, 'size-guides', sg.id), sg);
        }
        return NextResponse.json({ success: true, data: DEFAULT_SIZE_GUIDES });
      } catch (e) {
        return NextResponse.json({ success: true, data: DEFAULT_SIZE_GUIDES });
      }
    }
    const data = snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
    data.sort((a: any, b: any) => Number(a.order || 0) - Number(b.order || 0));
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    if (resource === 'size-guides') {
      return NextResponse.json({ success: true, data: DEFAULT_SIZE_GUIDES });
    }
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
    const saved = {
      ...record,
      ...(resource === 'reviews' ? { status: 'pending', verifiedPurchase: false } : {}),
      id,
      createdAt: record.createdAt || now,
      updatedAt: now
    };
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
