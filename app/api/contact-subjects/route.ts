import { NextRequest, NextResponse } from 'next/server';
import { collection, deleteDoc, doc, getDocs, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { requireAdmin } from '@/lib/serverAuth';
import { ContactSubject } from '@/lib/contact-page';

const COLLECTION = 'contact-subjects';

// ─── POST (Create Subject) ─────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (admin instanceof NextResponse) return admin;

    const { subject } = await request.json();
    const name = String(subject?.name || '').trim();
    const recipientEmail = String(subject?.recipientEmail || '').trim().toLowerCase();

    if (!name || name.length < 2 || name.length > 80) {
      return NextResponse.json({ success: false, message: 'Subject name must be 2–80 characters.' }, { status: 400 });
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const snapshot = await getDocs(collection(db, COLLECTION));
    const maxOrder = snapshot.docs.reduce((max, d) => Math.max(max, Number(d.data().order || 0)), 0);

    const now = new Date().toISOString();
    const id = subject?.id || `subj-${Date.now()}`;

    const saved: ContactSubject = {
      id,
      name,
      slug,
      ...(recipientEmail ? { recipientEmail } : {}),
      order: typeof subject?.order === 'number' ? Math.max(0, subject.order) : maxOrder + 1,
      active: subject?.active !== false,
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(doc(db, COLLECTION, id), saved);
    return NextResponse.json({ success: true, data: saved, message: 'Contact subject created.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// ─── PUT (Update Subject) ──────────────────────────────────────────────────
export async function PUT(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (admin instanceof NextResponse) return admin;

    const { subject } = await request.json();
    const id = String(subject?.id || '').trim();
    if (!id) {
      return NextResponse.json({ success: false, message: 'Subject ID is required.' }, { status: 400 });
    }

    const name = String(subject?.name || '').trim();
    const recipientEmail = String(subject?.recipientEmail || '').trim().toLowerCase();

    if (!name || name.length < 2 || name.length > 80) {
      return NextResponse.json({ success: false, message: 'Subject name must be 2–80 characters.' }, { status: 400 });
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const now = new Date().toISOString();

    const saved: ContactSubject = {
      id,
      name,
      slug,
      ...(recipientEmail ? { recipientEmail } : {}),
      order: Math.max(0, Number(subject?.order || 0)),
      active: subject?.active !== undefined ? Boolean(subject.active) : true,
      updatedAt: now,
    };

    await setDoc(doc(db, COLLECTION, id), saved, { merge: true });
    return NextResponse.json({ success: true, data: saved, message: 'Contact subject updated.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// ─── DELETE (Remove Subject) ───────────────────────────────────────────────
export async function DELETE(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (admin instanceof NextResponse) return admin;

    const id = new URL(request.url).searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, message: 'Subject ID is required.' }, { status: 400 });
    }

    await deleteDoc(doc(db, COLLECTION, id));
    return NextResponse.json({ success: true, message: 'Contact subject deleted.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
