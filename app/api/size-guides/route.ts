import { NextRequest, NextResponse } from 'next/server';
import { collection, getDocs, setDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { SizeGuideDocument } from '../../../types/commerce';

const DEFAULT_SIZE_GUIDES: SizeGuideDocument[] = [
  {
    id: 'sg-tops',
    name: 'Standard Tops & Shirts Size Guide',
    categoryIds: ['Shirts', 'Tops'],
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
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'sg-bottoms',
    name: 'Standard Pants & Bottoms Size Guide',
    categoryIds: ['Bottoms'],
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
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export async function GET() {
  try {
    const colRef = collection(db, 'size-guides');
    const snapshot = await getDocs(colRef);

    if (snapshot.empty) {
      try {
        for (const sg of DEFAULT_SIZE_GUIDES) {
          await setDoc(doc(db, 'size-guides', sg.id), sg);
        }
        return NextResponse.json({ sizeGuides: DEFAULT_SIZE_GUIDES, source: 'seeded' });
      } catch (e) {
        return NextResponse.json({ sizeGuides: DEFAULT_SIZE_GUIDES, source: 'fallback' });
      }
    }

    const sizeGuides: SizeGuideDocument[] = [];
    snapshot.forEach((docSnap) => {
      sizeGuides.push(docSnap.data() as SizeGuideDocument);
    });

    return NextResponse.json({ sizeGuides, source: 'firestore' });
  } catch (error: any) {
    return NextResponse.json({ sizeGuides: DEFAULT_SIZE_GUIDES, source: 'fallback', error: error.message });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sizeGuide } = body;
    if (!sizeGuide || !sizeGuide.name) {
      return NextResponse.json({ error: 'Size guide name is required' }, { status: 400 });
    }

    const id = sizeGuide.id || `sg_${Date.now().toString(36)}`;
    const newGuide: SizeGuideDocument = {
      ...sizeGuide,
      id,
      active: sizeGuide.active !== undefined ? sizeGuide.active : true,
      createdAt: sizeGuide.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await setDoc(doc(db, 'size-guides', id), newGuide);
    return NextResponse.json({ success: true, sizeGuide: newGuide });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Size guide ID is required' }, { status: 400 });
    }

    await deleteDoc(doc(db, 'size-guides', id));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
