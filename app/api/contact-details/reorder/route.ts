import { NextRequest, NextResponse } from 'next/server';
import { doc, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { requireAdmin } from '@/lib/serverAuth';

const COLLECTION = 'contact-details';

export async function PATCH(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (admin instanceof NextResponse) return admin;

    const { ids } = await request.json();
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ success: false, message: 'An array of detail IDs is required.' }, { status: 400 });
    }

    const batch = writeBatch(db);
    const now = new Date().toISOString();

    ids.forEach((id: string, idx: number) => {
      const ref = doc(db, COLLECTION, String(id));
      batch.update(ref, { order: idx + 1, updatedAt: now });
    });

    await batch.commit();
    return NextResponse.json({ success: true, message: 'Contact details display order updated.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
