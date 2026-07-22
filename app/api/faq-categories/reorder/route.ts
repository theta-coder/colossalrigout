import { NextRequest, NextResponse } from 'next/server';
import { collection, doc, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '../../../../lib/firebase';
import { requireAdmin } from '../../../../lib/serverAuth';

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (admin instanceof NextResponse) return admin;
    const { orderedIds } = await request.json();
    if (!Array.isArray(orderedIds) || orderedIds.length === 0 || orderedIds.some(id => typeof id !== 'string' || !id.trim())) {
      return NextResponse.json({ success: false, message: 'A valid ordered category ID list is required.' }, { status: 400 });
    }
    if (new Set(orderedIds).size !== orderedIds.length) {
      return NextResponse.json({ success: false, message: 'Category IDs must be unique.' }, { status: 400 });
    }
    const snapshot = await getDocs(collection(db, 'faq-categories'));
    const existingIds = new Set(snapshot.docs.map(item => item.id));
    if (orderedIds.length !== existingIds.size || orderedIds.some(id => !existingIds.has(id))) {
      return NextResponse.json({ success: false, message: 'Category list changed. Refresh and try again.' }, { status: 409 });
    }
    const now = new Date().toISOString();
    const batch = writeBatch(db);
    orderedIds.forEach((id, index) => batch.update(doc(db, 'faq-categories', id), { order: index + 1, updatedAt: now }));
    await batch.commit();
    return NextResponse.json({ success: true, message: 'Category order updated.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Unable to reorder categories.' }, { status: 500 });
  }
}
