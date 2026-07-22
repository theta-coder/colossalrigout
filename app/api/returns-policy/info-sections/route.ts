import { NextRequest, NextResponse } from 'next/server';
import { collection, deleteDoc, doc, getDocs, setDoc } from 'firebase/firestore';
import { db } from '../../../../lib/firebase';
import { requireAdmin } from '../../../../lib/serverAuth';
import { ReturnInfoSection } from '../../../../lib/returns-policy';

const COLLECTION = 'return-info-sections';

// ─── POST (Create Info Section) ──────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (admin instanceof NextResponse) return admin;

    const { infoSection } = await request.json();
    const title = String(infoSection?.title || '').trim();
    const description = String(infoSection?.description || '').trim();

    if (!title || title.length < 2 || title.length > 100) {
      return NextResponse.json({ success: false, message: 'Section title must be 2–100 characters.' }, { status: 400 });
    }
    if (!description || description.length < 2 || description.length > 3000) {
      return NextResponse.json({ success: false, message: 'Section description must be 2–3,000 characters.' }, { status: 400 });
    }

    const snapshot = await getDocs(collection(db, COLLECTION));
    const maxOrder = snapshot.docs.reduce((max, d) => Math.max(max, Number(d.data().order || 0)), 0);

    const now = new Date().toISOString();
    const id = infoSection?.id || `info-${Date.now()}`;

    const saved: ReturnInfoSection = {
      id,
      title,
      description,
      order: typeof infoSection?.order === 'number' ? Math.max(0, infoSection.order) : maxOrder + 1,
      active: infoSection?.active !== false,
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(doc(db, COLLECTION, id), saved);
    return NextResponse.json({ success: true, data: saved, message: 'Information section created.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// ─── PUT (Update Info Section) ───────────────────────────────────────────────
export async function PUT(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (admin instanceof NextResponse) return admin;

    const { infoSection } = await request.json();
    const id = String(infoSection?.id || '').trim();
    if (!id) {
      return NextResponse.json({ success: false, message: 'Section ID is required.' }, { status: 400 });
    }

    const title = String(infoSection?.title || '').trim();
    const description = String(infoSection?.description || '').trim();

    if (!title || title.length < 2 || title.length > 100) {
      return NextResponse.json({ success: false, message: 'Section title must be 2–100 characters.' }, { status: 400 });
    }
    if (!description || description.length < 2 || description.length > 3000) {
      return NextResponse.json({ success: false, message: 'Section description must be 2–3,000 characters.' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const saved: ReturnInfoSection = {
      id,
      title,
      description,
      order: Math.max(0, Number(infoSection?.order || 0)),
      active: infoSection?.active !== undefined ? Boolean(infoSection.active) : true,
      updatedAt: now,
    };

    await setDoc(doc(db, COLLECTION, id), saved, { merge: true });
    return NextResponse.json({ success: true, data: saved, message: 'Information section updated.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// ─── DELETE (Remove Info Section) ────────────────────────────────────────────
export async function DELETE(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (admin instanceof NextResponse) return admin;

    const id = new URL(request.url).searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, message: 'Section ID is required.' }, { status: 400 });
    }

    await deleteDoc(doc(db, COLLECTION, id));
    return NextResponse.json({ success: true, message: 'Information section deleted.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
