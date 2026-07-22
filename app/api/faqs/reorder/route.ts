import { NextRequest, NextResponse } from 'next/server';
import { collection, doc, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '../../../../lib/firebase';
import { requireAdmin } from '../../../../lib/serverAuth';

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (admin instanceof NextResponse) return admin;
    const { categoryId, orderedIds } = await request.json();
    if (!categoryId || !Array.isArray(orderedIds) || orderedIds.length === 0 || orderedIds.some(id => typeof id !== 'string' || !id.trim())) {
      return NextResponse.json({ success: false, message: 'Category and a valid ordered FAQ ID list are required.' }, { status: 400 });
    }
    if (new Set(orderedIds).size !== orderedIds.length) {
      return NextResponse.json({ success: false, message: 'FAQ IDs must be unique.' }, { status: 400 });
    }
    const snapshot = await getDocs(collection(db, 'faqs'));
    const categoryIds = snapshot.docs.filter(item => item.data().categoryId === categoryId).map(item => item.id);
    const existingIds = new Set(categoryIds);
    if (orderedIds.length !== categoryIds.length || orderedIds.some(id => !existingIds.has(id))) {
      return NextResponse.json({ success: false, message: 'FAQ list changed. Refresh and try again.' }, { status: 409 });
    }
    const now = new Date().toISOString();
    const batch = writeBatch(db);
    orderedIds.forEach((id, index) => batch.update(doc(db, 'faqs', id), { order: index + 1, updatedAt: now }));
    await batch.commit();
    return NextResponse.json({ success: true, message: 'FAQ order updated.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Unable to reorder FAQs.' }, { status: 500 });
  }
}
