import { NextRequest, NextResponse } from 'next/server';
import { collection, getDocs, setDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

const defaultPromos = [
  { code: 'WELCOME10', type: 'percentage', value: 10, minOrder: 0, status: 'Active' },
  { code: 'COLOSSAL25', type: 'percentage', value: 25, minOrder: 100, status: 'Active' },
  { code: 'FLAT20', type: 'fixed', value: 20, minOrder: 80, status: 'Active' },
];

// GET: Fetch all promo codes
export async function GET() {
  try {
    const colRef = collection(db, 'promos');
    const snapshot = await getDocs(colRef);
    
    if (snapshot.empty) {
      console.log("[API GET /api/promos] Promos collection empty, seeding default promos...");
      try {
        for (const promo of defaultPromos) {
          await setDoc(doc(db, 'promos', promo.code), promo);
        }
        return NextResponse.json({ promos: defaultPromos, source: 'firestore-seeded' });
      } catch (seedErr: any) {
        console.warn("[API GET /api/promos] Seeding skipped (expected for guest users):", seedErr.message);
        return NextResponse.json({ promos: defaultPromos, source: 'default-fallback' });
      }
    }
    
    const loaded: any[] = [];
    snapshot.forEach((docSnap) => {
      loaded.push(docSnap.data());
    });
    
    return NextResponse.json({ promos: loaded, source: 'firestore' });
  } catch (error: any) {
    console.error("[API GET /api/promos] Error fetching promos, using fallback:", error);
    return NextResponse.json({ promos: defaultPromos, source: 'fallback', error: error.message });
  }
}

// POST: Add or update a promo code
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { promo } = body;
    if (!promo || !promo.code) {
      return NextResponse.json({ error: "Promo code details are required" }, { status: 400 });
    }
    
    const promoCode = promo.code.toUpperCase().replace(/\s+/g, '');
    const formattedPromo = {
      ...promo,
      code: promoCode,
      value: Number(promo.value),
      minOrder: Number(promo.minOrder || 0),
    };
    
    await setDoc(doc(db, 'promos', promoCode), formattedPromo);
    console.log(`[API POST /api/promos] Created promo code ${promoCode}`);
    return NextResponse.json({ success: true, promo: formattedPromo });
  } catch (error: any) {
    console.error("[API POST /api/promos] Error writing promo to Firestore:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Delete a promo code
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    if (!code) {
      return NextResponse.json({ error: "Promo code parameter is required" }, { status: 400 });
    }
    
    await deleteDoc(doc(db, 'promos', code.toUpperCase()));
    console.log(`[API DELETE /api/promos] Deleted promo code ${code}`);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[API DELETE /api/promos] Error deleting promo:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
