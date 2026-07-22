import { NextRequest, NextResponse } from 'next/server';
import { collection, deleteDoc, doc, getDocs, setDoc } from 'firebase/firestore';
import { db } from '../../../../lib/firebase';
import { requireAdmin } from '../../../../lib/serverAuth';
import { ReturnStep, validateInternalPath } from '../../../../lib/returns-policy';

const COLLECTION = 'return-steps';

// ─── POST (Create Step) ───────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (admin instanceof NextResponse) return admin;

    const { step } = await request.json();
    const title = String(step?.title || '').trim();
    const description = String(step?.description || '').trim();
    const linkLabel = String(step?.linkLabel || '').trim();
    const rawLinkPath = String(step?.linkPath || '').trim();

    if (!title || title.length < 2 || title.length > 100) {
      return NextResponse.json({ success: false, message: 'Step title must be 2–100 characters.' }, { status: 400 });
    }
    if (!description || description.length < 2 || description.length > 2000) {
      return NextResponse.json({ success: false, message: 'Step description must be 2–2,000 characters.' }, { status: 400 });
    }

    let linkPath = '';
    if (rawLinkPath) {
      linkPath = validateInternalPath(rawLinkPath);
      if (!linkPath) {
        return NextResponse.json({ success: false, message: 'Link path must be a safe internal route starting with "/".' }, { status: 400 });
      }
    }

    const snapshot = await getDocs(collection(db, COLLECTION));
    const maxOrder = snapshot.docs.reduce((max, d) => Math.max(max, Number(d.data().order || 0)), 0);

    const now = new Date().toISOString();
    const id = step?.id || `step-${Date.now()}`;

    const saved: ReturnStep = {
      id,
      title,
      description,
      linkLabel: linkLabel.slice(0, 60),
      linkPath,
      order: typeof step?.order === 'number' ? Math.max(0, step.order) : maxOrder + 1,
      active: step?.active !== false,
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(doc(db, COLLECTION, id), saved);
    return NextResponse.json({ success: true, data: saved, message: 'Return step created.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// ─── PUT (Update Step) ────────────────────────────────────────────────────
export async function PUT(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (admin instanceof NextResponse) return admin;

    const { step } = await request.json();
    const id = String(step?.id || '').trim();
    if (!id) {
      return NextResponse.json({ success: false, message: 'Step ID is required.' }, { status: 400 });
    }

    const title = String(step?.title || '').trim();
    const description = String(step?.description || '').trim();
    const linkLabel = String(step?.linkLabel || '').trim();
    const rawLinkPath = String(step?.linkPath || '').trim();

    if (!title || title.length < 2 || title.length > 100) {
      return NextResponse.json({ success: false, message: 'Step title must be 2–100 characters.' }, { status: 400 });
    }
    if (!description || description.length < 2 || description.length > 2000) {
      return NextResponse.json({ success: false, message: 'Step description must be 2–2,000 characters.' }, { status: 400 });
    }

    let linkPath = '';
    if (rawLinkPath) {
      linkPath = validateInternalPath(rawLinkPath);
      if (!linkPath) {
        return NextResponse.json({ success: false, message: 'Link path must be a safe internal route starting with "/".' }, { status: 400 });
      }
    }

    const now = new Date().toISOString();
    const saved: ReturnStep = {
      id,
      title,
      description,
      linkLabel: linkLabel.slice(0, 60),
      linkPath,
      order: Math.max(0, Number(step?.order || 0)),
      active: step?.active !== undefined ? Boolean(step.active) : true,
      updatedAt: now,
    };

    await setDoc(doc(db, COLLECTION, id), saved, { merge: true });
    return NextResponse.json({ success: true, data: saved, message: 'Return step updated.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// ─── DELETE (Remove Step) ─────────────────────────────────────────────────
export async function DELETE(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (admin instanceof NextResponse) return admin;

    const id = new URL(request.url).searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, message: 'Step ID is required.' }, { status: 400 });
    }

    await deleteDoc(doc(db, COLLECTION, id));
    return NextResponse.json({ success: true, message: 'Return step deleted.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
