import { NextRequest, NextResponse } from 'next/server';
import { collection, getDocs, setDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { SizeDocument } from '../../../types/commerce';

const DEFAULT_SIZES: SizeDocument[] = [
  { id: 'sz-xs', name: 'Extra Small', code: 'XS', type: 'clothing', order: 1, active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'sz-s', name: 'Small', code: 'S', type: 'clothing', order: 2, active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'sz-m', name: 'Medium', code: 'M', type: 'clothing', order: 3, active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'sz-l', name: 'Large', code: 'L', type: 'clothing', order: 4, active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'sz-xl', name: 'Extra Large', code: 'XL', type: 'clothing', order: 5, active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'sz-xxl', name: 'Double XL', code: 'XXL', type: 'clothing', order: 6, active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'sz-30', name: '30', code: '30', type: 'clothing', order: 7, active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'sz-32', name: '32', code: '32', type: 'clothing', order: 8, active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'sz-34', name: '34', code: '34', type: 'clothing', order: 9, active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'sz-shoe-8', name: 'UK 8', code: 'UK 8', type: 'shoe', order: 10, active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'sz-shoe-9', name: 'UK 9', code: 'UK 9', type: 'shoe', order: 11, active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'sz-shoe-10', name: 'UK 10', code: 'UK 10', type: 'shoe', order: 12, active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];

export async function GET() {
  try {
    const colRef = collection(db, 'sizes');
    const snapshot = await getDocs(colRef);

    if (snapshot.empty) {
      try {
        for (const size of DEFAULT_SIZES) {
          await setDoc(doc(db, 'sizes', size.id), size);
        }
        return NextResponse.json({ sizes: DEFAULT_SIZES, source: 'seeded' });
      } catch (e) {
        return NextResponse.json({ sizes: DEFAULT_SIZES, source: 'fallback' });
      }
    }

    const sizes: SizeDocument[] = [];
    snapshot.forEach((docSnap) => {
      sizes.push(docSnap.data() as SizeDocument);
    });

    sizes.sort((a, b) => (a.order || 0) - (b.order || 0));
    return NextResponse.json({ sizes, source: 'firestore' });
  } catch (error: any) {
    return NextResponse.json({ sizes: DEFAULT_SIZES, source: 'fallback', error: error.message });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { size } = body;
    if (!size || !size.code) {
      return NextResponse.json({ error: 'Size code is required' }, { status: 400 });
    }

    const code = size.code.trim().toUpperCase();
    const id = size.id || `sz_${code.toLowerCase().replace(/[^a-z0-9]+/g, '-')}_${Date.now().toString(36)}`;

    const newSize: SizeDocument = {
      id,
      name: size.name ? size.name.trim() : code,
      code,
      type: size.type || 'clothing',
      order: size.order || Date.now(),
      active: size.active !== undefined ? size.active : true,
      createdAt: size.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await setDoc(doc(db, 'sizes', id), newSize);
    return NextResponse.json({ success: true, size: newSize });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Size ID is required' }, { status: 400 });
    }

    await deleteDoc(doc(db, 'sizes', id));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
