import { NextRequest, NextResponse } from 'next/server';
import { doc, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { requireAdmin } from '@/lib/serverAuth';
import { InquiryStatus } from '@/lib/contact-page';

const COLLECTION = 'contact-inquiries';

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (admin instanceof NextResponse) return admin;

    const { ids, status } = await request.json();
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ success: false, message: 'An array of inquiry IDs is required.' }, { status: 400 });
    }

    const validStatuses: InquiryStatus[] = ['new', 'in_progress', 'resolved', 'archived', 'spam'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ success: false, message: 'Invalid target status provided.' }, { status: 400 });
    }

    const batch = writeBatch(db);
    const now = new Date().toISOString();

    ids.forEach((id: string) => {
      const ref = doc(db, COLLECTION, String(id));
      batch.update(ref, {
        status,
        updatedAt: now,
        ...(status === 'resolved' ? { resolvedAt: now } : {}),
      });
    });

    await batch.commit();
    return NextResponse.json({
      success: true,
      message: `Updated ${ids.length} inquiries to status "${status}".`,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
