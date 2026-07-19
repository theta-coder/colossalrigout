import { NextRequest, NextResponse } from 'next/server';
import { collection, getDocs, setDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { CollectionDocument } from '../../../types/commerce';

const DEFAULT_COLLECTIONS: CollectionDocument[] = [
  {
    id: 'collec-everyday',
    name: 'The Everyday Edit',
    slug: 'everyday-edit',
    title: 'THE EVERYDAY EDIT',
    subtitle: 'Essential basics built for daily comfort & clean aesthetic',
    description: 'Versatile shirts, essential tees, and classic bottoms designed for seamless daily wear.',
    imageId: null,
    imageUrl: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?auto=format&fit=crop&w=800&q=80',
    active: true,
    featuredOnHome: true,
    order: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'collec-weekend',
    name: 'Weekend Vibes',
    slug: 'weekend-vibes',
    title: 'WEEKEND VIBES',
    subtitle: 'Relaxed fits and casual streetwear for off-duty days',
    description: 'Unwind in style with relaxed hoodies, cargo bottoms, and casual sneakers.',
    imageId: null,
    imageUrl: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80',
    active: true,
    featuredOnHome: true,
    order: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'collec-power',
    name: 'Power Look',
    slug: 'power-look',
    title: 'POWER LOOK',
    subtitle: 'Sharp tailored pieces & refined formal wear',
    description: 'Tailored dress shirts, crisp blazers, and sophisticated apparel for high-impact occasions.',
    imageId: null,
    imageUrl: 'https://images.unsplash.com/photo-1490114538077-0a7f8cb49891?auto=format&fit=crop&w=800&q=80',
    active: true,
    featuredOnHome: true,
    order: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export async function GET() {
  try {
    const colRef = collection(db, 'collections');
    const snapshot = await getDocs(colRef);

    if (snapshot.empty) {
      try {
        for (const col of DEFAULT_COLLECTIONS) {
          await setDoc(doc(db, 'collections', col.id), col);
        }
        return NextResponse.json({ collections: DEFAULT_COLLECTIONS, source: 'seeded' });
      } catch (e) {
        return NextResponse.json({ collections: DEFAULT_COLLECTIONS, source: 'fallback' });
      }
    }

    const collections: CollectionDocument[] = [];
    snapshot.forEach((docSnap) => {
      collections.push(docSnap.data() as CollectionDocument);
    });

    collections.sort((a, b) => (a.order || 0) - (b.order || 0));
    return NextResponse.json({ collections, source: 'firestore' });
  } catch (error: any) {
    return NextResponse.json({ collections: DEFAULT_COLLECTIONS, source: 'fallback', error: error.message });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { collection: colData } = body;
    if (!colData || !colData.name) {
      return NextResponse.json({ error: 'Collection name is required' }, { status: 400 });
    }

    const slug = colData.slug || colData.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
    const id = colData.id || `collec_${slug}_${Date.now().toString(36)}`;

    const newCollection: CollectionDocument = {
      id,
      name: colData.name.trim(),
      slug,
      title: colData.title ? colData.title.trim() : colData.name.toUpperCase(),
      subtitle: colData.subtitle ? colData.subtitle.trim() : '',
      description: colData.description ? colData.description.trim() : '',
      imageId: colData.imageId || null,
      imageUrl: colData.imageUrl || null,
      active: colData.active !== undefined ? colData.active : true,
      featuredOnHome: colData.featuredOnHome !== undefined ? colData.featuredOnHome : true,
      order: colData.order || Date.now(),
      createdAt: colData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await setDoc(doc(db, 'collections', id), newCollection);
    return NextResponse.json({ success: true, collection: newCollection });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Collection ID is required' }, { status: 400 });
    }

    await deleteDoc(doc(db, 'collections', id));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
