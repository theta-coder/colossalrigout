import { NextRequest, NextResponse } from 'next/server';
import { collection, getDocs, setDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { ColorDocument } from '../../../types/commerce';

const DEFAULT_COLORS: ColorDocument[] = [
  { id: 'col-black', name: 'Black', slug: 'black', hex: '#000000', swatchType: 'solid', active: true, order: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'col-stone', name: 'Stone', slug: 'stone', hex: '#D6D3D1', swatchType: 'solid', active: true, order: 2, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'col-navy', name: 'Navy', slug: 'navy', hex: '#1E3A8A', swatchType: 'solid', active: true, order: 3, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'col-blue', name: 'Blue', slug: 'blue', hex: '#2563EB', swatchType: 'solid', active: true, order: 4, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'col-white', name: 'White', slug: 'white', hex: '#FFFFFF', swatchType: 'solid', active: true, order: 5, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'col-grey', name: 'Grey', slug: 'grey', hex: '#6B7280', swatchType: 'solid', active: true, order: 6, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'col-amber', name: 'Amber', slug: 'amber', hex: '#92400E', swatchType: 'solid', active: true, order: 7, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];

export async function GET() {
  try {
    const colRef = collection(db, 'colors');
    const snapshot = await getDocs(colRef);

    if (snapshot.empty) {
      // Seed default colors if collection is empty
      try {
        for (const color of DEFAULT_COLORS) {
          await setDoc(doc(db, 'colors', color.id), color);
        }
        return NextResponse.json({ colors: DEFAULT_COLORS, source: 'seeded' });
      } catch (e) {
        return NextResponse.json({ colors: DEFAULT_COLORS, source: 'fallback' });
      }
    }

    const colors: ColorDocument[] = [];
    snapshot.forEach((docSnap) => {
      colors.push(docSnap.data() as ColorDocument);
    });

    colors.sort((a, b) => (a.order || 0) - (b.order || 0));
    return NextResponse.json({ colors, source: 'firestore' });
  } catch (error: any) {
    return NextResponse.json({ colors: DEFAULT_COLORS, source: 'fallback', error: error.message });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { color } = body;
    if (!color || !color.name || !color.hex) {
      return NextResponse.json({ error: 'Color name and HEX are required' }, { status: 400 });
    }

    // Normalize HEX
    let hex = color.hex.trim().toUpperCase();
    if (!hex.startsWith('#')) hex = `#${hex}`;
    if (hex.length === 4) {
      hex = `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
    }

    const slug = color.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
    const id = color.id || `col_${slug}_${Date.now().toString(36)}`;

    const newColor: ColorDocument = {
      id,
      name: color.name.trim(),
      slug,
      hex,
      secondaryHex: color.secondaryHex ? color.secondaryHex.trim().toUpperCase() : null,
      swatchType: color.secondaryHex ? 'dual' : 'solid',
      active: color.active !== undefined ? color.active : true,
      order: color.order || Date.now(),
      createdAt: color.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await setDoc(doc(db, 'colors', id), newColor);
    return NextResponse.json({ success: true, color: newColor });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Color ID is required' }, { status: 400 });
    }

    await deleteDoc(doc(db, 'colors', id));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
