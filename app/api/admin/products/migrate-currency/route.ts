import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/serverAuth';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (admin instanceof NextResponse) return admin;

    const snapshot = await getDocs(collection(db, 'products'));
    let updatedCount = 0;
    let alreadyPkrCount = 0;

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      const productId = docSnap.id;

      if (data.currency !== 'PKR') {
        await updateDoc(doc(db, 'products', productId), {
          currency: 'PKR',
          updatedAt: new Date().toISOString(),
        });
        updatedCount++;
      } else {
        alreadyPkrCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Currency migration complete. Updated ${updatedCount} product(s) to PKR currency. ${alreadyPkrCount} product(s) were already set to PKR.`,
      stats: {
        totalProducts: snapshot.size,
        updatedCount,
        alreadyPkrCount,
      },
    });
  } catch (error: any) {
    console.error('[API POST /api/admin/products/migrate-currency] Error:', error.message);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
