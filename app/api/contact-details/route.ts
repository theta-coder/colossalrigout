import { NextRequest, NextResponse } from 'next/server';
import { collection, deleteDoc, doc, getDocs, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { requireAdmin } from '@/lib/serverAuth';
import { ContactDetail, validateContactHref } from '@/lib/contact-page';

const COLLECTION = 'contact-details';

// ─── POST (Create Detail) ──────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (admin instanceof NextResponse) return admin;

    const { detail } = await request.json();
    const type = String(detail?.type || 'address').trim() as ContactDetail['type'];
    const label = String(detail?.label || '').trim();
    const value = String(detail?.value || '').trim();
    const customHref = String(detail?.href || '').trim();
    const icon = String(detail?.icon || 'map-pin').trim() as ContactDetail['icon'];

    if (!label || label.length < 2 || label.length > 60) {
      return NextResponse.json({ success: false, message: 'Detail label must be 2–60 characters.' }, { status: 400 });
    }
    if (!value || value.length < 2 || value.length > 500) {
      return NextResponse.json({ success: false, message: 'Detail value must be 2–500 characters.' }, { status: 400 });
    }

    const href = validateContactHref(type, value, customHref);

    const snapshot = await getDocs(collection(db, COLLECTION));
    const maxOrder = snapshot.docs.reduce((max, d) => Math.max(max, Number(d.data().order || 0)), 0);

    const now = new Date().toISOString();
    const id = detail?.id || `detail-${Date.now()}`;

    const saved: ContactDetail = {
      id,
      type,
      label,
      value,
      href,
      icon,
      order: typeof detail?.order === 'number' ? Math.max(0, detail.order) : maxOrder + 1,
      active: detail?.active !== false,
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(doc(db, COLLECTION, id), saved);
    return NextResponse.json({ success: true, data: saved, message: 'Contact detail created.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// ─── PUT (Update Detail) ───────────────────────────────────────────────────
export async function PUT(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (admin instanceof NextResponse) return admin;

    const { detail } = await request.json();
    const id = String(detail?.id || '').trim();
    if (!id) {
      return NextResponse.json({ success: false, message: 'Detail ID is required.' }, { status: 400 });
    }

    const type = String(detail?.type || 'address').trim() as ContactDetail['type'];
    const label = String(detail?.label || '').trim();
    const value = String(detail?.value || '').trim();
    const customHref = String(detail?.href || '').trim();
    const icon = String(detail?.icon || 'map-pin').trim() as ContactDetail['icon'];

    if (!label || label.length < 2 || label.length > 60) {
      return NextResponse.json({ success: false, message: 'Detail label must be 2–60 characters.' }, { status: 400 });
    }
    if (!value || value.length < 2 || value.length > 500) {
      return NextResponse.json({ success: false, message: 'Detail value must be 2–500 characters.' }, { status: 400 });
    }

    const href = validateContactHref(type, value, customHref);
    const now = new Date().toISOString();

    const saved: ContactDetail = {
      id,
      type,
      label,
      value,
      href,
      icon,
      order: Math.max(0, Number(detail?.order || 0)),
      active: detail?.active !== undefined ? Boolean(detail.active) : true,
      updatedAt: now,
    };

    await setDoc(doc(db, COLLECTION, id), saved, { merge: true });
    return NextResponse.json({ success: true, data: saved, message: 'Contact detail updated.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// ─── DELETE (Remove Detail) ────────────────────────────────────────────────
export async function DELETE(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (admin instanceof NextResponse) return admin;

    const id = new URL(request.url).searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, message: 'Detail ID is required.' }, { status: 400 });
    }

    await deleteDoc(doc(db, COLLECTION, id));
    return NextResponse.json({ success: true, message: 'Contact detail deleted.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
