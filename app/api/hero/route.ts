import { NextRequest, NextResponse } from 'next/server';
import { collection, getDocs, getDoc, setDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

const slidesCollection = 'hero-slides';
const slideImagesCollection = 'hero-slide-images';

const defaultSlides = [
  {
    id: 'slide-1',
    title: 'WEAR YOUR\nCONFIDENCE',
    subtitle: 'Trendy pieces. Timeless style. Colossal Rigout has everything you need to look and feel your best.',
    image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1600&q=80',
    imageUrl: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1600&q=80',
    btn1Text: 'SHOP NEW IN',
    btn1Link: '/shop?cat=new-arrival',
    btn2Text: 'EXPLORE COLLECTIONS',
    btn2Link: '/shop',
    order: 0
  },
  {
    id: 'slide-2',
    title: 'THE SUMMER\nESCAPE',
    subtitle: 'Discover our lightweight fabrics, airy designs, and sun-soaked aesthetics curated for warm days.',
    image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1600&q=80',
    imageUrl: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1600&q=80',
    btn1Text: 'SHOP SUMMER',
    btn1Link: '/shop?cat=tops',
    btn2Text: 'VIEW ALL PRODUCTS',
    btn2Link: '/shop',
    order: 1
  },
  {
    id: 'slide-3',
    title: 'ELEVATE\nEVERYDAY',
    subtitle: 'Premium basics and tailored essentials built to take you from day to night effortlessly.',
    image: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=1600&q=80',
    imageUrl: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=1600&q=80',
    btn1Text: 'SHOP BASICS',
    btn1Link: '/shop?cat=bottoms',
    btn2Text: 'VIEW COLLECTION',
    btn2Link: '/shop',
    order: 2
  }
];

// Helper to seed defaults if Firestore collection is empty
async function seedDefaultSlidesIfEmpty() {
  const colRef = collection(db, slidesCollection);
  const snapshot = await getDocs(colRef);
  if (snapshot.empty) {
    console.log("[API GET /api/hero] Hero slides collection empty, seeding defaults...");
    for (const slide of defaultSlides) {
      await setDoc(doc(db, slidesCollection, slide.id), slide);
    }
  }
}

// GET: Fetch all hero slides sorted by order index
export async function GET() {
  try {
    const colRef = collection(db, slidesCollection);
    let snapshot = await getDocs(colRef);

    if (snapshot.empty) {
      await seedDefaultSlidesIfEmpty();
      snapshot = await getDocs(colRef);
    }

    const imageSnapshot = await getDocs(collection(db, slideImagesCollection));
    const images = new Map<string, string>();
    imageSnapshot.forEach(imageDoc => {
      const dataUrl = imageDoc.data().dataUrl;
      if (typeof dataUrl === 'string' && dataUrl.startsWith('data:image/')) images.set(imageDoc.id, dataUrl);
    });

    const loaded: any[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      loaded.push({
        ...data,
        id: docSnap.id,
        imagePath: data.imagePath || '',
        // Public storefront only receives managed Firestore image data.
        // Legacy/external image URLs are intentionally not exposed.
        image: images.get(docSnap.id) || ''
      });
    });

    loaded.sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));

    return NextResponse.json({ slides: loaded.filter(slide => slide.image), source: 'firestore' });
  } catch (error: any) {
    console.error("[API GET /api/hero] Error fetching slides, using fallback:", error);
    return NextResponse.json({ slides: defaultSlides, source: 'fallback', error: error.message });
  }
}

// POST: Add, update, or reset hero slides (supports multipart/form-data upload)
export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    // RESET FLOW
    if (searchParams.get('reset') === 'true') {
      const colRef = collection(db, slidesCollection);
      const snapshot = await getDocs(colRef);
      for (const docSnap of snapshot.docs) {
        await deleteDoc(doc(db, slideImagesCollection, docSnap.id));
        await deleteDoc(docSnap.ref);
      }

      for (const slide of defaultSlides) {
        await setDoc(doc(db, slidesCollection, slide.id), slide);
      }

      console.log("[API POST /api/hero] Successfully reset default hero slides.");
      return NextResponse.json({ success: true, slides: defaultSlides });
    }

    // MULTIPART FORM-DATA PROCESSING
    const formData = await req.formData();
    const id = (formData.get('id') as string)?.trim();
    const title = (formData.get('title') as string)?.trim();
    const subtitle = (formData.get('subtitle') as string)?.trim();
    const btn1Text = (formData.get('btn1Text') as string)?.trim() || 'SHOP NOW';
    const btn1Link = (formData.get('btn1Link') as string)?.trim() || '/shop';
    const btn2Text = (formData.get('btn2Text') as string)?.trim() || '';
    const btn2Link = (formData.get('btn2Link') as string)?.trim() || '';
    const order = Number(formData.get('order')) || 0;
    const imageDataValue = formData.get('imageData');
    const imageData = typeof imageDataValue === 'string' ? imageDataValue : '';

    if (!title || !subtitle) {
      return NextResponse.json({ error: "Slide title and subtitle are required." }, { status: 400 });
    }

    const slideId = id ? id.toLowerCase() : `slide-${Date.now()}`;
    const docRef = doc(db, slidesCollection, slideId);
    let existingData: any = null;

    if (id) {
      const existingSnap = await getDoc(docRef);
      if (existingSnap.exists()) {
        existingData = existingSnap.data();
      }
    }

    if (!id && !imageData) {
      return NextResponse.json({ error: "Hero image file is required for new slides." }, { status: 400 });
    }

    if (imageData && (!imageData.startsWith('data:image/webp;base64,') || imageData.length > 750_000)) {
      return NextResponse.json({ error: 'Invalid or oversized optimized hero image.' }, { status: 400 });
    }

    const existingImageSnap = await getDoc(doc(db, slideImagesCollection, slideId));
    const storedImageData = existingImageSnap.exists() ? String(existingImageSnap.data().dataUrl || '') : '';
    const finalImageData = imageData || storedImageData;
    const imagePath = finalImageData ? `${slideImagesCollection}/${slideId}` : '';
    const legacyImage = finalImageData ? '' : (existingData?.imageUrl || existingData?.image || '');

    const updatedSlide = {
      id: slideId,
      title,
      subtitle,
      imagePath,
      btn1Text,
      btn1Link,
      btn2Text,
      btn2Link,
      order
    };

    const writes: Promise<void>[] = [setDoc(docRef, updatedSlide)];
    if (finalImageData) {
      writes.push(setDoc(doc(db, slideImagesCollection, slideId), {
        slideId,
        dataUrl: finalImageData,
        updatedAt: new Date().toISOString()
      }));
    }
    await Promise.all(writes);
    console.log(`[API POST /api/hero] Saved slide ${slideId} successfully.`);

    return NextResponse.json({ success: true, slide: { ...updatedSlide, image: finalImageData || legacyImage } });
  } catch (error: any) {
    console.error("[API POST /api/hero] Error saving slide:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Remove a hero slide and clean up Firebase Storage assets
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: "Slide ID parameter is required" }, { status: 400 });
    }

    const slideId = id.toLowerCase();
    const docRef = doc(db, slidesCollection, slideId);
    await Promise.all([
      deleteDoc(docRef),
      deleteDoc(doc(db, slideImagesCollection, slideId))
    ]);
    console.log(`[API DELETE /api/hero] Deleted slide ${slideId}`);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[API DELETE /api/hero] Error deleting slide:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
