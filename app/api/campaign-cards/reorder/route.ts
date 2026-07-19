import { NextRequest, NextResponse } from 'next/server';
import { doc, writeBatch } from 'firebase/firestore';
import { db } from '../../../../lib/firebase';
import { requireAdmin } from '../../../../lib/serverAuth';

export async function PUT(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (admin instanceof NextResponse) return admin;
  try {
    const { ids } = await request.json();
    if (!Array.isArray(ids) || ids.some(id => typeof id !== 'string'))
      return NextResponse.json({ success: false, message: 'An ordered card ID list is required.' }, { status: 400 });
    const batch = writeBatch(db);
    const updatedAt = new Date().toISOString();
    ids.forEach((id, order) => batch.update(doc(db, 'campaign-cards', id), { order, updatedAt }));
    await batch.commit();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
