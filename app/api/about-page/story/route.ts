import { NextRequest, NextResponse } from 'next/server';
import { collection, deleteDoc, doc, getDocs, setDoc } from 'firebase/firestore';
import { db } from '../../../../lib/firebase';
import { requireAdmin } from '../../../../lib/serverAuth';
import { AboutStoryBlock } from '../../../../lib/about-page';

const COLLECTION = 'about-story-blocks';

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (admin instanceof NextResponse) return admin;

    const body = await request.json();
    const block = body.block || body;
    const text = String(block?.text || '').trim();

    if (!text || text.length < 10 || text.length > 3000) {
      return NextResponse.json({ success: false, message: 'Story text must be 10–3,000 characters.' }, { status: 400 });
    }

    const snapshot = await getDocs(collection(db, COLLECTION));
    const maxOrder = snapshot.docs.reduce((max, d) => Math.max(max, Number(d.data().order || 0)), 0);

    const now = new Date().toISOString();
    const id = block?.id || `story-${Date.now()}`;

    const saved: AboutStoryBlock = {
      id,
      text,
      order: typeof block?.order === 'number' ? Math.max(0, block.order) : maxOrder + 1,
      active: block?.active !== false,
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(doc(db, COLLECTION, id), saved);
    return NextResponse.json({ success: true, data: saved, message: 'Story block created.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (admin instanceof NextResponse) return admin;

    const body = await request.json();
    const block = body.block || body;
    const id = String(block?.id || '').trim();
    if (!id) {
      return NextResponse.json({ success: false, message: 'Story block ID is required.' }, { status: 400 });
    }

    const text = String(block?.text || '').trim();
    if (!text || text.length < 10 || text.length > 3000) {
      return NextResponse.json({ success: false, message: 'Story text must be 10–3,000 characters.' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const saved: AboutStoryBlock = {
      id,
      text,
      order: Math.max(0, Number(block?.order || 0)),
      active: block?.active !== undefined ? Boolean(block.active) : true,
      updatedAt: now,
    };

    await setDoc(doc(db, COLLECTION, id), saved, { merge: true });
    return NextResponse.json({ success: true, data: saved, message: 'Story block updated.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (admin instanceof NextResponse) return admin;

    const id = new URL(request.url).searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, message: 'Story block ID is required.' }, { status: 400 });
    }

    await deleteDoc(doc(db, COLLECTION, id));
    return NextResponse.json({ success: true, message: 'Story block deleted.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
