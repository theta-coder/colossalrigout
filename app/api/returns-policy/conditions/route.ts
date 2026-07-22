import { NextRequest, NextResponse } from 'next/server';
import { collection, deleteDoc, doc, getDocs, setDoc } from 'firebase/firestore';
import { db } from '../../../../lib/firebase';
import { requireAdmin } from '../../../../lib/serverAuth';
import { ReturnCondition } from '../../../../lib/returns-policy';

const COLLECTION = 'return-conditions';

// ─── POST (Create Condition) ────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (admin instanceof NextResponse) return admin;

    const { condition } = await request.json();
    const text = String(condition?.text || '').trim();
    if (!text || text.length < 2 || text.length > 500) {
      return NextResponse.json({ success: false, message: 'Condition text must be 2–500 characters.' }, { status: 400 });
    }

    const snapshot = await getDocs(collection(db, COLLECTION));
    const maxOrder = snapshot.docs.reduce((max, d) => Math.max(max, Number(d.data().order || 0)), 0);

    const now = new Date().toISOString();
    const id = condition?.id || `cond-${Date.now()}`;

    const saved: ReturnCondition = {
      id,
      text,
      order: typeof condition?.order === 'number' ? Math.max(0, condition.order) : maxOrder + 1,
      active: condition?.active !== false,
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(doc(db, COLLECTION, id), saved);
    return NextResponse.json({ success: true, data: saved, message: 'Return condition created.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// ─── PUT (Update Condition) ─────────────────────────────────────────────────
export async function PUT(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (admin instanceof NextResponse) return admin;

    const { condition } = await request.json();
    const id = String(condition?.id || '').trim();
    if (!id) {
      return NextResponse.json({ success: false, message: 'Condition ID is required.' }, { status: 400 });
    }

    const text = String(condition?.text || '').trim();
    if (!text || text.length < 2 || text.length > 500) {
      return NextResponse.json({ success: false, message: 'Condition text must be 2–500 characters.' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const saved: ReturnCondition = {
      id,
      text,
      order: Math.max(0, Number(condition?.order || 0)),
      active: condition?.active !== undefined ? Boolean(condition.active) : true,
      updatedAt: now,
    };

    await setDoc(doc(db, COLLECTION, id), saved, { merge: true });
    return NextResponse.json({ success: true, data: saved, message: 'Return condition updated.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// ─── DELETE (Remove Condition) ──────────────────────────────────────────────
export async function DELETE(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (admin instanceof NextResponse) return admin;

    const id = new URL(request.url).searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, message: 'Condition ID is required.' }, { status: 400 });
    }

    await deleteDoc(doc(db, COLLECTION, id));
    return NextResponse.json({ success: true, message: 'Return condition deleted.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
